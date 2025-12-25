/// WebDAV 服务器配置数据库操作模块
///
/// 提供对 webdav_servers 表的 CRUD 操作
///
/// 注意: 密码不存储在数据库中，而是存储在系统 Keyring 中
use crate::database::WebDavServerConfig;
use crate::{Result, SyncError};
use tauri::{AppHandle, Manager};

/// 插入新的 WebDAV 服务器配置
///
/// # 参数
/// - app: Tauri 应用句柄
/// - config: 服务器配置（必须包含有效的 id）
///
/// # 返回
/// - Ok(WebDavServerConfig): 插入成功，返回插入的配置
/// - Err(SyncError): 插入失败
///
/// # 验证
/// - 在插入前会调用 config.validate() 验证所有字段
/// - id 必须是唯一的（数据库主键约束）
pub async fn insert_webdav_server(
    app: AppHandle,
    config: WebDavServerConfig,
) -> Result<WebDavServerConfig> {
    // 验证配置
    config
        .validate()
        .map_err(|e| SyncError::ConfigError(format!("Invalid server config: {}", e)))?;

    // 使用 rusqlite 直接操作数据库
    use rusqlite::Connection;

    // 获取数据库路径
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SyncError::DatabaseError(format!("Failed to get app data dir: {}", e)))?;

    let db_path = app_dir.join("lightsync.db");

    // 打开数据库连接
    let conn = Connection::open(&db_path)
        .map_err(|e| SyncError::DatabaseError(format!("Failed to open database: {}", e)))?;

    // 插入数据
    conn.execute(
        "INSERT INTO webdav_servers (
            id, name, url, username, use_https, timeout,
            last_test_at, last_test_status, last_test_error,
            server_type, enabled, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![
            config.id,
            config.name,
            config.url,
            config.username,
            config.use_https as i32,
            config.timeout as i64,
            config.last_test_at,
            config.last_test_status,
            config.last_test_error,
            config.server_type,
            config.enabled as i32,
            config.created_at,
            config.updated_at,
        ],
    )
    .map_err(|e| SyncError::DatabaseError(format!("Failed to insert webdav server: {}", e)))?;

    Ok(config)
}

/// 查询 WebDAV 服务器配置列表
///
/// # 参数
/// - app: Tauri 应用句柄
/// - enabled_only: 是否只返回启用的服务器
///   - true: 只返回 enabled=1 的服务器
///   - false: 返回所有服务器
///
/// # 返回
/// - Ok(Vec<WebDavServerConfig>): 查询成功，返回服务器配置列表
/// - Err(SyncError): 查询失败
pub async fn get_webdav_servers(
    app: AppHandle,
    enabled_only: bool,
) -> Result<Vec<WebDavServerConfig>> {
    use rusqlite::Connection;

    // 获取数据库路径
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SyncError::DatabaseError(format!("Failed to get app data dir: {}", e)))?;

    let db_path = app_dir.join("lightsync.db");

    // 打开数据库连接
    let conn = Connection::open(&db_path)
        .map_err(|e| SyncError::DatabaseError(format!("Failed to open database: {}", e)))?;

    // 构建查询
    let query = if enabled_only {
        "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                last_test_error, server_type, enabled, created_at, updated_at 
         FROM webdav_servers WHERE enabled = 1 ORDER BY created_at DESC"
    } else {
        "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                last_test_error, server_type, enabled, created_at, updated_at 
         FROM webdav_servers ORDER BY created_at DESC"
    };

    // 执行查询
    let mut stmt = conn
        .prepare(query)
        .map_err(|e| SyncError::DatabaseError(format!("Failed to prepare query: {}", e)))?;

    let servers = stmt
        .query_map([], |row| {
            Ok(WebDavServerConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                username: row.get(3)?,
                use_https: row.get::<_, i32>(4)? != 0,
                timeout: row.get::<_, i64>(5)? as u32,
                last_test_at: row.get(6)?,
                last_test_status: row.get(7)?,
                last_test_error: row.get(8)?,
                server_type: row.get(9)?,
                enabled: row.get::<_, i32>(10)? != 0,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| SyncError::DatabaseError(format!("Failed to query webdav servers: {}", e)))?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| SyncError::DatabaseError(format!("Failed to parse query results: {}", e)))?;

    Ok(servers)
}

/// 根据 ID 查询单个 WebDAV 服务器配置
///
/// # 参数
/// - app: Tauri 应用句柄
/// - server_id: 服务器 ID
///
/// # 返回
/// - Ok(WebDavServerConfig): 查询成功，返回服务器配置
/// - Err(SyncError::NotFound): 服务器不存在
/// - Err(SyncError::DatabaseError): 查询失败
pub async fn get_webdav_server_by_id(
    app: AppHandle,
    server_id: &str,
) -> Result<WebDavServerConfig> {
    use rusqlite::Connection;

    // 获取数据库路径
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SyncError::DatabaseError(format!("Failed to get app data dir: {}", e)))?;

    let db_path = app_dir.join("lightsync.db");

    // 打开数据库连接
    let conn = Connection::open(&db_path)
        .map_err(|e| SyncError::DatabaseError(format!("Failed to open database: {}", e)))?;

    // 执行查询
    let query =
        "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                        last_test_error, server_type, enabled, created_at, updated_at 
                 FROM webdav_servers WHERE id = ?1 LIMIT 1";

    let server = conn
        .query_row(query, rusqlite::params![server_id], |row| {
            Ok(WebDavServerConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                username: row.get(3)?,
                use_https: row.get::<_, i32>(4)? != 0,
                timeout: row.get::<_, i64>(5)? as u32,
                last_test_at: row.get(6)?,
                last_test_status: row.get(7)?,
                last_test_error: row.get(8)?,
                server_type: row.get(9)?,
                enabled: row.get::<_, i32>(10)? != 0,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                SyncError::NotFound(format!("WebDAV server not found: {}", server_id))
            }
            _ => SyncError::DatabaseError(format!("Failed to query webdav server: {}", e)),
        })?;

    Ok(server)
}

/// 更新 WebDAV 服务器配置
///
/// # 参数
/// - app: Tauri 应用句柄
/// - server_id: 要更新的服务器 ID
/// - config: 新的服务器配置
///
/// # 返回
/// - Ok(WebDavServerConfig): 更新成功，返回更新后的配置
/// - Err(SyncError::NotFound): 服务器不存在
/// - Err(SyncError): 更新失败
///
/// # 注意
/// - 会自动更新 updated_at 字段为当前时间
/// - 在更新前会调用 config.validate() 验证所有字段
/// - server_id 必须存在于数据库中
pub async fn update_webdav_server(
    app: AppHandle,
    server_id: &str,
    config: WebDavServerConfig,
) -> Result<WebDavServerConfig> {
    // 验证配置
    config
        .validate()
        .map_err(|e| SyncError::ConfigError(format!("Invalid server config: {}", e)))?;

    // 检查服务器是否存在
    get_webdav_server_by_id(app.clone(), server_id).await?;

    use rusqlite::Connection;

    // 获取数据库路径
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SyncError::DatabaseError(format!("Failed to get app data dir: {}", e)))?;

    let db_path = app_dir.join("lightsync.db");

    // 打开数据库连接
    let conn = Connection::open(&db_path)
        .map_err(|e| SyncError::DatabaseError(format!("Failed to open database: {}", e)))?;

    // 更新当前时间
    let now = chrono::Utc::now().timestamp();

    // 执行更新
    conn.execute(
        "UPDATE webdav_servers
         SET name = ?1, url = ?2, username = ?3, use_https = ?4, timeout = ?5,
             last_test_at = ?6, last_test_status = ?7, last_test_error = ?8,
             server_type = ?9, enabled = ?10, updated_at = ?11
         WHERE id = ?12",
        rusqlite::params![
            config.name,
            config.url,
            config.username,
            config.use_https as i32,
            config.timeout as i64,
            config.last_test_at,
            config.last_test_status,
            config.last_test_error,
            config.server_type,
            config.enabled as i32,
            now,
            server_id,
        ],
    )
    .map_err(|e| SyncError::DatabaseError(format!("Failed to update webdav server: {}", e)))?;

    // 返回更新后的配置
    let mut updated_config = config;
    updated_config.updated_at = now;
    Ok(updated_config)
}

/// 删除 WebDAV 服务器配置
///
/// # 参数
/// - app: Tauri 应用句柄
/// - server_id: 要删除的服务器 ID
///
/// # 返回
/// - Ok(()): 删除成功
/// - Err(SyncError::NotFound): 服务器不存在
/// - Err(SyncError): 删除失败
///
/// # 注意
/// - 如果服务器被 sync_folders 使用，删除会失败（外键约束）
/// - 删除服务器后，应该同时删除 Keyring 中的密码
pub async fn delete_webdav_server(app: AppHandle, server_id: &str) -> Result<()> {
    // 检查服务器是否存在
    get_webdav_server_by_id(app.clone(), server_id).await?;

    use rusqlite::Connection;

    // 获取数据库路径
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SyncError::DatabaseError(format!("Failed to get app data dir: {}", e)))?;

    let db_path = app_dir.join("lightsync.db");

    // 打开数据库连接
    let conn = Connection::open(&db_path)
        .map_err(|e| SyncError::DatabaseError(format!("Failed to open database: {}", e)))?;

    // 执行删除
    conn.execute(
        "DELETE FROM webdav_servers WHERE id = ?1",
        rusqlite::params![server_id],
    )
    .map_err(|e| {
        // 检查是否是外键约束错误
        let error_msg = e.to_string();
        if error_msg.contains("FOREIGN KEY constraint failed") || error_msg.contains("foreign key")
        {
            SyncError::ConfigError(
                "Cannot delete server: it is being used by sync folders".to_string(),
            )
        } else {
            SyncError::DatabaseError(format!("Failed to delete webdav server: {}", e))
        }
    })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // 注意: 这些测试需要在 Tauri 应用上下文中运行
    // 实际的集成测试将在 Phase 2 的后续任务中实现

    #[test]
    fn test_module_compiles() {
        // 这个测试只是确保模块可以编译
        assert!(true);
    }
}
