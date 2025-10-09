use std::{
    collections::HashSet,
    fs::{self, metadata},
    path::Path,
    sync::{Arc, Mutex},
    thread,
};

use chrono::Utc;
use exif::{Reader as ExifReader, Tag};
use image::image_dimensions;
use log::info;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::database::media_repository::MediaRepository;
use crate::models::image::{MediaKind, MediaRecord};
use crate::utils::image_processor::{generate_thumbnail, generate_thumbnails_batch};

/// 图片处理进度事件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesDealProgressEvent {
    pub current: usize,
    pub total: usize,
    pub current_file: Option<String>,
    pub step: String,
}

/// 支持的图片扩展名集合
static SUPPORTED_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp"];

/// 检查文件是否为支持的图片格式
fn _is_supported_image(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str())
    } else {
        false
    }
}

#[tauri::command]
pub async fn read_images_in_dir(app: AppHandle, dir: String) -> Result<Vec<MediaRecord>, String> {
    let repository = MediaRepository::new(app.clone());
    let mut images = Vec::new();
    let supported_extensions: HashSet<&str> = SUPPORTED_EXTENSIONS.iter().cloned().collect();

    if let Ok(entries) = fs::read_dir(&dir) {
        // 发送扫描开始事件
        let _ = app.emit(
            "images-deal-progress",
            ImagesDealProgressEvent {
                current: 0,
                total: 0,
                current_file: None,
                step: "scanning".to_string(),
            },
        );

        let paths: Vec<_> = entries
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                path.is_file()
                    && path
                        .extension()
                        .and_then(|ext| ext.to_str())
                        .map(|ext| supported_extensions.contains(ext.to_lowercase().as_str()))
                        .unwrap_or(false)
            })
            .collect();

        let total_count = paths.len();

        if total_count > 0 {
            // 首先检查哪些文件已存在于数据库中
            let _ = app.emit(
                "images-deal-progress",
                ImagesDealProgressEvent {
                    current: 0,
                    total: total_count,
                    current_file: None,
                    step: "checking_database".to_string(),
                },
            );

            let mut existing_records = Vec::new();
            let mut new_paths = Vec::new();

            // 检查数据库中是否已存在这些文件
            for (index, path) in paths.iter().enumerate() {
                let path_str = path.to_string_lossy().to_string();
                match repository.find_by_path(&path_str).await {
                    Ok(Some(existing_record)) => {
                        // 文件已存在于数据库中，直接使用
                        existing_records.push(existing_record);
                    }
                    Ok(None) => {
                        // 文件不存在于数据库中，需要处理
                        new_paths.push(path.clone());
                    }
                    Err(e) => {
                        info!("检查数据库时出错: {}", e);
                        // 出错时也认为文件需要处理
                        new_paths.push(path.clone());
                    }
                }

                // 发送检查进度
                if (index + 1) % 10 == 0 || index + 1 == total_count {
                    let _ = app.emit(
                        "images-deal-progress",
                        ImagesDealProgressEvent {
                            current: index + 1,
                            total: total_count,
                            current_file: None,
                            step: "checking_database".to_string(),
                        },
                    );
                }
            }

            images.extend(existing_records);

            // 如果有新文件需要处理
            if !new_paths.is_empty() {
                let new_paths_count = new_paths.len();

                // 发送扫描完成事件
                let _ = app.emit(
                    "images-deal-progress",
                    ImagesDealProgressEvent {
                        current: 0,
                        total: new_paths_count,
                        current_file: None,
                        step: "generating_thumbnails".to_string(),
                    },
                );

                // 使用并行处理批量生成缩略图
                let path_refs: Vec<&Path> = new_paths.iter().map(|p| p.as_path()).collect();
                let thumbnails =
                    generate_thumbnails_batch_with_progress(&app, &path_refs, new_paths_count);

                // 发送元数据提取开始事件
                let _ = app.emit(
                    "images-deal-progress",
                    ImagesDealProgressEvent {
                        current: 0,
                        total: new_paths_count,
                        current_file: None,
                        step: "extracting_metadata".to_string(),
                    },
                );

                // 并行处理媒体记录生成
                let results = process_images_parallel_with_progress(
                    &app,
                    &new_paths,
                    thumbnails,
                    new_paths_count,
                );
                let new_records: Vec<MediaRecord> = results.into_iter().filter_map(|r| r).collect();

                // 保存新记录到数据库
                if !new_records.is_empty() {
                    let _ = app.emit(
                        "images-deal-progress",
                        ImagesDealProgressEvent {
                            current: 0,
                            total: new_records.len(),
                            current_file: None,
                            step: "saving_to_database".to_string(),
                        },
                    );

                    for (index, record) in new_records.iter().enumerate() {
                        if let Err(e) = repository.save(record).await {
                            info!("保存记录到数据库时出错: {}", e);
                        }

                        // 发送保存进度
                        if (index + 1) % 10 == 0 || index + 1 == new_records.len() {
                            let _ = app.emit(
                                "images-deal-progress",
                                ImagesDealProgressEvent {
                                    current: index + 1,
                                    total: new_records.len(),
                                    current_file: None,
                                    step: "saving_to_database".to_string(),
                                },
                            );
                        }
                    }

                    images.extend(new_records);
                }
            }

            // 发送完成事件
            let _ = app.emit(
                "images-deal-progress",
                ImagesDealProgressEvent {
                    current: total_count,
                    total: total_count,
                    current_file: None,
                    step: "completed".to_string(),
                },
            );
        }
    }

    // 按拍摄时间排序
    images.sort_by(|a, b| {
        b.taken_date
            .cmp(&a.taken_date)
            .then_with(|| b.created_at.cmp(&a.created_at))
    });

    Ok(images)
}

/// 带进度反馈的批量缩略图生成
fn generate_thumbnails_batch_with_progress(
    app: &AppHandle,
    paths: &[&Path],
    total: usize,
) -> Vec<Option<String>> {
    // 这里可以增加更细粒度的进度反馈
    // 目前使用现有的批量处理函数
    let thumbnails = generate_thumbnails_batch(app, paths);

    // 发送缩略图生成完成事件
    let _ = app.emit(
        "images-deal-progress",
        ImagesDealProgressEvent {
            current: total,
            total,
            current_file: None,
            step: "generating_thumbnails".to_string(),
        },
    );

    thumbnails
}

/// 带进度反馈的并行处理函数
fn process_images_parallel_with_progress(
    app: &AppHandle,
    paths: &[std::path::PathBuf],
    thumbnails: Vec<Option<String>>,
    total: usize,
) -> Vec<Option<MediaRecord>> {
    let chunk_size = (paths.len() / 4).max(1);
    let results = Arc::new(Mutex::new(Vec::with_capacity(paths.len())));
    let processed_count = Arc::new(Mutex::new(0usize));
    let mut handles = Vec::new();

    for (i, chunk) in paths.chunks(chunk_size).enumerate() {
        let results = results.clone();
        let processed_count = processed_count.clone();
        let app_handle = app.clone();
        let chunk = chunk.to_vec();
        let thumbnails_chunk = thumbnails
            [i * chunk_size..std::cmp::min((i + 1) * chunk_size, thumbnails.len())]
            .to_vec();

        let handle = thread::spawn(move || {
            let mut local_results = Vec::new();
            for (j, path) in chunk.iter().enumerate() {
                let thumbnail_path = thumbnails_chunk.get(j).and_then(|t| t.as_ref().cloned());
                let result = create_media_record_fast(path, thumbnail_path);
                local_results.push((i * chunk_size + j, result));

                // 更新进度
                {
                    let mut count = processed_count.lock().unwrap();
                    *count += 1;
                    let current = *count;
                    drop(count);

                    // 每处理 10 个文件或最后一个文件时发送进度更新
                    if current % 10 == 0 || current == total {
                        let _ = app_handle.emit(
                            "images-deal-progress",
                            ImagesDealProgressEvent {
                                current,
                                total,
                                current_file: path
                                    .file_name()
                                    .and_then(|name| name.to_str())
                                    .map(|s| s.to_string()),
                                step: "extracting_metadata".to_string(),
                            },
                        );
                    }
                }
            }

            let mut results_lock = results.lock().unwrap();
            for (index, result) in local_results {
                if results_lock.len() <= index {
                    results_lock.resize(index + 1, None);
                }
                results_lock[index] = result;
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let results = results.lock().unwrap();
    results.clone()
}

/// 优化的媒体记录创建函数
fn create_media_record_fast(
    path: &std::path::PathBuf,
    thumbnail_path: Option<String>,
) -> Option<MediaRecord> {
    if !path.exists() || !path.is_file() {
        return None;
    }

    let metadata = metadata(path).ok()?;
    let name = path.file_name()?.to_str()?.to_string();
    let size = Some(metadata.len());

    // 快速获取图片尺寸（避免完全解码）
    let (width, height) = image_dimensions(path)
        .ok()
        .map(|(w, h)| (Some(w as u32), Some(h as u32)))
        .unwrap_or((None, None));

    // 异步读取 EXIF 数据，失败时使用文件修改时间
    let taken_date = extract_exif_date_fast(path).or_else(|| {
        metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|dur| Utc::now() - chrono::Duration::seconds(dur.as_secs() as i64))
    });

    let mime_type = get_mime_type_from_extension(path);
    let now = Utc::now();

    Some(MediaRecord {
        id: Uuid::new_v4(),
        path: path.to_string_lossy().to_string(),
        name,
        kind: MediaKind::Image,
        size,
        width,
        height,
        duration: None,
        thumbnail_path,
        taken_date,
        mime_type,
        created_at: now,
        updated_at: now,
        tags: None,
        album_ids: None,
        face_count: None,
    })
}

/// 快速提取 EXIF 日期信息
fn extract_exif_date_fast(path: &Path) -> Option<chrono::DateTime<Utc>> {
    let file = fs::File::open(path).ok()?;
    let mut bufreader = std::io::BufReader::new(file);

    let exif_reader = ExifReader::new();
    let exif = exif_reader.read_from_container(&mut bufreader).ok()?;

    info!("尝试从 EXIF 中提取日期信息...");
    if let Some(field) = exif.get_field(Tag::DateTimeOriginal, exif::In::PRIMARY) {
        info!("EXIF 日期信息: {}", field.display_value());
        // 尝试解析日期，失败时返回 None 而不是 panic
        field
            .display_value()
            .to_string()
            .parse::<chrono::DateTime<Utc>>()
            .ok()
    } else {
        info!("无法从 EXIF 中提取日期信息");
        None
    }
}

/// 根据文件扩展名获取 MIME 类型
fn get_mime_type_from_extension(path: &Path) -> Option<String> {
    match path.extension()?.to_str()?.to_lowercase().as_str() {
        "png" => Some("image/png".to_string()),
        "jpg" | "jpeg" => Some("image/jpeg".to_string()),
        "gif" => Some("image/gif".to_string()),
        "bmp" => Some("image/bmp".to_string()),
        "tiff" | "tif" => Some("image/tiff".to_string()),
        "webp" => Some("image/webp".to_string()),
        _ => None,
    }
}

#[tauri::command]
pub fn get_media_record(app: AppHandle, path: String) -> Result<MediaRecord, String> {
    let path_buf = std::path::PathBuf::from(&path);
    let thumbnail_path = generate_thumbnail(&app, &path_buf);

    create_media_record_fast(&path_buf, thumbnail_path)
        .ok_or_else(|| format!("无法处理文件: {}", path))
}

#[tauri::command]
pub fn get_media_records(app: AppHandle, paths: Vec<String>) -> Result<Vec<MediaRecord>, String> {
    let path_bufs: Vec<std::path::PathBuf> =
        paths.into_iter().map(std::path::PathBuf::from).collect();
    let path_refs: Vec<&Path> = path_bufs.iter().map(|p| p.as_path()).collect();

    let total_count = path_bufs.len();

    if total_count > 0 {
        // 发送开始处理事件
        info!(
            "Sending progress event: generating_thumbnails 0/{}",
            total_count
        );
        let _ = app.emit(
            "images-deal-progress",
            ImagesDealProgressEvent {
                current: 0,
                total: total_count,
                current_file: None,
                step: "generating_thumbnails".to_string(),
            },
        );

        // 批量生成缩略图
        let thumbnails = generate_thumbnails_batch_with_progress(&app, &path_refs, total_count);

        // 发送元数据提取开始事件
        let _ = app.emit(
            "images-deal-progress",
            ImagesDealProgressEvent {
                current: 0,
                total: total_count,
                current_file: None,
                step: "extracting_metadata".to_string(),
            },
        );

        // 并行处理
        let results =
            process_images_parallel_with_progress(&app, &path_bufs, thumbnails, total_count);

        let valid_results: Vec<MediaRecord> = results.into_iter().filter_map(|r| r).collect();

        // 发送完成事件
        info!(
            "Sending progress event: completed {}/{}",
            total_count, total_count
        );

        // 稍微延迟一下，确保事件能够被接收
        std::thread::sleep(std::time::Duration::from_millis(100));

        let _ = app.emit(
            "images-deal-progress",
            ImagesDealProgressEvent {
                current: total_count,
                total: total_count,
                current_file: None,
                step: "completed".to_string(),
            },
        );

        // 再稍微延迟一下，确保事件发送完成
        std::thread::sleep(std::time::Duration::from_millis(50));

        Ok(valid_results)
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn get_media_records_with_db(
    app: AppHandle,
    paths: Vec<String>,
) -> Result<Vec<MediaRecord>, String> {
    let repository = MediaRepository::new(app.clone());
    let mut results = Vec::new();
    let mut new_paths = Vec::new();

    let total_count = paths.len();

    if total_count == 0 {
        return Ok(vec![]);
    }

    // 发送开始检查事件
    let _ = app.emit(
        "images-deal-progress",
        ImagesDealProgressEvent {
            current: 0,
            total: total_count,
            current_file: None,
            step: "checking_database".to_string(),
        },
    );

    // 检查哪些文件已存在于数据库中
    for (index, path) in paths.iter().enumerate() {
        match repository.find_by_path(path).await {
            Ok(Some(existing_record)) => {
                // 文件已存在于数据库中，直接使用
                results.push(existing_record);
            }
            Ok(None) => {
                // 文件不存在于数据库中，需要处理
                new_paths.push(path.clone());
            }
            Err(e) => {
                info!("检查数据库时出错: {}", e);
                // 出错时也认为文件需要处理
                new_paths.push(path.clone());
            }
        }

        // 发送检查进度
        if (index + 1) % 10 == 0 || index + 1 == total_count {
            let _ = app.emit(
                "images-deal-progress",
                ImagesDealProgressEvent {
                    current: index + 1,
                    total: total_count,
                    current_file: None,
                    step: "checking_database".to_string(),
                },
            );
        }
    }

    // 如果有新文件需要处理
    if !new_paths.is_empty() {
        // 处理新文件
        let new_records = get_media_records(app.clone(), new_paths)
            .map_err(|e| format!("处理新文件失败: {}", e))?;

        // 保存新记录到数据库
        let _ = app.emit(
            "images-deal-progress",
            ImagesDealProgressEvent {
                current: 0,
                total: new_records.len(),
                current_file: None,
                step: "saving_to_database".to_string(),
            },
        );

        for (index, record) in new_records.iter().enumerate() {
            if let Err(e) = repository.save(record).await {
                info!("保存记录到数据库时出错: {}", e);
            }

            // 发送保存进度
            if (index + 1) % 10 == 0 || index + 1 == new_records.len() {
                let _ = app.emit(
                    "images-deal-progress",
                    ImagesDealProgressEvent {
                        current: index + 1,
                        total: new_records.len(),
                        current_file: None,
                        step: "saving_to_database".to_string(),
                    },
                );
            }
        }

        results.extend(new_records);
    }

    // 按拍摄时间排序
    results.sort_by(|a, b| {
        b.taken_date
            .cmp(&a.taken_date)
            .then_with(|| b.created_at.cmp(&a.created_at))
    });

    // 发送完成事件
    let _ = app.emit(
        "images-deal-progress",
        ImagesDealProgressEvent {
            current: total_count,
            total: total_count,
            current_file: None,
            step: "completed".to_string(),
        },
    );

    Ok(results)
}
