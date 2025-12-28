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
    use std::fs;
    use std::path::PathBuf;
    use uuid::Uuid;

    /// 创建测试用的临时数据库
    fn create_test_db() -> (PathBuf, rusqlite::Connection) {
        // 创建临时测试目录
        let test_dir = std::env::temp_dir().join(format!("lightsync_test_{}", Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();

        let db_path = test_dir.join("lightsync.db");

        // 打开数据库连接
        let conn = rusqlite::Connection::open(&db_path).expect("Failed to open database");

        // 只执行 002 迁移（webdav_servers 表）
        // 注意: 001 迁移使用 MySQL 语法，不兼容 SQLite
        conn.execute_batch(include_str!("../../migrations/002_webdav_servers.sql"))
            .expect("Failed to run migration 002");

        (test_dir, conn)
    }

    /// 清理测试数据
    fn cleanup_test_db(test_dir: PathBuf) {
        let _ = fs::remove_dir_all(test_dir);
    }

    /// 创建测试用的服务器配置
    fn create_test_config(id: &str) -> WebDavServerConfig {
        let now = chrono::Utc::now().timestamp();
        WebDavServerConfig {
            id: id.to_string(),
            name: format!("Test Server {}", id),
            url: "https://example.com/webdav".to_string(),
            username: "testuser".to_string(),
            use_https: true,
            timeout: 30,
            last_test_at: None,
            last_test_status: "unknown".to_string(),
            last_test_error: None,
            server_type: "generic".to_string(),
            enabled: true,
            created_at: now,
            updated_at: now,
        }
    }

    /// 直接插入服务器配置到数据库（用于测试）
    fn insert_server_direct(
        conn: &rusqlite::Connection,
        config: &WebDavServerConfig,
    ) -> rusqlite::Result<()> {
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
        )?;
        Ok(())
    }

    /// 直接从数据库查询服务器配置（用于测试）
    fn get_server_direct(
        conn: &rusqlite::Connection,
        id: &str,
    ) -> rusqlite::Result<WebDavServerConfig> {
        conn.query_row(
            "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                    last_test_error, server_type, enabled, created_at, updated_at 
             FROM webdav_servers WHERE id = ?1",
            rusqlite::params![id],
            |row| {
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
            },
        )
    }

    #[test]
    fn test_insert_server_config() {
        let (test_dir, conn) = create_test_db();

        // 创建测试配置
        let config = create_test_config("test-insert-1");

        // 插入服务器配置
        let result = insert_server_direct(&conn, &config);
        assert!(result.is_ok(), "Failed to insert server: {:?}", result);

        // 验证插入成功
        let fetched = get_server_direct(&conn, &config.id).unwrap();
        assert_eq!(fetched.id, config.id);
        assert_eq!(fetched.name, config.name);
        assert_eq!(fetched.url, config.url);
        assert_eq!(fetched.username, config.username);
        assert_eq!(fetched.use_https, config.use_https);
        assert_eq!(fetched.timeout, config.timeout);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_insert_duplicate_id_fails() {
        let (test_dir, conn) = create_test_db();

        // 创建测试配置
        let config = create_test_config("test-duplicate-1");

        // 第一次插入应该成功
        let result1 = insert_server_direct(&conn, &config);
        assert!(result1.is_ok());

        // 第二次插入相同 ID 应该失败（主键约束）
        let result2 = insert_server_direct(&conn, &config);
        assert!(result2.is_err());

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_query_all_servers() {
        let (test_dir, conn) = create_test_db();

        // 插入多个服务器
        let config1 = create_test_config("test-query-all-1");
        let config2 = create_test_config("test-query-all-2");
        let mut config3 = create_test_config("test-query-all-3");
        config3.enabled = false;

        insert_server_direct(&conn, &config1).unwrap();
        insert_server_direct(&conn, &config2).unwrap();
        insert_server_direct(&conn, &config3).unwrap();

        // 查询所有服务器
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM webdav_servers").unwrap();
        let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(count, 3);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_query_enabled_servers_only() {
        let (test_dir, conn) = create_test_db();

        // 插入多个服务器
        let config1 = create_test_config("test-query-enabled-1");
        let config2 = create_test_config("test-query-enabled-2");
        let mut config3 = create_test_config("test-query-enabled-3");
        config3.enabled = false;

        insert_server_direct(&conn, &config1).unwrap();
        insert_server_direct(&conn, &config2).unwrap();
        insert_server_direct(&conn, &config3).unwrap();

        // 只查询启用的服务器
        let mut stmt = conn
            .prepare("SELECT COUNT(*) FROM webdav_servers WHERE enabled = 1")
            .unwrap();
        let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(count, 2);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_query_server_by_id() {
        let (test_dir, conn) = create_test_db();

        // 插入服务器
        let config = create_test_config("test-query-by-id-1");
        insert_server_direct(&conn, &config).unwrap();

        // 根据 ID 查询
        let fetched = get_server_direct(&conn, &config.id).unwrap();
        assert_eq!(fetched.id, config.id);
        assert_eq!(fetched.name, config.name);
        assert_eq!(fetched.url, config.url);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_query_server_by_id_not_found() {
        let (test_dir, conn) = create_test_db();

        // 查询不存在的服务器
        let result = get_server_direct(&conn, "non-existent-id");
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            rusqlite::Error::QueryReturnedNoRows
        ));

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_update_server_config() {
        let (test_dir, conn) = create_test_db();

        // 插入服务器
        let config = create_test_config("test-update-1");
        insert_server_direct(&conn, &config).unwrap();

        // 更新配置
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE webdav_servers
             SET name = ?1, url = ?2, timeout = ?3, updated_at = ?4
             WHERE id = ?5",
            rusqlite::params![
                "Updated Server Name",
                "https://updated.example.com/webdav",
                60,
                now,
                config.id,
            ],
        )
        .unwrap();

        // 验证更新成功
        let fetched = get_server_direct(&conn, &config.id).unwrap();
        assert_eq!(fetched.name, "Updated Server Name");
        assert_eq!(fetched.url, "https://updated.example.com/webdav");
        assert_eq!(fetched.timeout, 60);
        assert!(fetched.updated_at >= now);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_update_server_not_found() {
        let (test_dir, conn) = create_test_db();

        // 尝试更新不存在的服务器
        let result = conn.execute(
            "UPDATE webdav_servers SET name = ?1 WHERE id = ?2",
            rusqlite::params!["Updated Name", "non-existent-id"],
        );

        assert!(result.is_ok());
        // 更新不存在的记录不会报错，但影响行数为 0
        assert_eq!(result.unwrap(), 0);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_delete_server_config() {
        let (test_dir, conn) = create_test_db();

        // 插入服务器
        let config = create_test_config("test-delete-1");
        insert_server_direct(&conn, &config).unwrap();

        // 删除服务器
        let result = conn.execute(
            "DELETE FROM webdav_servers WHERE id = ?1",
            rusqlite::params![config.id],
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1); // 删除了 1 行

        // 验证服务器已被删除
        let fetch_result = get_server_direct(&conn, &config.id);
        assert!(fetch_result.is_err());

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_delete_server_not_found() {
        let (test_dir, conn) = create_test_db();

        // 尝试删除不存在的服务器
        let result = conn.execute(
            "DELETE FROM webdav_servers WHERE id = ?1",
            rusqlite::params!["non-existent-id"],
        );

        assert!(result.is_ok());
        // 删除不存在的记录不会报错，但影响行数为 0
        assert_eq!(result.unwrap(), 0);

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_crud_operations_sequence() {
        let (test_dir, conn) = create_test_db();

        // 1. 插入
        let config = create_test_config("test-crud-1");
        insert_server_direct(&conn, &config).unwrap();

        // 2. 查询
        let fetched = get_server_direct(&conn, &config.id).unwrap();
        assert_eq!(fetched.id, config.id);
        assert_eq!(fetched.name, config.name);

        // 3. 更新
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE webdav_servers SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params!["Updated Name", now, config.id],
        )
        .unwrap();

        // 4. 验证更新
        let fetched_again = get_server_direct(&conn, &config.id).unwrap();
        assert_eq!(fetched_again.name, "Updated Name");
        assert!(fetched_again.updated_at >= now);

        // 5. 删除
        conn.execute(
            "DELETE FROM webdav_servers WHERE id = ?1",
            rusqlite::params![config.id],
        )
        .unwrap();

        // 6. 验证删除
        let fetch_result = get_server_direct(&conn, &config.id);
        assert!(fetch_result.is_err());

        cleanup_test_db(test_dir);
    }

    #[test]
    fn test_server_config_validation() {
        // 测试配置验证逻辑
        let config = create_test_config("test-validation-1");
        assert!(config.validate().is_ok());

        // 测试无效名称
        let mut invalid_config = config.clone();
        invalid_config.name = "".to_string();
        assert!(invalid_config.validate().is_err());

        // 测试无效 URL
        let mut invalid_config = config.clone();
        invalid_config.url = "invalid-url".to_string();
        assert!(invalid_config.validate().is_err());

        // 测试无效用户名
        let mut invalid_config = config.clone();
        invalid_config.username = "".to_string();
        assert!(invalid_config.validate().is_err());

        // 测试无效超时时间
        let mut invalid_config = config.clone();
        invalid_config.timeout = 0;
        assert!(invalid_config.validate().is_err());

        let mut invalid_config = config.clone();
        invalid_config.timeout = 301;
        assert!(invalid_config.validate().is_err());
    }

    #[test]
    fn test_database_indexes() {
        let (test_dir, conn) = create_test_db();

        // 验证索引是否创建成功
        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='webdav_servers'",
            )
            .unwrap();

        let indexes: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<std::result::Result<Vec<_>, _>>()
            .unwrap();

        // 应该有两个索引
        assert!(indexes.contains(&"idx_webdav_servers_enabled".to_string()));
        assert!(indexes.contains(&"idx_webdav_servers_last_test_status".to_string()));

        cleanup_test_db(test_dir);
    }

    // 注意: 外键约束测试需要等 Phase 5 实现 sync_folders 表后才能测试
    // 届时将添加以下测试:
    // - test_delete_server_with_foreign_key_constraint
    // - test_foreign_key_prevents_deletion
}
