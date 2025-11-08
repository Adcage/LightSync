/// LightSync 数据库类型定义模块
/// 
/// 提供数据库表对应的数据结构
/// 注意：数据库操作通过前端的 @tauri-apps/plugin-sql 执行
use serde::{Deserialize, Serialize};

/// 文件元数据结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: Option<i64>,
    pub path: String,
    pub hash: Option<String>,
    pub size: i64,
    pub modified_at: i64,
    pub synced_at: Option<i64>,
    pub sync_folder_id: i64,
    pub is_directory: bool,
    pub status: String,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

/// 同步日志结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncLog {
    pub id: Option<i64>,
    pub sync_folder_id: i64,
    pub file_path: String,
    pub action: String,
    pub status: String,
    pub error_message: Option<String>,
    pub file_size: Option<i64>,
    pub duration_ms: Option<i64>,
    pub created_at: Option<i64>,
}

/// 同步会话结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncSession {
    pub id: Option<i64>,
    pub sync_folder_id: i64,
    pub status: String,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub files_uploaded: i32,
    pub files_downloaded: i32,
    pub files_deleted: i32,
    pub files_conflict: i32,
    pub errors_count: i32,
    pub total_bytes: i64,
    pub error_message: Option<String>,
}

/// 查询过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryFilter {
    pub sync_folder_id: Option<i64>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// 数据库统计信息结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub total_files: i64,
    pub total_logs: i64,
    pub total_sessions: i64,
    pub pending_files: i64,
    pub synced_files: i64,
    pub conflict_files: i64,
    pub database_size_bytes: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_metadata_serialization() {
        let metadata = FileMetadata {
            id: Some(1),
            path: "/test/file.txt".to_string(),
            hash: Some("abc123".to_string()),
            size: 1024,
            modified_at: 1234567890,
            synced_at: Some(1234567891),
            sync_folder_id: 1,
            is_directory: false,
            status: "synced".to_string(),
            created_at: Some(1234567889),
            updated_at: Some(1234567891),
        };

        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("test/file.txt"));
    }

    #[test]
    fn test_sync_log_creation() {
        let log = SyncLog {
            id: None,
            sync_folder_id: 1,
            file_path: "/test/file.txt".to_string(),
            action: "upload".to_string(),
            status: "success".to_string(),
            error_message: None,
            file_size: Some(1024),
            duration_ms: Some(500),
            created_at: None,
        };

        assert_eq!(log.action, "upload");
        assert_eq!(log.status, "success");
    }
}

