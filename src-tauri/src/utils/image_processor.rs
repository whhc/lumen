use std::{
    fs::File,
    path::{Path, PathBuf},
};

use tauri::Manager;

pub fn get_thumbnail_dir(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .resolve("thumbnails", tauri::path::BaseDirectory::AppLocalData)
        .expect("解析缩略图目录失败");
    dir
}

pub fn generate_thumbnail(app: &tauri::AppHandle, path: &Path) -> Option<String> {
    let img = image::open(path).ok()?;
    let thumbnail_dir = get_thumbnail_dir(app);
    let thumbnail_path = thumbnail_dir.join(path.file_name()?);
    // let thumbnail_path = path.with_file_name(format!("thumbnail_{}", path.file_name()?.to_str()?));
    if thumbnail_path.exists() {
        println!("Thumbnail already exists");
        Some(thumbnail_path.to_string_lossy().to_string())
    } else {
        println!("Generating thumbnail");
        let thumbnail = img.thumbnail(200, 200);
        let mut output = File::create(&thumbnail_path).ok()?;
        thumbnail
            .write_to(&mut output, image::ImageFormat::Jpeg)
            .ok()?;
        Some(thumbnail_path.to_string_lossy().to_string())
    }
}
