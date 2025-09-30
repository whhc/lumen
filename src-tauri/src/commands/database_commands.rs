use crate::database::media_repository::MediaRepository;
use crate::models::image::MediaRecord;
use tauri::{AppHandle, Emitter};

/// 图片处理进度事件
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesDealProgressEvent {
    pub current: usize,
    pub total: usize,
    pub current_file: Option<String>,
    pub step: String,
}

/// 图片删除进度事件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesDeleteProgressEvent {
    pub current: usize,
    pub total: usize,
    pub current_file: Option<String>,
    pub step: String,
}

/// 从数据库获取所有媒体记录
#[tauri::command]
pub async fn get_media_list(app: AppHandle) -> Result<Vec<MediaRecord>, String> {
    let repository = MediaRepository::new(app);

    let res = repository
        .find_all()
        .await
        .map_err(|e| format!("获取媒体列表失败: {}", e));
    println!("获取媒体列表成功: {:?}", res);
    res
}

/// 从数据库获取媒体详情
#[tauri::command]
pub async fn get_media_detail(
    app: AppHandle,
    media_id: String,
) -> Result<Option<MediaRecord>, String> {
    let repository = MediaRepository::new(app);

    // 由于我们的查询是基于路径的，这里可能需要另一种实现方式
    // 暂时通过获取所有记录然后筛选来实现
    let all_records = repository
        .find_all()
        .await
        .map_err(|e| format!("获取媒体详情失败: {}", e))?;

    let record = all_records
        .into_iter()
        .find(|r| r.id.to_string() == media_id);

    Ok(record)
}

/// 导入媒体到数据库
#[tauri::command]
pub async fn import_media(_app: AppHandle, _paths: Vec<String>) -> Result<Vec<String>, String> {
    // 这个命令将在 image_import.rs 中实现，这里只是声明
    Ok(vec![])
}

/// 删除选中的媒体记录
#[tauri::command]
pub async fn delete_selected_media(
    app: AppHandle,
    media_ids: Vec<String>,
) -> Result<usize, String> {
    let repository = MediaRepository::new(app.clone());
    let mut deleted_count = 0;
    let total_count = media_ids.len();

    println!("开始删除 {} 个选中的媒体记录", total_count);

    // 发送删除开始事件
    let _ = app.emit(
        "images-delete-progress",
        ImagesDeleteProgressEvent {
            current: 0,
            total: total_count,
            current_file: None,
            step: "deleting_selected".to_string(),
        },
    );

    // 首先获取所有记录以找到对应的路径
    let all_records = repository
        .find_all()
        .await
        .map_err(|e| format!("获取媒体列表失败: {}", e))?;

    // 创建ID到路径的映射
    let mut id_to_path = std::collections::HashMap::new();
    for record in all_records {
        id_to_path.insert(record.id.to_string(), record.path);
    }

    // 删除选中的媒体记录
    for (index, media_id) in media_ids.iter().enumerate() {
        if let Some(path) = id_to_path.get(media_id) {
            match repository.delete_by_path(path).await {
                Ok(_) => {
                    deleted_count += 1;
                    println!("已删除媒体记录: {}", path);
                }
                Err(e) => {
                    eprintln!("删除媒体记录失败 {}: {}", path, e);
                }
            }
        } else {
            eprintln!("未找到ID为 {} 的媒体记录", media_id);
        }

        // 发送删除进度
        if (index + 1) % 5 == 0 || index + 1 == total_count {
            let _ = app.emit(
                "images-delete-progress",
                ImagesDeleteProgressEvent {
                    current: index + 1,
                    total: total_count,
                    current_file: None,
                    step: "deleting_selected".to_string(),
                },
            );
        }
    }

    // 发送删除完成事件
    let _ = app.emit(
        "images-delete-progress",
        ImagesDeleteProgressEvent {
            current: total_count,
            total: total_count,
            current_file: None,
            step: "completed".to_string(),
        },
    );

    println!("删除完成，共删除了 {} 个媒体记录", deleted_count);
    Ok(deleted_count)
}

/// 删除所有媒体记录
#[tauri::command]
pub async fn delete_all_media(app: AppHandle) -> Result<String, String> {
    let repository = MediaRepository::new(app.clone());

    println!("开始删除所有媒体记录");

    // 发送删除开始事件
    let _ = app.emit(
        "images-delete-progress",
        ImagesDeleteProgressEvent {
            current: 0,
            total: 1,
            current_file: None,
            step: "deleting_all".to_string(),
        },
    );

    match repository.clear_all().await {
        Ok(_) => {
            // 发送删除完成事件
            let _ = app.emit(
                "images-delete-progress",
                ImagesDeleteProgressEvent {
                    current: 1,
                    total: 1,
                    current_file: None,
                    step: "completed".to_string(),
                },
            );

            println!("所有媒体记录已删除");
            Ok("所有媒体记录已成功删除".to_string())
        }
        Err(e) => {
            let error_msg = format!("删除所有媒体记录失败: {}", e);
            eprintln!("{}", error_msg);
            Err(error_msg)
        }
    }
}
