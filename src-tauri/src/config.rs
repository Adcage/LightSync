/// LightSync 配置管理模块
///
/// 负责应用程序配置的初始化、读取、更新和持久化存储
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::constants::*;
use crate::error::{Result, SyncError};

/// 应用程序主配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// 应用程序版本
    pub version: String,
    
    /// 语言设置（zh-CN, en-US）
    pub language: String,
    
    /// 主题设置（light, dark, system）
    pub theme: String,
    
    /// 是否开机自启动
    pub auto_start: bool,
    
    /// 是否最小化到系统托盘
    pub minimize_to_tray: bool,
    
    /// 同步文件夹配置列表
    pub sync_folders: Vec<SyncFolderConfig>,
    
    /// WebDAV 服务器配置列表
    pub webdav_servers: Vec<WebDavServerConfig>,
}

/// 同步文件夹配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFolderConfig {
    /// 配置 ID
    pub id: String,
    
    /// 文件夹名称
    pub name: String,
    
    /// 本地路径
    pub local_path: PathBuf,
    
    /// 远程路径
    pub remote_path: String,
    
    /// 关联的服务器 ID
    pub server_id: String,
    
    /// 同步方向（bidirectional, upload-only, download-only）
    pub sync_direction: String,
    
    /// 同步间隔（分钟）
    pub sync_interval: u32,
    
    /// 是否启用自动同步
    pub auto_sync: bool,
    
    /// 忽略规则（glob 模式）
    pub ignore_patterns: Vec<String>,
    
    /// 冲突解决策略（ask, local-wins, remote-wins, newer-wins）
    pub conflict_resolution: String,
}

/// WebDAV 服务器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavServerConfig {
    /// 服务器 ID
    pub id: String,
    
    /// 服务器名称
    pub name: String,
    
    /// 服务器 URL
    pub url: String,
    
    /// 用户名
    pub username: String,
    
    /// 是否使用 HTTPS
    pub use_https: bool,
    
    /// 连接超时（秒）
    pub timeout: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: APP_VERSION.to_string(),
            language: DEFAULT_LANGUAGE.to_string(),
            theme: DEFAULT_THEME.to_string(),
            auto_start: false,
            minimize_to_tray: true,
            sync_folders: Vec::new(),
            webdav_servers: Vec::new(),
        }
    }
}

/// 初始化配置
///
/// 如果配置文件不存在，创建默认配置
#[tauri::command]
pub async fn init_config(app: AppHandle) -> Result<AppConfig> {
    let store = app.store(CONFIG_STORE_FILE).map_err(|e| {
        SyncError::ConfigError(format!("Failed to access store: {}", e))
    })?;

    // 尝试读取现有配置
    if let Some(config_value) = store.get("app_config") {
        let config: AppConfig = serde_json::from_value(config_value.clone())
            .map_err(|e| SyncError::ConfigError(format!("Failed to parse config: {}", e)))?;
        return Ok(config);
    }

    // 如果没有配置，创建默认配置并保存
    let default_config = AppConfig::default();
    store.set(
        "app_config",
        serde_json::to_value(&default_config)
            .map_err(|e| SyncError::ConfigError(format!("Failed to serialize config: {}", e)))?,
    );
    store.save().map_err(|e| {
        SyncError::ConfigError(format!("Failed to save config: {}", e))
    })?;

    Ok(default_config)
}

/// 获取完整配置
#[tauri::command]
pub async fn get_config(app: AppHandle) -> Result<AppConfig> {
    let store = app.store(CONFIG_STORE_FILE).map_err(|e| {
        SyncError::ConfigError(format!("Failed to access store: {}", e))
    })?;

    if let Some(config_value) = store.get("app_config") {
        let config: AppConfig = serde_json::from_value(config_value.clone())
            .map_err(|e| SyncError::ConfigError(format!("Failed to parse config: {}", e)))?;
        return Ok(config);
    }

    // 如果配置不存在，返回默认配置
    Ok(AppConfig::default())
}

/// 更新配置
#[tauri::command]
pub async fn update_config(app: AppHandle, config: AppConfig) -> Result<()> {
    let store = app.store(CONFIG_STORE_FILE).map_err(|e| {
        SyncError::ConfigError(format!("Failed to access store: {}", e))
    })?;

    store.set(
        "app_config",
        serde_json::to_value(&config)
            .map_err(|e| SyncError::ConfigError(format!("Failed to serialize config: {}", e)))?,
    );
    
    store.save().map_err(|e| {
        SyncError::ConfigError(format!("Failed to save config: {}", e))
    })?;

    Ok(())
}

/// 获取指定配置项
#[tauri::command]
pub async fn get_config_value(app: AppHandle, key: String) -> Result<serde_json::Value> {
    let store = app.store(CONFIG_STORE_FILE).map_err(|e| {
        SyncError::ConfigError(format!("Failed to access store: {}", e))
    })?;

    if let Some(config_value) = store.get("app_config") {
        let config: serde_json::Map<String, serde_json::Value> =
            serde_json::from_value(config_value.clone())
                .map_err(|e| SyncError::ConfigError(format!("Failed to parse config: {}", e)))?;

        if let Some(value) = config.get(&key) {
            return Ok(value.clone());
        }
    }

    Err(SyncError::ConfigError(format!("Config key '{}' not found", key)))
}

/// 设置指定配置项
#[tauri::command]
pub async fn set_config_value(
    app: AppHandle,
    key: String,
    value: serde_json::Value,
) -> Result<()> {
    let store = app.store(CONFIG_STORE_FILE).map_err(|e| {
        SyncError::ConfigError(format!("Failed to access store: {}", e))
    })?;

    // 获取当前配置
    let mut config: serde_json::Map<String, serde_json::Value> =
        if let Some(config_value) = store.get("app_config") {
            serde_json::from_value(config_value.clone())
                .map_err(|e| SyncError::ConfigError(format!("Failed to parse config: {}", e)))?
        } else {
            serde_json::to_value(AppConfig::default())
                .and_then(|v| serde_json::from_value(v))
                .map_err(|e| SyncError::ConfigError(format!("Failed to create default config: {}", e)))?
        };

    // 更新配置项
    config.insert(key, value);

    // 保存配置
    store.set("app_config", serde_json::Value::Object(config));
    store.save().map_err(|e| {
        SyncError::ConfigError(format!("Failed to save config: {}", e))
    })?;

    Ok(())
}

/// 重置配置为默认值
#[tauri::command]
pub async fn reset_config(app: AppHandle) -> Result<AppConfig> {
    let default_config = AppConfig::default();
    update_config(app, default_config.clone()).await?;
    Ok(default_config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.language, "zh-CN");
        assert_eq!(config.theme, "system");
        assert!(!config.auto_start);
        assert!(config.minimize_to_tray);
    }


    #[test]
    fn test_app_config_round_trip() {
        let original = AppConfig {
            version: "1.0.0".to_string(),
            language: "zh-CN".to_string(),
            theme: "dark".to_string(),
            auto_start: true,
            minimize_to_tray: false,
            sync_folders: vec![
                SyncFolderConfig {
                    id: "folder1".to_string(),
                    name: "文档".to_string(),
                    local_path: PathBuf::from("/home/user/documents"),
                    remote_path: "/documents".to_string(),
                    server_id: "server1".to_string(),
                    sync_direction: "bidirectional".to_string(),
                    sync_interval: 30,
                    auto_sync: true,
                    ignore_patterns: vec!["*.tmp".to_string(), ".git".to_string()],
                    conflict_resolution: "newer-wins".to_string(),
                }
            ],
            webdav_servers: vec![
                WebDavServerConfig {
                    id: "server1".to_string(),
                    name: "我的服务器".to_string(),
                    url: "https://cloud.example.com".to_string(),
                    username: "user".to_string(),
                    use_https: true,
                    timeout: 30,
                }
            ],
        };

        // 序列化
        let json = serde_json::to_string(&original).unwrap();

        // 验证 JSON 格式（应该是驼峰命名）
        assert!(json.contains("syncInterval"));
        assert!(json.contains("conflictResolution"));
        assert!(json.contains("minimizeToTray"));

        // 反序列化
        let deserialized: AppConfig = serde_json::from_str(&json).unwrap();

        // 验证数据完全一致
        assert_eq!(original.version, deserialized.version);
        assert_eq!(original.language, deserialized.language);
        assert_eq!(original.theme, deserialized.theme);
        assert_eq!(original.auto_start, deserialized.auto_start);
        assert_eq!(original.minimize_to_tray, deserialized.minimize_to_tray);
        assert_eq!(original.sync_folders.len(), deserialized.sync_folders.len());
        assert_eq!(original.webdav_servers.len(), deserialized.webdav_servers.len());

        // 验证嵌套结构体 - SyncFolderConfig
        assert_eq!(
            original.sync_folders[0].sync_interval,
            deserialized.sync_folders[0].sync_interval
        );
        assert_eq!(
            original.sync_folders[0].conflict_resolution,
            deserialized.sync_folders[0].conflict_resolution
        );

        // 验证嵌套结构体 - WebDavServerConfig
        assert_eq!(
            original.webdav_servers[0].timeout,
            deserialized.webdav_servers[0].timeout
        );
        assert_eq!(
            original.webdav_servers[0].use_https,
            deserialized.webdav_servers[0].use_https
        );
    }

    #[test]
    fn test_sync_folder_config_serialization() {
        let folder = SyncFolderConfig {
            id: "test-folder".to_string(),
            name: "测试文件夹".to_string(),
            local_path: PathBuf::from("/test/path"),
            remote_path: "/remote".to_string(),
            server_id: "server1".to_string(),
            sync_direction: "upload-only".to_string(),
            sync_interval: 60,
            auto_sync: false,
            ignore_patterns: vec!["node_modules".to_string()],
            conflict_resolution: "local-wins".to_string(),
        };

        let json = serde_json::to_string(&folder).unwrap();
        let deserialized: SyncFolderConfig = serde_json::from_str(&json).unwrap();

        // 验证 JSON 包含正确的驼峰命名字段
        assert!(json.contains("syncInterval"));
        assert!(json.contains("conflictResolution"));
        assert!(json.contains("autoSync"));
        assert!(json.contains("ignorePatterns"));

        // 验证反序列化后的数据
        assert_eq!(folder.sync_interval, deserialized.sync_interval);
        assert_eq!(folder.conflict_resolution, deserialized.conflict_resolution);
        assert_eq!(folder.auto_sync, deserialized.auto_sync);
        assert_eq!(folder.ignore_patterns, deserialized.ignore_patterns);
    }

    #[test]
    fn test_webdav_server_config_serialization() {
        let server = WebDavServerConfig {
            id: "server-test".to_string(),
            name: "测试服务器".to_string(),
            url: "https://test.example.com".to_string(),
            username: "testuser".to_string(),
            use_https: true,
            timeout: 45,
        };

        let json = serde_json::to_string(&server).unwrap();
        let deserialized: WebDavServerConfig = serde_json::from_str(&json).unwrap();

        // 验证 JSON 包含正确的驼峰命名字段
        assert!(json.contains("useHttps"));
        assert!(json.contains("timeout"));

        // 验证反序列化后的数据
        assert_eq!(server.use_https, deserialized.use_https);
        assert_eq!(server.timeout, deserialized.timeout);
        assert_eq!(server.url, deserialized.url);
    }

    #[test]
    fn test_json_field_naming() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();

        // 验证所有字段都使用了驼峰命名法
        assert!(json.contains("version"));
        assert!(json.contains("language"));
        assert!(json.contains("autoStart"));
        assert!(json.contains("minimizeToTray"));
        assert!(json.contains("syncFolders"));
        assert!(json.contains("webdavServers"));

        // 确保没有蛇形命名的字段
        assert!(!json.contains("auto_start"));
        assert!(!json.contains("minimize_to_tray"));
        assert!(!json.contains("sync_folders"));
        assert!(!json.contains("webdav_servers"));
    }

    #[test]
    fn test_config_serialization() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config.language, deserialized.language);
    }
}

