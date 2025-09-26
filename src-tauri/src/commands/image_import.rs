#[tauri::command]
pub fn read_images_in_dir(dir: String) -> Vec<String> {
    let mut images = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if ["png", "jpg", "jpeg", "gif"].contains(&ext.to_lowercase().as_str()) {
                    images.push(path.to_str().unwrap().to_string());
                }
            }
        }
    }
    images
}
