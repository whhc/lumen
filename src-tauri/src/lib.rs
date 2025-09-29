// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod commands;
mod models;
mod utils;

use commands::image_import::{get_media_record, get_media_records, read_images_in_dir};
use tauri::{path::BaseDirectory, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app
                .path()
                .resolve("thumbnails", BaseDirectory::AppLocalData)?;
            std::fs::create_dir_all(&app_dir)?;
            println!("Thumbnails will be stored in: {:?}", app_dir);
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_images_in_dir,
            get_media_record,
            get_media_records
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
