pub mod media_repository;
pub mod migrations;

use std::path::PathBuf;
use tauri::{path::BaseDirectory, AppHandle, Manager};

/// 初始化数据库
pub async fn init_database(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app.path().resolve("", BaseDirectory::AppLocalData)?;

    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("lumen.db");
    println!("Database will be stored at: {:?}", db_path);

    Ok(())
}

/// 获取数据库路径
pub fn get_database_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = app.path().resolve("", BaseDirectory::AppLocalData)?;

    Ok(app_dir.join("lumen.db"))
}
