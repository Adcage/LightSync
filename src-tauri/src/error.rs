/// LightSync 统一错误类型定义
///
/// 使用 thiserror 提供统一的错误处理机制，支持错误传播和序列化
use serde::{Serialize, Serializer};

/// 同步错误的主要类型枚举
#[derive(Debug, thiserror::Error)]
pub enum SyncError {
    /// I/O 错误（文件读写等）
    #[error(transparent)]
    Io(#[from] std::io::Error),

    /// WebDAV 操作错误
    #[error("WebDAV error: {0}")]
    WebDav(String),

    /// 网络请求错误
    #[error("Network error: {0}")]
    Network(String),

    /// JSON 序列化/反序列化错误
    #[error(transparent)]
    Serde(#[from] serde_json::Error),

    /// Tauri 框架错误
    #[error(transparent)]
    Tauri(#[from] tauri::Error),

    /// 同步冲突错误
    #[error("Sync conflict: {0}")]
    Conflict(String),

    /// 认证失败错误
    #[error("Authentication failed: {0}")]
    AuthError(String),

    /// 文件未找到错误
    #[error("File not found: {0}")]
    FileNotFound(String),

    /// 资源未找到错误
    #[error("Not found: {0}")]
    NotFound(String),

    /// 配置错误
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// 数据库错误
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// 文件系统监控错误
    #[error("File watcher error: {0}")]
    WatcherError(String),

    /// 未知错误
    #[error("Unknown error: {0}")]
    Unknown(String),
}

/// 实现 Serialize trait，使错误可以序列化传递到前端
impl Serialize for SyncError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

/// 自定义 Result 类型别名，简化错误处理
pub type Result<T> = std::result::Result<T, SyncError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = SyncError::FileNotFound("test.txt".to_string());
        print!("{}", error.to_string());
        assert_eq!(error.to_string(), "File not found: test.txt");
    }

    #[test]
    fn test_error_serialization() {
        let error = SyncError::ConfigError("Invalid config".to_string());
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("Configuration error"));
    }

    #[test]
    fn test_error_from_io() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let sync_error: SyncError = io_error.into();
        assert!(matches!(sync_error, SyncError::Io(_)));
    }
}
