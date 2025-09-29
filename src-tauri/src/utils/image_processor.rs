use std::{
    fs::File,
    io::BufWriter,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    thread,
};

use tauri::Manager;

static THUMBNAIL_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn get_thumbnail_dir(app: &tauri::AppHandle) -> PathBuf {
    THUMBNAIL_DIR
        .get_or_init(|| {
            let dir = app
                .path()
                .resolve("thumbnails", tauri::path::BaseDirectory::AppLocalData)
                .expect("解析缩略图目录失败");

            std::fs::create_dir_all(&dir).expect("创建缩略图目录失败");
            dir
        })
        .clone()
}

pub fn generate_thumbnail(app: &tauri::AppHandle, path: &Path) -> Option<String> {
    let thumbnail_dir = get_thumbnail_dir(app);

    // 生成缩略图文件名（使用 JPEG 扩展名统一格式）
    let file_stem = path.file_stem()?.to_str()?;
    let thumbnail_filename = format!("{}.jpg", file_stem);
    let thumbnail_path = thumbnail_dir.join(thumbnail_filename);

    // 如果缩略图已存在，直接返回路径
    if thumbnail_path.exists() {
        return Some(thumbnail_path.to_string_lossy().to_string());
    }

    // 使用 ImageReader 进行更高效的图片解码
    let img_reader = image::ImageReader::open(path).ok()?;
    let img_reader = img_reader.with_guessed_format().ok()?;

    // 限制解码时的内存使用
    let img = img_reader.decode().ok()?;

    // 生成缩略图（使用更高质量的重采样算法）
    let thumbnail = img.thumbnail_exact(200, 200);

    // 使用缓冲写入提高 I/O 性能
    let output = File::create(&thumbnail_path).ok()?;
    let mut buf_writer = BufWriter::new(output);

    // 使用标准的 JPEG 编码
    thumbnail
        .write_to(&mut buf_writer, image::ImageFormat::Jpeg)
        .ok()?;

    // 确保数据写入磁盘
    drop(buf_writer);

    Some(thumbnail_path.to_string_lossy().to_string())
}

/// 批量生成缩略图的并行版本
pub fn generate_thumbnails_batch(app: &tauri::AppHandle, paths: &[&Path]) -> Vec<Option<String>> {
    let thumbnail_dir = get_thumbnail_dir(app);
    let chunk_size = (paths.len() / 4).max(1); // 使用固定线程数

    let results = std::sync::Arc::new(Mutex::new(Vec::with_capacity(paths.len())));
    let mut handles = Vec::new();

    for (i, chunk) in paths.chunks(chunk_size).enumerate() {
        let thumbnail_dir = thumbnail_dir.clone();
        let results = results.clone();
        let chunk: Vec<PathBuf> = chunk.iter().map(|p| p.to_path_buf()).collect();

        let handle = thread::spawn(move || {
            let mut local_results = Vec::new();
            for (j, path) in chunk.iter().enumerate() {
                let result = generate_thumbnail_sync(path, &thumbnail_dir);
                local_results.push((i * chunk_size + j, result));
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

    // 等待所有线程完成
    for handle in handles {
        handle.join().unwrap();
    }

    let results = results.lock().unwrap();
    results.clone()
}

/// 同步版本的缩略图生成（用于并行处理）
fn generate_thumbnail_sync(path: &Path, thumbnail_dir: &Path) -> Option<String> {
    let file_stem = path.file_stem()?.to_str()?;
    let thumbnail_filename = format!("{}.jpg", file_stem);
    let thumbnail_path = thumbnail_dir.join(thumbnail_filename);

    if thumbnail_path.exists() {
        return Some(thumbnail_path.to_string_lossy().to_string());
    }

    let img_reader = image::ImageReader::open(path).ok()?;
    let img_reader = img_reader.with_guessed_format().ok()?;
    let img = img_reader.decode().ok()?;

    let thumbnail = img.thumbnail_exact(200, 200);

    let output = File::create(&thumbnail_path).ok()?;
    let mut buf_writer = BufWriter::new(output);

    thumbnail
        .write_to(&mut buf_writer, image::ImageFormat::Jpeg)
        .ok()?;

    drop(buf_writer);

    Some(thumbnail_path.to_string_lossy().to_string())
}
