// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod commands;
mod database;
mod models;
mod utils;

use commands::database_commands::{
    delete_all_media, delete_selected_media, get_media_detail, get_media_list, import_media,
};
use commands::image_import::{
    get_media_record, get_media_records, get_media_records_with_db, read_images_in_dir,
};
use log::trace;
use tauri::{path::BaseDirectory, Manager};
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_dir = app
                .path()
                .resolve("thumbnails", BaseDirectory::AppLocalData)?;
            std::fs::create_dir_all(&app_dir)?;
            trace!("Thumbnails will be stored in: {:?}", app_dir);
            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_images_in_dir,
            get_media_record,
            get_media_records,
            get_media_records_with_db,
            get_media_list,
            get_media_detail,
            import_media,
            delete_selected_media,
            delete_all_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
