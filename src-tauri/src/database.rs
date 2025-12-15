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

/// WebDAV 服务器配置结构体
///
/// 对应数据库中的 webdav_servers 表
/// 密码不存储在此结构中，而是存储在系统 Keyring 中
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavServerConfig {
    /// 服务器唯一标识符 (UUID)
    pub id: String,

    /// 服务器名称
    pub name: String,

    /// WebDAV 服务器 URL
    pub url: String,

    /// 用户名
    pub username: String,

    /// 是否使用 HTTPS
    pub use_https: bool,

    /// 连接超时时间（秒）
    pub timeout: u32,

    /// 最后连接测试时间（Unix 时间戳，秒）
    pub last_test_at: Option<i64>,

    /// 最后连接测试状态（success, failed, unknown）
    pub last_test_status: String,

    /// 最后连接测试错误信息
    pub last_test_error: Option<String>,

    /// 服务器类型（自动检测，如 nextcloud, owncloud, generic）
    pub server_type: String,

    /// 是否启用
    pub enabled: bool,

    /// 创建时间（Unix 时间戳，秒）
    pub created_at: i64,

    /// 更新时间（Unix 时间戳，秒）
    pub updated_at: i64,
}

impl WebDavServerConfig {
    /// 验证 URL 格式是否有效
    ///
    /// 要求：
    /// - URL 必须包含协议（http 或 https）
    /// - URL 必须包含主机名
    ///
    /// # 返回
    /// - Ok(()) 如果 URL 有效
    /// - Err(String) 如果 URL 无效，包含错误描述
    pub fn validate_url(&self) -> Result<(), String> {
        // 检查 URL 是否为空
        if self.url.trim().is_empty() {
            return Err("URL cannot be empty".to_string());
        }

        // 尝试解析 URL
        match url::Url::parse(&self.url) {
            Ok(parsed_url) => {
                // 检查是否有协议
                let scheme = parsed_url.scheme();
                if scheme != "http" && scheme != "https" {
                    return Err(format!(
                        "URL must use http or https protocol, found: {}",
                        scheme
                    ));
                }

                // 检查是否有主机名
                if parsed_url.host_str().is_none() {
                    return Err("URL must contain a valid host".to_string());
                }

                Ok(())
            }
            Err(e) => Err(format!("Invalid URL format: {}", e)),
        }
    }

    /// 验证服务器名称是否有效
    ///
    /// 要求：
    /// - 名称不能为空
    /// - 名称不能只包含空白字符
    ///
    /// # 返回
    /// - Ok(()) 如果名称有效
    /// - Err(String) 如果名称无效，包含错误描述
    pub fn validate_name(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Server name cannot be empty".to_string());
        }
        Ok(())
    }

    /// 验证用户名是否有效
    ///
    /// 要求：
    /// - 用户名不能为空
    /// - 用户名不能只包含空白字符
    ///
    /// # 返回
    /// - Ok(()) 如果用户名有效
    /// - Err(String) 如果用户名无效，包含错误描述
    pub fn validate_username(&self) -> Result<(), String> {
        if self.username.trim().is_empty() {
            return Err("Username cannot be empty".to_string());
        }
        Ok(())
    }

    /// 验证超时时间是否在有效范围内
    ///
    /// 要求：
    /// - 超时时间必须在 1-300 秒之间
    ///
    /// # 返回
    /// - Ok(()) 如果超时时间有效
    /// - Err(String) 如果超时时间无效，包含错误描述
    pub fn validate_timeout(&self) -> Result<(), String> {
        if self.timeout < 1 || self.timeout > 300 {
            return Err(format!(
                "Timeout must be between 1 and 300 seconds, got: {}",
                self.timeout
            ));
        }
        Ok(())
    }

    /// 验证所有字段
    ///
    /// 执行所有验证检查，返回第一个遇到的错误
    ///
    /// # 返回
    /// - Ok(()) 如果所有字段都有效
    /// - Err(String) 如果任何字段无效，包含错误描述
    pub fn validate(&self) -> Result<(), String> {
        self.validate_name()?;
        self.validate_url()?;
        self.validate_username()?;
        self.validate_timeout()?;
        Ok(())
    }
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

    // ========== WebDavServerConfig Tests ==========

    fn create_valid_config() -> WebDavServerConfig {
        WebDavServerConfig {
            id: "test-uuid-123".to_string(),
            name: "Test Server".to_string(),
            url: "https://example.com/webdav".to_string(),
            username: "testuser".to_string(),
            use_https: true,
            timeout: 30,
            last_test_at: None,
            last_test_status: "unknown".to_string(),
            last_test_error: None,
            server_type: "generic".to_string(),
            enabled: true,
            created_at: 1234567890,
            updated_at: 1234567890,
        }
    }

    #[test]
    fn test_webdav_config_serialization() {
        let config = create_valid_config();
        let json = serde_json::to_string(&config).unwrap();

        // Verify camelCase serialization
        assert!(json.contains("\"useHttps\":true"));
        assert!(json.contains("\"lastTestStatus\":\"unknown\""));
        assert!(json.contains("\"serverType\":\"generic\""));
        assert!(json.contains("\"createdAt\":1234567890"));
        assert!(json.contains("\"updatedAt\":1234567890"));
    }

    #[test]
    fn test_webdav_config_deserialization() {
        let json = r#"{
            "id": "test-uuid-456",
            "name": "My Server",
            "url": "https://cloud.example.com",
            "username": "user123",
            "useHttps": true,
            "timeout": 60,
            "lastTestAt": null,
            "lastTestStatus": "success",
            "lastTestError": null,
            "serverType": "nextcloud",
            "enabled": false,
            "createdAt": 1234567890,
            "updatedAt": 1234567891
        }"#;

        let config: WebDavServerConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.id, "test-uuid-456");
        assert_eq!(config.name, "My Server");
        assert_eq!(config.url, "https://cloud.example.com");
        assert_eq!(config.username, "user123");
        assert_eq!(config.use_https, true);
        assert_eq!(config.timeout, 60);
        assert_eq!(config.last_test_status, "success");
        assert_eq!(config.server_type, "nextcloud");
        assert_eq!(config.enabled, false);
    }

    #[test]
    fn test_validate_url_valid_https() {
        let config = create_valid_config();
        assert!(config.validate_url().is_ok());
    }

    #[test]
    fn test_validate_url_valid_http() {
        let mut config = create_valid_config();
        config.url = "http://example.com/webdav".to_string();
        assert!(config.validate_url().is_ok());
    }

    #[test]
    fn test_validate_url_empty() {
        let mut config = create_valid_config();
        config.url = "".to_string();
        let result = config.validate_url();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_url_whitespace_only() {
        let mut config = create_valid_config();
        config.url = "   ".to_string();
        let result = config.validate_url();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_url_missing_protocol() {
        let mut config = create_valid_config();
        config.url = "example.com/webdav".to_string();
        let result = config.validate_url();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid URL format"));
    }

    #[test]
    fn test_validate_url_invalid_protocol() {
        let mut config = create_valid_config();
        config.url = "ftp://example.com/webdav".to_string();
        let result = config.validate_url();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must use http or https"));
    }

    #[test]
    fn test_validate_url_no_host() {
        let mut config = create_valid_config();
        config.url = "https://".to_string();
        let result = config.validate_url();
        assert!(result.is_err());
        // The url crate returns "Invalid URL format" for this case
        let err = result.unwrap_err();
        assert!(err.contains("Invalid URL format") || err.contains("valid host"));
    }

    #[test]
    fn test_validate_name_valid() {
        let config = create_valid_config();
        assert!(config.validate_name().is_ok());
    }

    #[test]
    fn test_validate_name_empty() {
        let mut config = create_valid_config();
        config.name = "".to_string();
        let result = config.validate_name();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_name_whitespace_only() {
        let mut config = create_valid_config();
        config.name = "   ".to_string();
        let result = config.validate_name();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_username_valid() {
        let config = create_valid_config();
        assert!(config.validate_username().is_ok());
    }

    #[test]
    fn test_validate_username_empty() {
        let mut config = create_valid_config();
        config.username = "".to_string();
        let result = config.validate_username();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_username_whitespace_only() {
        let mut config = create_valid_config();
        config.username = "   ".to_string();
        let result = config.validate_username();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_timeout_valid() {
        let config = create_valid_config();
        assert!(config.validate_timeout().is_ok());
    }

    #[test]
    fn test_validate_timeout_minimum() {
        let mut config = create_valid_config();
        config.timeout = 1;
        assert!(config.validate_timeout().is_ok());
    }

    #[test]
    fn test_validate_timeout_maximum() {
        let mut config = create_valid_config();
        config.timeout = 300;
        assert!(config.validate_timeout().is_ok());
    }

    #[test]
    fn test_validate_timeout_too_small() {
        let mut config = create_valid_config();
        config.timeout = 0;
        let result = config.validate_timeout();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("between 1 and 300"));
    }

    #[test]
    fn test_validate_timeout_too_large() {
        let mut config = create_valid_config();
        config.timeout = 301;
        let result = config.validate_timeout();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("between 1 and 300"));
    }

    #[test]
    fn test_validate_all_fields_valid() {
        let config = create_valid_config();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_validate_all_fields_invalid_name() {
        let mut config = create_valid_config();
        config.name = "".to_string();
        let result = config.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("name"));
    }

    #[test]
    fn test_validate_all_fields_invalid_url() {
        let mut config = create_valid_config();
        config.url = "invalid-url".to_string();
        let result = config.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_all_fields_invalid_username() {
        let mut config = create_valid_config();
        config.username = "".to_string();
        let result = config.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Username"));
    }

    #[test]
    fn test_validate_all_fields_invalid_timeout() {
        let mut config = create_valid_config();
        config.timeout = 500;
        let result = config.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Timeout"));
    }
}
