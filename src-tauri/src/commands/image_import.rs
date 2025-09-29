use std::{
    fs::{self, metadata},
    path::Path,
};

use chrono::Utc;
use exif::Tag;
use image::image_dimensions;
use tauri::AppHandle;
use uuid::Uuid;

use crate::models::image::{MediaKind, MediaRecord};
use crate::utils::image_processor::generate_thumbnail;

#[tauri::command]
pub fn read_images_in_dir(app: AppHandle, dir: String) -> Vec<MediaRecord> {
    let mut images = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if ["png", "jpg", "jpeg", "gif"].contains(&ext.to_lowercase().as_str()) {
                    images.push(
                        get_media_record(app.clone(), path.to_str().unwrap().to_string()).unwrap(),
                    );
                }
            }
        }
    }
    images
}

#[tauri::command]
pub fn get_media_record(app: AppHandle, path: String) -> Result<MediaRecord, String> {
    let path = Path::new(&path);
    if !path.exists() || !path.is_file() {
        return Err(format!("无效的文件路径: {}", path.display()));
    }

    let metadata = metadata(path).map_err(|e| format!("获取文件元数据失败: {}", e))?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let size = Some(metadata.len());

    let (width, height) = match image_dimensions(path) {
        Ok((w, h)) => (Some(w), Some(h)),
        Err(_) => (None, None),
    };

    let taken_date = match fs::File::open(path) {
        Ok(file) => {
            let mut bufreader = std::io::BufReader::new(&file);
            let exifreader = exif::Reader::new();
            let taken_date = match exifreader.read_from_container(&mut bufreader) {
                Ok(exif) => {
                    if let Some(field) = exif.get_field(Tag::DateTimeOriginal, exif::In::PRIMARY) {
                        Some(
                            field
                                .display_value()
                                .to_string()
                                .parse::<chrono::DateTime<Utc>>()
                                .map_err(|e| format!("解析EXIF日期失败: {}", e))
                                .unwrap_or(Utc::now()),
                        )
                    } else {
                        None
                    }
                }
                Err(_) => None,
            };
            taken_date
        }
        Err(_) => None,
    };

    let mime_type = match path.extension().and_then(|ext| ext.to_str()) {
        Some("png") => Some("image/png".to_string()),
        Some("jpg") | Some("jpeg") => Some("image/jpeg".to_string()),
        Some("gif") => Some("image/gif".to_string()),
        _ => None,
    };

    let now = Utc::now();

    let thumbnail_path = generate_thumbnail(&app, path);

    let media_record = MediaRecord {
        id: Uuid::new_v4(),
        path: path.to_str().unwrap().to_string(),
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
    };

    Ok(media_record)
}

#[tauri::command]
pub fn get_media_records(app: AppHandle, paths: Vec<String>) -> Result<Vec<MediaRecord>, String> {
    paths
        .into_iter()
        .map(|p| get_media_record(app.clone(), p))
        .collect()
}
