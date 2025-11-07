// 允许未使用的常量（为未来功能预留）
#![allow(dead_code)]

/// LightSync 常量定义模块
///
/// 集中管理应用程序中使用的所有常量，包括文件名、路径、默认值等
///
/// 注意：部分常量为未来功能预留，可能暂时未使用

// ============================================================================
// 文件名常量
// ============================================================================

/// 配置存储文件名
pub const CONFIG_STORE_FILE: &str = "config.json";

/// 数据库文件名
pub const DATABASE_FILE: &str = "lightsync.db";

/// 日志文件名
pub const LOG_FILE: &str = "lightsync.log";

// ============================================================================
// 目录名常量
// ============================================================================

/// 缓存目录名
pub const CACHE_DIR: &str = "cache";

/// 日志目录名
pub const LOG_DIR: &str = "logs";

/// 临时文件目录名
pub const TEMP_DIR: &str = "temp";

// ============================================================================
// 配置默认值
// ============================================================================

/// 默认语言
pub const DEFAULT_LANGUAGE: &str = "zh-CN";

/// 默认主题
pub const DEFAULT_THEME: &str = "system";

/// 默认同步间隔（分钟）
pub const DEFAULT_SYNC_INTERVAL: u32 = 30;

/// 默认连接超时（秒）
pub const DEFAULT_TIMEOUT: u32 = 30;

/// 默认冲突解决策略
pub const DEFAULT_CONFLICT_RESOLUTION: &str = "newer-wins";

// ============================================================================
// 应用程序信息
// ============================================================================

/// 应用程序名称
pub const APP_NAME: &str = "LightSync";

/// 应用程序版本（从 Cargo.toml 读取）
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

/// 应用程序描述
pub const APP_DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");

// ============================================================================
// 网络相关常量
// ============================================================================

/// 最大重试次数
pub const MAX_RETRY_COUNT: u32 = 3;

/// 重试延迟（毫秒）
pub const RETRY_DELAY_MS: u64 = 1000;

/// 最大并发上传数
pub const MAX_CONCURRENT_UPLOADS: usize = 5;

/// 最大并发下载数
pub const MAX_CONCURRENT_DOWNLOADS: usize = 5;

// ============================================================================
// 文件大小限制
// ============================================================================

/// 小文件阈值（1MB）- 使用完整哈希
pub const SMALL_FILE_THRESHOLD: u64 = 1024 * 1024;

/// 中等文件阈值（100MB）- 使用分块哈希
pub const MEDIUM_FILE_THRESHOLD: u64 = 100 * 1024 * 1024;

/// 大文件阈值（100MB以上）- 仅使用元数据
// 注：大于 MEDIUM_FILE_THRESHOLD 的文件被视为大文件

// ============================================================================
// 同步相关常量
// ============================================================================

/// 默认忽略模式
pub const DEFAULT_IGNORE_PATTERNS: &[&str] = &[
    ".git",
    ".svn",
    "node_modules",
    ".DS_Store",
    "Thumbs.db",
    "*.tmp",
    "*.temp",
    "~*",
];

/// 同步方向选项
pub mod sync_direction {
    pub const BIDIRECTIONAL: &str = "bidirectional";
    pub const UPLOAD_ONLY: &str = "upload-only";
    pub const DOWNLOAD_ONLY: &str = "download-only";
}

/// 冲突解决策略
pub mod conflict_resolution {
    pub const ASK: &str = "ask";
    pub const LOCAL_WINS: &str = "local-wins";
    pub const REMOTE_WINS: &str = "remote-wins";
    pub const NEWER_WINS: &str = "newer-wins";
}

// ============================================================================
// 数据库相关常量
// ============================================================================

/// 数据库连接池大小
pub const DB_POOL_SIZE: u32 = 5;

/// 数据库查询超时（秒）
pub const DB_QUERY_TIMEOUT: u64 = 30;

// ============================================================================
// 日志相关常量
// ============================================================================

/// 日志文件最大大小（10MB）
pub const LOG_FILE_MAX_SIZE: u64 = 10 * 1024 * 1024;

/// 日志文件保留数量
pub const LOG_FILE_RETENTION: usize = 5;

// ============================================================================
// 测试相关常量（仅在测试时可用）
// ============================================================================

#[cfg(test)]
pub mod test {
    pub const TEST_CONFIG_FILE: &str = "test_config.json";
    pub const TEST_DB_FILE: &str = "test_lightsync.db";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants_not_empty() {
        assert!(!CONFIG_STORE_FILE.is_empty());
        assert!(!DATABASE_FILE.is_empty());
        assert!(!APP_NAME.is_empty());
    }

    #[test]
    fn test_default_values() {
        assert_eq!(DEFAULT_LANGUAGE, "zh-CN");
        assert_eq!(DEFAULT_THEME, "system");
        assert_eq!(DEFAULT_SYNC_INTERVAL, 30);
    }

    #[test]
    fn test_sync_directions() {
        assert_eq!(sync_direction::BIDIRECTIONAL, "bidirectional");
        assert_eq!(sync_direction::UPLOAD_ONLY, "upload-only");
        assert_eq!(sync_direction::DOWNLOAD_ONLY, "download-only");
    }

    #[test]
    fn test_conflict_resolutions() {
        assert_eq!(conflict_resolution::ASK, "ask");
        assert_eq!(conflict_resolution::LOCAL_WINS, "local-wins");
        assert_eq!(conflict_resolution::REMOTE_WINS, "remote-wins");
        assert_eq!(conflict_resolution::NEWER_WINS, "newer-wins");
    }
}

