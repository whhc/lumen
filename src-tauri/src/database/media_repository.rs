use chrono::{DateTime, Utc};
use log::{error, info};
use rusqlite::{params, Connection};
use serde_json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use uuid::Uuid;

use crate::database::get_database_path;
use crate::models::image::{MediaKind, MediaRecord};

/// SQLite 媒体仓库实现
pub struct MediaRepository {
    app: AppHandle,
    // 保留内存缓存作为性能优化
    cache: Arc<Mutex<HashMap<String, MediaRecord>>>,
}

impl MediaRepository {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 获取数据库连接
    fn get_connection(&self) -> Result<Connection, Box<dyn std::error::Error>> {
        let db_path = get_database_path(&self.app)?;
        let conn = Connection::open(db_path)?;

        // 执行迁移脚本
        conn.execute(include_str!("migrations/001_create_media_records.sql"), [])?;

        Ok(conn)
    }

    /// 通过路径查找媒体记录
    pub async fn find_by_path(
        &self,
        path: &str,
    ) -> Result<Option<MediaRecord>, Box<dyn std::error::Error>> {
        // 首先检查缓存
        if let Ok(cache) = self.cache.lock() {
            if let Some(record) = cache.get(path) {
                return Ok(Some(record.clone()));
            }
        }

        // 从 SQLite 数据库查询
        match self.query_from_database(path).await {
            Ok(Some(record)) => {
                // 更新缓存
                if let Ok(mut cache) = self.cache.lock() {
                    cache.insert(path.to_string(), record.clone());
                }
                Ok(Some(record))
            }
            Ok(None) => Ok(None),
            Err(e) => {
                error!("数据库查询出错: {}", e);
                Ok(None)
            }
        }
    }

    /// 保存媒体记录到 SQLite
    pub async fn save(&self, record: &MediaRecord) -> Result<(), Box<dyn std::error::Error>> {
        // 保存到数据库
        self.save_to_database(record).await?;

        // 更新缓存
        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(record.path.clone(), record.clone());
        }

        info!(
            "已保存媒体记录到 SQLite 数据库: {} ({})",
            record.name, record.path
        );
        Ok(())
    }

    /// 获取所有媒体记录
    pub async fn find_all(&self) -> Result<Vec<MediaRecord>, Box<dyn std::error::Error>> {
        match self.query_all_from_database().await {
            Ok(records) => {
                // 更新缓存
                if let Ok(mut cache) = self.cache.lock() {
                    cache.clear();
                    for record in &records {
                        cache.insert(record.path.clone(), record.clone());
                    }
                }
                Ok(records)
            }
            Err(e) => {
                error!("从数据库获取所有记录时出错: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 删除媒体记录
    pub async fn delete_by_path(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        // 从数据库删除
        self.delete_from_database(path).await?;

        // 从缓存删除
        if let Ok(mut cache) = self.cache.lock() {
            cache.remove(path);
        }

        info!("已从 SQLite 数据库删除媒体记录: {}", path);
        Ok(())
    }

    /// 检查文件是否存在于数据库中
    pub async fn _exists_by_path(&self, path: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // 首先检查缓存
        if let Ok(cache) = self.cache.lock() {
            if cache.contains_key(path) {
                return Ok(true);
            }
        }

        // 检查数据库
        match self.find_by_path(path).await {
            Ok(Some(_)) => Ok(true),
            Ok(None) => Ok(false),
            Err(_) => Ok(false),
        }
    }

    /// 获取已处理文件数量
    pub fn _get_processed_count(&self) -> usize {
        if let Ok(cache) = self.cache.lock() {
            cache.len()
        } else {
            0
        }
    }

    /// 清空所有记录
    pub async fn clear_all(&self) -> Result<(), Box<dyn std::error::Error>> {
        // 清空数据库
        self.clear_database().await?;

        // 清空缓存
        if let Ok(mut cache) = self.cache.lock() {
            cache.clear();
        }

        info!("已清空 SQLite 数据库中的所有媒体记录");
        Ok(())
    }

    /// 从数据库查询单个记录
    async fn query_from_database(
        &self,
        path: &str,
    ) -> Result<Option<MediaRecord>, Box<dyn std::error::Error>> {
        info!("正在从 SQLite 数据库查询路径: {}", path);

        let conn = self.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, path, name, kind, mime_type, size, width, height, duration, 
             thumbnail_path, taken_date, created_at, updated_at, tags, album_ids, face_count 
             FROM media_records WHERE path = ?1",
        )?;

        let result = stmt.query_row(params![path], |row| {
            // 解析 UUID
            let id_str: String = row.get(0)?;
            let id = Uuid::parse_str(&id_str).map_err(|e| {
                rusqlite::Error::InvalidColumnType(
                    0,
                    format!("Invalid UUID: {}", e),
                    rusqlite::types::Type::Text,
                )
            })?;

            // 解析基本字段
            let path: String = row.get(1)?;
            let name: String = row.get(2)?;
            let kind_str: String = row.get(3)?;

            // 解析 MediaKind
            let kind = match kind_str.as_str() {
                "Image" => MediaKind::Image,
                "Vedio" => MediaKind::Vedio,
                _ => MediaKind::Other,
            };

            // 解析可选字段
            let mime_type: Option<String> = row.get(4)?;
            let size: Option<u64> = row.get::<_, Option<i64>>(5)?.map(|s| s as u64);
            let width: Option<u32> = row.get::<_, Option<i64>>(6)?.map(|w| w as u32);
            let height: Option<u32> = row.get::<_, Option<i64>>(7)?.map(|h| h as u32);
            let duration: Option<f64> = row.get(8)?;
            let thumbnail_path: Option<String> = row.get(9)?;

            // 解析时间字段
            let taken_date = if let Ok(date_str) = row.get::<_, Option<String>>(10) {
                date_str.and_then(|s| {
                    DateTime::parse_from_rfc3339(&s)
                        .ok()
                        .map(|dt| dt.with_timezone(&Utc))
                })
            } else {
                None
            };

            let created_at_str: String = row.get(11)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map_err(|e| {
                    rusqlite::Error::InvalidColumnType(
                        11,
                        format!("Invalid created_at: {}", e),
                        rusqlite::types::Type::Text,
                    )
                })?
                .with_timezone(&Utc);

            let updated_at_str: String = row.get(12)?;
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map_err(|e| {
                    rusqlite::Error::InvalidColumnType(
                        12,
                        format!("Invalid updated_at: {}", e),
                        rusqlite::types::Type::Text,
                    )
                })?
                .with_timezone(&Utc);

            // 解析 JSON 字段
            let tags = if let Ok(tags_str) = row.get::<_, Option<String>>(13) {
                tags_str.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
            } else {
                None
            };

            let album_ids = if let Ok(album_ids_str) = row.get::<_, Option<String>>(14) {
                album_ids_str.and_then(|s| serde_json::from_str::<Vec<Uuid>>(&s).ok())
            } else {
                None
            };

            let face_count: Option<u32> = row.get::<_, Option<i64>>(15)?.map(|f| f as u32);

            Ok(MediaRecord {
                id,
                path,
                name,
                kind,
                mime_type,
                size,
                width,
                height,
                duration,
                thumbnail_path,
                taken_date,
                created_at,
                updated_at,
                tags,
                album_ids,
                face_count,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(Box::new(e)),
        }
    }

    /// 保存记录到数据库
    async fn save_to_database(
        &self,
        record: &MediaRecord,
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("正在保存记录到 SQLite 数据库: {}", record.path);

        let conn = self.get_connection()?;

        // 将 JSON 字段序列化
        let tags_json = record
            .tags
            .as_ref()
            .map(|tags| serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()))
            .unwrap_or_else(|| "null".to_string());

        let album_ids_json = record
            .album_ids
            .as_ref()
            .map(|ids| serde_json::to_string(ids).unwrap_or_else(|_| "[]".to_string()))
            .unwrap_or_else(|| "null".to_string());

        // 将时间字段转换为 RFC3339 字符串
        let taken_date_str = record
            .taken_date
            .as_ref()
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| "null".to_string());

        let created_at_str = record.created_at.to_rfc3339();
        let updated_at_str = record.updated_at.to_rfc3339();

        // 使用 REPLACE 实现 UPSERT 操作，根据路径去重
        conn.execute(
            "REPLACE INTO media_records 
             (id, path, name, kind, mime_type, size, width, height, duration, thumbnail_path, 
              taken_date, created_at, updated_at, tags, album_ids, face_count) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                record.id.to_string(),
                record.path,
                record.name,
                match record.kind {
                    MediaKind::Image => "Image",
                    MediaKind::Vedio => "Vedio",
                    MediaKind::Other => "Other",
                },
                record.mime_type,
                record.size.map(|s| s as i64),
                record.width.map(|w| w as i64),
                record.height.map(|h| h as i64),
                record.duration,
                record.thumbnail_path,
                if record.taken_date.is_some() {
                    Some(taken_date_str)
                } else {
                    None
                },
                created_at_str,
                updated_at_str,
                if record.tags.is_some() {
                    Some(tags_json)
                } else {
                    None
                },
                if record.album_ids.is_some() {
                    Some(album_ids_json)
                } else {
                    None
                },
                record.face_count.map(|f| f as i64),
            ],
        )?;

        info!("已成功保存记录到 SQLite 数据库: {}", record.name);
        Ok(())
    }

    /// 从数据库查询所有记录
    async fn query_all_from_database(
        &self,
    ) -> Result<Vec<MediaRecord>, Box<dyn std::error::Error>> {
        info!("正在从 SQLite 数据库查询所有记录");

        let conn = self.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, path, name, kind, mime_type, size, width, height, duration, 
             thumbnail_path, taken_date, created_at, updated_at, tags, album_ids, face_count 
             FROM media_records ORDER BY created_at DESC",
        )?;

        let record_iter = stmt.query_map([], |row| {
            // 解析 UUID
            let id_str: String = row.get(0)?;
            let id = Uuid::parse_str(&id_str).map_err(|e| {
                rusqlite::Error::InvalidColumnType(
                    0,
                    format!("Invalid UUID: {}", e),
                    rusqlite::types::Type::Text,
                )
            })?;

            // 解析基本字段
            let path: String = row.get(1)?;
            let name: String = row.get(2)?;
            let kind_str: String = row.get(3)?;

            // 解析 MediaKind
            let kind = match kind_str.as_str() {
                "Image" => MediaKind::Image,
                "Vedio" => MediaKind::Vedio,
                _ => MediaKind::Other,
            };

            // 解析可选字段
            let mime_type: Option<String> = row.get(4)?;
            let size: Option<u64> = row.get::<_, Option<i64>>(5)?.map(|s| s as u64);
            let width: Option<u32> = row.get::<_, Option<i64>>(6)?.map(|w| w as u32);
            let height: Option<u32> = row.get::<_, Option<i64>>(7)?.map(|h| h as u32);
            let duration: Option<f64> = row.get(8)?;
            let thumbnail_path: Option<String> = row.get(9)?;

            // 解析时间字段
            let taken_date = if let Ok(date_str) = row.get::<_, Option<String>>(10) {
                date_str.and_then(|s| {
                    if s == "null" {
                        None
                    } else {
                        DateTime::parse_from_rfc3339(&s)
                            .ok()
                            .map(|dt| dt.with_timezone(&Utc))
                    }
                })
            } else {
                None
            };

            let created_at_str: String = row.get(11)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map_err(|e| {
                    rusqlite::Error::InvalidColumnType(
                        11,
                        format!("Invalid created_at: {}", e),
                        rusqlite::types::Type::Text,
                    )
                })?
                .with_timezone(&Utc);

            let updated_at_str: String = row.get(12)?;
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map_err(|e| {
                    rusqlite::Error::InvalidColumnType(
                        12,
                        format!("Invalid updated_at: {}", e),
                        rusqlite::types::Type::Text,
                    )
                })?
                .with_timezone(&Utc);

            // 解析 JSON 字段
            let tags = if let Ok(tags_str) = row.get::<_, Option<String>>(13) {
                tags_str.and_then(|s| {
                    if s == "null" {
                        None
                    } else {
                        serde_json::from_str::<Vec<String>>(&s).ok()
                    }
                })
            } else {
                None
            };

            let album_ids = if let Ok(album_ids_str) = row.get::<_, Option<String>>(14) {
                album_ids_str.and_then(|s| {
                    if s == "null" {
                        None
                    } else {
                        serde_json::from_str::<Vec<Uuid>>(&s).ok()
                    }
                })
            } else {
                None
            };

            let face_count: Option<u32> = row.get::<_, Option<i64>>(15)?.map(|f| f as u32);

            Ok(MediaRecord {
                id,
                path,
                name,
                kind,
                mime_type,
                size,
                width,
                height,
                duration,
                thumbnail_path,
                taken_date,
                created_at,
                updated_at,
                tags,
                album_ids,
                face_count,
            })
        })?;

        let mut records = Vec::new();
        for record_result in record_iter {
            records.push(record_result?);
        }

        info!("从 SQLite 数据库查询到 {} 条记录", records.len());
        Ok(records)
    }

    /// 从数据库删除记录
    async fn delete_from_database(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        info!("正在从 SQLite 数据库删除记录: {}", path);

        let conn = self.get_connection()?;

        let affected_rows =
            conn.execute("DELETE FROM media_records WHERE path = ?1", params![path])?;

        if affected_rows > 0 {
            info!("已成功从 SQLite 数据库删除记录: {}", path);
        } else {
            info!("未找到要删除的记录: {}", path);
        }

        Ok(())
    }

    /// 清空数据库
    async fn clear_database(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("正在清空 SQLite 数据库");

        let conn = self.get_connection()?;

        let affected_rows = conn.execute("DELETE FROM media_records", [])?;

        info!("已清空 SQLite 数据库，删除了 {} 条记录", affected_rows);

        Ok(())
    }
}
