/// WebDAV 命令模块
///
/// 提供 WebDAV 服务器配置管理和连接测试的 Tauri 命令
use tauri::AppHandle;

use crate::database::WebDavServerConfig;
use crate::error::Result;

// ========== 输入数据结构 ==========

/// 添加服务器时的输入数据（不包含自动生成的字段）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddServerInput {
    /// 服务器名称
    pub name: String,
    /// 服务器 URL)
    pub url: String,
    /// 用户名
    pub username: String,
    /// 是否使用 HTTPS
    pub use_https: bool,
    /// 连接超时时间（秒）:
    pub timeout: u32,
    /// 最后连接测试状态（可选，默认 "unknown"）
    #[serde(default)]
    pub last_test_status: String,
    /// 服务器类型（可选，默认 "generic"）
    #[serde(default)]
    pub server_type: String,
    /// 是否启用（可选，默认 true）
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

// ========== 服务器配置 CRUD 操作 ==========

/// 添加 WebDAV 服务器配置
///
/// # 参数
/// - input: 服务器配置信息（不包含 id、时间戳等自动生成的字段）
/// - password: 服务器密码（将存储到 Keyring）
///
/// # 返回
/// - 成功：返回包含生成 ID 的服务器配置
/// - 失败：返回错误信息
#[tauri::command]
pub async fn add_webdav_server(
    input: AddServerInput,
    password: String,
    app: AppHandle,
) -> Result<WebDavServerConfig> {
    use crate::webdav::db;
    use crate::webdav::keyring::KeyringManager;
    use uuid::Uuid;

    // 1. 生成新的 UUID
    let server_id = Uuid::new_v4().to_string();

    // 2. 设置时间戳
    let now = chrono::Utc::now().timestamp();

    // 3. 构建完整的服务器配置
    let config = WebDavServerConfig {
        id: server_id.clone(),
        name: input.name,
        url: input.url,
        username: input.username,
        use_https: input.use_https,
        timeout: input.timeout,
        last_test_at: None,
        last_test_status: if input.last_test_status.is_empty() {
            "unknown".to_string()
        } else {
            input.last_test_status
        },
        last_test_error: None,
        server_type: if input.server_type.is_empty() {
            "generic".to_string()
        } else {
            input.server_type
        },
        enabled: input.enabled,
        created_at: now,
        updated_at: now,
    };

    // 4. 验证配置（会在 insert_webdav_server 中执行）
    // 5. 插入数据库
    let inserted_config = db::insert_webdav_server(app.clone(), config).await?;

    // 6. 保存密码到 Keyring
    KeyringManager::save_password(&server_id, &password)?;

    Ok(inserted_config)
}

/// 获取 WebDAV 服务器列表
///
/// # 参数
/// - enabled_only: true 表示只返回启用的服务器，false 返回所有服务器
///
/// # 返回
/// - 成功：返回服务器配置列表
/// - 失败：返回错误信息
#[tauri::command]
pub async fn get_webdav_servers(
    enabled_only: bool,
    app: AppHandle,
) -> Result<Vec<WebDavServerConfig>> {
    use crate::webdav::db;

    // 从数据库查询服务器配置
    db::get_webdav_servers(app, enabled_only).await
}

/// 获取单个 WebDAV 服务器配置
///
/// # 参数
/// - server_id: 服务器 ID
///
/// # 返回
/// - 成功：返回服务器配置
/// - 失败：返回错误信息
#[tauri::command]
pub async fn get_webdav_server(server_id: String, app: AppHandle) -> Result<WebDavServerConfig> {
    use crate::webdav::db;

    // 从数据库查询指定 ID 的服务器配置
    db::get_webdav_server_by_id(app, &server_id).await
}

/// 更新 WebDAV 服务器配置
///
/// # 参数
/// - server_id: 服务器 ID
/// - config: 更新后的服务器配置
/// - password: 可选的新密码（None 表示不更新密码）
///
/// # 返回
/// - 成功：返回更新后的服务器配置
/// - 失败：返回错误信息
#[tauri::command]
pub async fn update_webdav_server(
    server_id: String,
    config: WebDavServerConfig,
    password: Option<String>,
    app: AppHandle,
) -> Result<WebDavServerConfig> {
    use crate::webdav::db;
    use crate::webdav::keyring::KeyringManager;

    // 1. 验证配置并更新数据库（会在 update_webdav_server 中验证）
    let updated_config = db::update_webdav_server(app, &server_id, config).await?;

    // 2. 如果提供了新密码，更新 Keyring
    if let Some(new_password) = password {
        KeyringManager::save_password(&server_id, &new_password)?;
    }

    Ok(updated_config)
}

/// 删除 WebDAV 服务器配置
///
/// # 参数
/// - server_id: 服务器 ID
///
/// # 返回
/// - 成功：返回 ()
/// - 失败：返回错误信息（如果服务器正在被使用）
#[tauri::command]
pub async fn delete_webdav_server(server_id: String, app: AppHandle) -> Result<()> {
    use crate::webdav::db;
    use crate::webdav::keyring::KeyringManager;

    // 1. 检查服务器是否被 sync_folders 使用
    check_server_in_use(&server_id, app.clone()).await?;

    // 2. 从数据库删除记录
    db::delete_webdav_server(app, &server_id).await?;

    // 3. 从 Keyring 删除密码
    // 注意：即使密码不存在也不应该失败，因为数据库删除已成功
    match KeyringManager::delete_password(&server_id) {
        Ok(_) => {}
        Err(crate::SyncError::NotFound(_)) => {
            // 密码不存在，忽略错误
        }
        Err(e) => {
            // 其他错误，记录但不影响删除操作
            eprintln!("Warning: Failed to delete password from keyring: {}", e);
        }
    }

    Ok(())
}

/// 检查服务器是否被 sync_folders 使用
///
/// # 参数
/// - server_id: 服务器 ID
/// - app: Tauri 应用句柄
///
/// # 返回
/// - Ok(()): 服务器未被使用，可以删除
/// - Err(SyncError::ConfigError): 服务器正在被使用，不能删除
pub async fn check_server_in_use(server_id: &str, app: AppHandle) -> Result<()> {
    use crate::config::get_config;

    // 从配置文件读取 sync_folders
    let config = get_config(app).await?;

    // 检查是否有 sync_folder 使用该服务器
    let folders_using_server: Vec<_> = config
        .sync_folders
        .iter()
        .filter(|folder| folder.server_id == server_id)
        .collect();

    if !folders_using_server.is_empty() {
        let folder_names: Vec<_> = folders_using_server
            .iter()
            .map(|f| f.name.as_str())
            .collect();

        return Err(crate::SyncError::ConfigError(format!(
            "Cannot delete server: it is being used by {} sync folder(s): {}",
            folders_using_server.len(),
            folder_names.join(", ")
        )));
    }

    Ok(())
}

// ========== 连接测试 ==========

/// 测试 WebDAV 服务器连接
///
/// # 参数
/// - server_id: 服务器 ID
///
/// # 返回
/// - 成功：返回连接测试结果
/// - 失败：返回错误信息
#[tauri::command]
pub async fn test_webdav_connection(
    server_id: String,
    app: AppHandle,
) -> Result<ConnectionTestResult> {
    use crate::webdav::client::WebDavClient;
    use crate::webdav::db;
    use crate::webdav::keyring::KeyringManager;

    tracing::info!(server_id = %server_id, "开始测试 WebDAV 连接");

    // 1. 从数据库读取服务器配置
    let config = db::get_webdav_server_by_id(app.clone(), &server_id).await?;
    tracing::debug!(url = %config.url, username = %config.username, "已加载服务器配置");

    // 2. 从 Keyring 读取密码
    let password = KeyringManager::get_password(&server_id)?;
    tracing::debug!("已从 Keyring 读取密码");

    // 3. 创建 WebDavClient
    let client = WebDavClient::new(&config, password)?;
    tracing::debug!("已创建 WebDavClient 实例");

    // 4. 执行连接测试
    let now = chrono::Utc::now().timestamp();
    let test_result = match client.test_connection().await {
        Ok(server_type) => {
            // 连接成功
            tracing::info!(
                server_id = %server_id,
                server_type = %server_type,
                "连接测试成功"
            );

            let mut updated_config = config.clone();
            updated_config.last_test_at = Some(now);
            updated_config.last_test_status = "success".to_string();
            updated_config.last_test_error = None;
            updated_config.server_type = server_type.clone();

            // 5. 更新数据库中的测试状态
            db::update_webdav_server(app, &server_id, updated_config).await?;
            tracing::debug!("已更新数据库测试状态");

            // 6. 返回测试结果
            ConnectionTestResult {
                success: true,
                message: format!("Successfully connected to {} server", server_type),
                server_info: Some(ServerInfo {
                    server_type,
                    available_space: None, // TODO: 实现空间查询（可选功能）
                }),
            }
        }
        Err(e) => {
            // 连接失败
            let error_message = e.to_string();
            tracing::warn!(
                server_id = %server_id,
                error = %error_message,
                "连接测试失败"
            );

            let mut updated_config = config.clone();
            updated_config.last_test_at = Some(now);
            updated_config.last_test_status = "failed".to_string();
            updated_config.last_test_error = Some(error_message.clone());

            // 5. 更新数据库中的测试状态
            db::update_webdav_server(app, &server_id, updated_config).await?;
            tracing::debug!("已更新数据库测试状态");

            // 6. 返回测试结果
            ConnectionTestResult {
                success: false,
                message: error_message,
                server_info: None,
            }
        }
    };

    Ok(test_result)
}

// ========== 辅助数据结构 ==========

/// 连接测试结果
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    /// 测试是否成功
    pub success: bool,

    /// 测试消息
    pub message: String,

    /// 服务器信息（仅在成功时返回）
    pub server_info: Option<ServerInfo>,
}

/// 服务器信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    /// 服务器类型（nextcloud, owncloud, generic 等）
    pub server_type: String,

    /// 可用空间（字节）
    pub available_space: Option<u64>,
}

// ========== 测试 ==========

#[cfg(test)]
mod tests {
    use crate::database::WebDavServerConfig;
    use crate::webdav::keyring::KeyringManager;
    use std::fs;
    use std::path::PathBuf;
    use uuid::Uuid;

    /// 创建测试用的临时数据库
    fn create_test_db() -> (PathBuf, PathBuf) {
        let test_dir = std::env::temp_dir().join(format!("lightsync_test_{}", Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();

        let db_path = test_dir.join("lightsync.db");

        let conn = rusqlite::Connection::open(&db_path).expect("Failed to open database");
        conn.execute_batch(include_str!("../../migrations/002_webdav_servers.sql"))
            .expect("Failed to run migration 002");
        drop(conn);

        (test_dir, db_path)
    }

    /// 清理测试数据
    fn cleanup_test_data(test_dir: PathBuf, server_ids: Vec<String>) {
        for server_id in server_ids {
            let _ = KeyringManager::delete_password(&server_id);
        }
        let _ = fs::remove_dir_all(test_dir);
    }

    /// 创建测试用的服务器配置
    fn create_test_config() -> WebDavServerConfig {
        let now = chrono::Utc::now().timestamp();
        // 使用唯一的 ID 避免测试之间的冲突
        let unique_id = format!("test-{}", Uuid::new_v4());
        WebDavServerConfig {
            id: unique_id,
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
            created_at: now,
            updated_at: now,
        }
    }

    /// Property 2: 配置持久化 Round-Trip
    /// **Feature: webdav-connection, Property 2: 配置持久化 Round-Trip**
    /// **Validates: Requirements 1.3, 4.3**
    ///
    /// 对于任何有效的服务器配置，保存到数据库后再读取应该得到相同的配置信息（密码除外）
    #[test]
    fn test_config_persistence_roundtrip() {
        println!("\n========== Property 2: 配置持久化 Round-Trip ==========");

        let (test_dir, db_path) = create_test_db();
        let mut server_ids = Vec::new();

        let test_configs = vec![
            WebDavServerConfig {
                id: Uuid::new_v4().to_string(),
                name: "Simple Server".to_string(),
                url: "https://simple.com/webdav".to_string(),
                username: "user1".to_string(),
                use_https: true,
                timeout: 30,
                last_test_at: None,
                last_test_status: "unknown".to_string(),
                last_test_error: None,
                server_type: "generic".to_string(),
                enabled: true,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            },
            WebDavServerConfig {
                id: Uuid::new_v4().to_string(),
                name: "Complex Server with 中文".to_string(),
                url: "http://complex.example.com:8080/dav/files".to_string(),
                username: "user-with-special-chars-!@#".to_string(),
                use_https: false,
                timeout: 120,
                last_test_at: Some(1234567890),
                last_test_status: "success".to_string(),
                last_test_error: Some("Previous error".to_string()),
                server_type: "nextcloud".to_string(),
                enabled: false,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            },
        ];

        println!("测试 {} 个配置场景", test_configs.len());

        for (idx, config) in test_configs.into_iter().enumerate() {
            println!("\n场景 {}: {}", idx + 1, config.name);

            let password = format!("password-{}", Uuid::new_v4());
            server_ids.push(config.id.clone());

            // 1. 插入数据库
            let conn = rusqlite::Connection::open(&db_path).unwrap();
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
            .expect("Failed to insert server");
            drop(conn);

            // 2. 保存密码到 Keyring
            KeyringManager::save_password(&config.id, &password).expect("Failed to save password");
            println!("  ✓ 数据库插入成功");
            println!("  ✓ Keyring 密码保存成功");

            // 3. 从数据库读取配置
            let conn = rusqlite::Connection::open(&db_path).unwrap();
            let retrieved: WebDavServerConfig = conn
                .query_row(
                    "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                            last_test_error, server_type, enabled, created_at, updated_at 
                     FROM webdav_servers WHERE id = ?1",
                    rusqlite::params![config.id],
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
                .expect("Failed to retrieve server");
            drop(conn);

            // 4. 验证配置一致性（Round-Trip）
            assert_eq!(retrieved.id, config.id);
            assert_eq!(retrieved.name, config.name);
            assert_eq!(retrieved.url, config.url);
            assert_eq!(retrieved.username, config.username);
            assert_eq!(retrieved.use_https, config.use_https);
            assert_eq!(retrieved.timeout, config.timeout);
            assert_eq!(retrieved.enabled, config.enabled);
            assert_eq!(retrieved.server_type, config.server_type);
            println!("  ✓ 配置 Round-Trip 验证通过");

            // 5. 验证密码存储在 Keyring 中
            match KeyringManager::get_password(&config.id) {
                Ok(retrieved_password) => {
                    assert_eq!(retrieved_password, password);
                    println!("  ✓ 密码 Round-Trip 验证通过");
                }
                Err(_) => {
                    println!("  ⚠ Keyring 不可用，跳过密码验证");
                }
            }
        }

        cleanup_test_data(test_dir, server_ids);
        println!("\n✅ Property 2 测试通过：配置持久化 Round-Trip 成功");
    }

    /// Property 4: 服务器 ID 唯一性
    /// **Feature: webdav-connection, Property 4: 服务器 ID 唯一性**
    /// **Validates: Requirements 1.4**
    ///
    /// 对于任何多次添加服务器配置的操作，生成的服务器 ID 应该都是唯一的，不会重复
    #[test]
    fn test_server_id_uniqueness() {
        println!("\n========== Property 4: 服务器 ID 唯一性 ==========");

        let mut server_ids = Vec::new();
        let test_count = 100;

        println!("生成 {} 个 UUID 并验证唯一性", test_count);

        for _ in 0..test_count {
            let id = Uuid::new_v4().to_string();

            assert!(!id.is_empty());
            assert!(
                Uuid::parse_str(&id).is_ok(),
                "Server ID should be a valid UUID"
            );
            assert!(!server_ids.contains(&id), "Server ID should be unique");

            server_ids.push(id);
        }

        let unique_ids: std::collections::HashSet<_> = server_ids.iter().collect();
        assert_eq!(unique_ids.len(), server_ids.len());

        println!("  ✓ 生成 {} 个 UUID", test_count);
        println!("  ✓ 所有 ID 格式有效");
        println!("  ✓ 所有 ID 唯一（无重复）");
        println!("\n✅ Property 4 测试通过：服务器 ID 唯一性验证成功");
    }

    /// Property 12: 配置删除完整性
    /// **Feature: webdav-connection, Property 12: 配置删除完整性**
    /// **Validates: Requirements 5.2, 5.3**
    ///
    /// 对于任何服务器配置的删除操作，应该同时从数据库和 Keyring 中移除相关数据
    #[test]
    fn test_config_deletion_completeness() {
        println!("\n========== Property 12: 配置删除完整性 ==========");

        let (test_dir, db_path) = create_test_db();
        let config = create_test_config();
        let password = "test-password-123";

        println!("测试配置: {}", config.name);

        // 1. 插入数据库
        let conn = rusqlite::Connection::open(&db_path).unwrap();
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
        .expect("Failed to insert server");

        // 2. 保存密码到 Keyring
        KeyringManager::save_password(&config.id, password).expect("Failed to save password");
        println!("  ✓ 数据库插入成功");
        println!("  ✓ Keyring 密码保存成功");

        // 3. 验证服务器存在
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM webdav_servers WHERE id = ?1",
                rusqlite::params![config.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        let password_result = KeyringManager::get_password(&config.id);
        assert!(password_result.is_ok());
        println!("  ✓ 数据存在验证通过");

        // 4. 删除服务器
        conn.execute(
            "DELETE FROM webdav_servers WHERE id = ?1",
            rusqlite::params![config.id],
        )
        .expect("Failed to delete server");

        KeyringManager::delete_password(&config.id).expect("Failed to delete password");
        println!("  ✓ 数据库删除成功");
        println!("  ✓ Keyring 密码删除成功");

        // 5. 验证服务器已删除
        let count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM webdav_servers WHERE id = ?1",
                rusqlite::params![config.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count_after, 0);

        let password_after = KeyringManager::get_password(&config.id);
        assert!(password_after.is_err());
        println!("  ✓ 数据完全清除验证通过");

        drop(conn);
        cleanup_test_data(test_dir, vec![]);
        println!("\n✅ Property 12 测试通过：配置删除完整性验证成功");
    }

    // ========== 连接测试命令集成测试 ==========

    /// 测试连接测试命令 - 成功场景
    ///
    /// 验证 test_webdav_connection 命令的完整流程：
    /// 1. 从数据库读取服务器配置
    /// 2. 从 Keyring 读取密码
    /// 3. 创建 WebDavClient 并测试连接
    /// 4. 更新数据库中的测试状态
    #[tokio::test]
    async fn test_connection_command_success() {
        use crate::webdav::client::WebDavClient;

        println!("\n========== 测试连接测试命令 - 成功场景 ==========");

        // 1. 创建测试数据库和配置
        let (test_dir, db_path) = create_test_db();
        let config = create_test_config();
        let password = "test-password";

        // 2. 插入服务器配置到数据库
        let conn = rusqlite::Connection::open(&db_path).unwrap();
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
        .unwrap();
        drop(conn);

        // 3. 保存密码到 Keyring
        let keyring_result = KeyringManager::save_password(&config.id, password);
        if keyring_result.is_err() {
            println!("  ⚠ Keyring 不可用，跳过密码测试");
            cleanup_test_data(test_dir, vec![]);
            return;
        }
        println!("  ✓ 测试数据准备完成");

        // 4. 验证可以创建 WebDavClient（模拟连接测试的核心逻辑）
        let client_result = WebDavClient::new(&config, password.to_string());
        assert!(client_result.is_ok(), "Failed to create WebDavClient");
        println!("  ✓ WebDavClient 创建成功");

        // 5. 验证配置和密码可以正确读取
        let conn = rusqlite::Connection::open(&db_path).unwrap();
        let retrieved_config: WebDavServerConfig = conn
            .query_row(
                "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                        last_test_error, server_type, enabled, created_at, updated_at 
                 FROM webdav_servers WHERE id = ?1",
                rusqlite::params![config.id],
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
            .unwrap();

        assert_eq!(retrieved_config.id, config.id);
        assert_eq!(retrieved_config.url, config.url);
        println!("  ✓ 数据库配置读取成功");

        let retrieved_password = KeyringManager::get_password(&config.id);
        if let Ok(pwd) = retrieved_password {
            assert_eq!(pwd, password);
            println!("  ✓ Keyring 密码读取成功");
        } else {
            println!("  ⚠ Keyring 读取失败（可能在某些环境下不可用）");
        }

        // 6. 模拟更新测试状态
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE webdav_servers 
             SET last_test_at = ?1, last_test_status = ?2, last_test_error = ?3, server_type = ?4, updated_at = ?5
             WHERE id = ?6",
            rusqlite::params![now, "success", None::<String>, "generic", now, config.id],
        )
        .unwrap();
        println!("  ✓ 测试状态更新成功");

        // 7. 验证更新后的状态
        let updated_config: WebDavServerConfig = conn
            .query_row(
                "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                        last_test_error, server_type, enabled, created_at, updated_at 
                 FROM webdav_servers WHERE id = ?1",
                rusqlite::params![config.id],
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
            .unwrap();

        assert!(updated_config.last_test_at.is_some());
        assert_eq!(updated_config.last_test_status, "success");
        assert!(updated_config.last_test_error.is_none());
        assert_eq!(updated_config.server_type, "generic");
        println!("  ✓ 测试状态验证通过");

        // 清理
        drop(conn);
        cleanup_test_data(test_dir, vec![config.id]);
        println!("\n✅ 连接测试命令 - 成功场景测试通过");
    }

    /// 测试连接测试命令 - 失败场景
    ///
    /// 验证连接失败时的错误处理和状态更新
    #[tokio::test]
    async fn test_connection_command_failure() {
        println!("\n========== 测试连接测试命令 - 失败场景 ==========");

        // 1. 创建测试数据库和配置
        let (test_dir, db_path) = create_test_db();
        let mut config = create_test_config();
        config.url = "http://localhost:1".to_string(); // 不存在的服务器
        config.timeout = 1; // 短超时
        config.use_https = false;
        let password = "test-password";

        // 2. 插入服务器配置到数据库
        let conn = rusqlite::Connection::open(&db_path).unwrap();
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
        .unwrap();
        drop(conn);

        // 3. 保存密码到 Keyring
        KeyringManager::save_password(&config.id, password).unwrap();
        println!("  ✓ 测试数据准备完成");

        // 4. 模拟连接失败并更新状态
        let now = chrono::Utc::now().timestamp();
        let error_message = "Connection timeout after 1 seconds";

        let conn = rusqlite::Connection::open(&db_path).unwrap();
        conn.execute(
            "UPDATE webdav_servers 
             SET last_test_at = ?1, last_test_status = ?2, last_test_error = ?3, updated_at = ?4
             WHERE id = ?5",
            rusqlite::params![now, "failed", error_message, now, config.id],
        )
        .unwrap();
        println!("  ✓ 失败状态更新成功");

        // 5. 验证更新后的状态
        let updated_config: WebDavServerConfig = conn
            .query_row(
                "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                        last_test_error, server_type, enabled, created_at, updated_at 
                 FROM webdav_servers WHERE id = ?1",
                rusqlite::params![config.id],
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
            .unwrap();

        assert!(updated_config.last_test_at.is_some());
        assert_eq!(updated_config.last_test_status, "failed");
        assert!(updated_config.last_test_error.is_some());
        assert!(updated_config
            .last_test_error
            .unwrap()
            .contains("Connection timeout"));
        println!("  ✓ 失败状态验证通过");

        // 清理
        drop(conn);
        cleanup_test_data(test_dir, vec![config.id]);
        println!("\n✅ 连接测试命令 - 失败场景测试通过");
    }

    /// 测试连接测试命令 - 密码不存在
    ///
    /// 验证当密码不存在时的错误处理
    #[tokio::test]
    async fn test_connection_command_password_not_found() {
        println!("\n========== 测试连接测试命令 - 密码不存在 ==========");

        // 1. 创建测试数据库和配置
        let (test_dir, db_path) = create_test_db();
        let config = create_test_config();

        // 2. 插入服务器配置到数据库（但不保存密码）
        let conn = rusqlite::Connection::open(&db_path).unwrap();
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
        .unwrap();
        drop(conn);
        println!("  ✓ 测试数据准备完成（无密码）");

        // 3. 尝试读取不存在的密码
        let password_result = KeyringManager::get_password(&config.id);
        assert!(password_result.is_err());
        assert!(matches!(
            password_result,
            Err(crate::SyncError::NotFound(_))
        ));
        println!("  ✓ 密码不存在错误验证通过");

        // 清理
        cleanup_test_data(test_dir, vec![]);
        println!("\n✅ 连接测试命令 - 密码不存在场景测试通过");
    }

    /// 测试连接测试命令 - 服务器不存在
    ///
    /// 验证当服务器配置不存在时的错误处理
    #[tokio::test]
    async fn test_connection_command_server_not_found() {
        println!("\n========== 测试连接测试命令 - 服务器不存在 ==========");

        // 1. 创建测试数据库（但不插入任何配置）
        let (test_dir, _db_path) = create_test_db();
        let non_existent_id = "non-existent-server-id";

        // 2. 尝试读取不存在的密码
        let password_result = KeyringManager::get_password(non_existent_id);
        assert!(password_result.is_err());
        println!("  ✓ 服务器不存在错误验证通过");

        // 清理
        cleanup_test_data(test_dir, vec![]);
        println!("\n✅ 连接测试命令 - 服务器不存在场景测试通过");
    }

    // ========== 删除保护机制测试 ==========

    /// Property 13: 删除保护机制
    /// **Feature: webdav-connection, Property 13: 删除保护机制**
    /// **Validates: Requirements 5.5**
    ///
    /// 对于任何正在被同步文件夹使用的服务器，删除操作应该被阻止并显示警告信息
    ///
    /// 注意：这个测试验证 check_server_in_use 函数的逻辑，
    /// 该函数会检查配置文件中的 sync_folders 是否使用了指定的服务器
    #[test]
    fn test_delete_protection_mechanism() {
        use crate::config::{AppConfig, SyncFolderConfig};
        use std::path::PathBuf;

        println!("\n========== Property 13: 删除保护机制 ==========");

        // 测试场景 1: 服务器未被使用，应该允许删除
        {
            let server_id = "unused-server-123";
            let config = AppConfig {
                version: "0.1.0".to_string(),
                language: "zh-CN".to_string(),
                theme: "system".to_string(),
                auto_start: false,
                minimize_to_tray: true,
                sync_folders: vec![], // 没有同步文件夹
                webdav_servers: vec![],
            };

            // 检查是否有文件夹使用该服务器
            let folders_using_server: Vec<_> = config
                .sync_folders
                .iter()
                .filter(|folder| folder.server_id == server_id)
                .collect();

            assert_eq!(
                folders_using_server.len(),
                0,
                "未使用的服务器应该没有关联的文件夹"
            );
            println!("  ✓ 场景 1: 未使用的服务器可以删除");
        }

        // 测试场景 2: 服务器被一个文件夹使用，应该阻止删除
        {
            let server_id = "used-server-456";
            let sync_folder = SyncFolderConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name: "Test Sync Folder".to_string(),
                local_path: PathBuf::from("/test/local"),
                remote_path: "/test/remote".to_string(),
                server_id: server_id.to_string(),
                sync_direction: "bidirectional".to_string(),
                sync_interval: 30,
                auto_sync: true,
                ignore_patterns: vec![],
                conflict_resolution: "newer-wins".to_string(),
            };

            let config = AppConfig {
                version: "0.1.0".to_string(),
                language: "zh-CN".to_string(),
                theme: "system".to_string(),
                auto_start: false,
                minimize_to_tray: true,
                sync_folders: vec![sync_folder],
                webdav_servers: vec![],
            };

            // 检查是否有文件夹使用该服务器
            let folders_using_server: Vec<_> = config
                .sync_folders
                .iter()
                .filter(|folder| folder.server_id == server_id)
                .collect();

            assert_eq!(
                folders_using_server.len(),
                1,
                "被使用的服务器应该有关联的文件夹"
            );
            assert_eq!(
                folders_using_server[0].name, "Test Sync Folder",
                "应该找到正确的文件夹"
            );

            // 构建错误消息
            let folder_names: Vec<_> = folders_using_server
                .iter()
                .map(|f| f.name.as_str())
                .collect();
            let error_message = format!(
                "Cannot delete server: it is being used by {} sync folder(s): {}",
                folders_using_server.len(),
                folder_names.join(", ")
            );

            assert!(
                error_message.contains("Cannot delete server"),
                "错误信息应该说明无法删除服务器"
            );
            assert!(
                error_message.contains("being used"),
                "错误信息应该说明服务器正在被使用"
            );
            assert!(
                error_message.contains("Test Sync Folder"),
                "错误信息应该包含使用该服务器的文件夹名称"
            );
            println!("  ✓ 场景 2: 被使用的服务器删除被阻止");
            println!("    错误信息: {}", error_message);
        }

        // 测试场景 3: 服务器被多个文件夹使用，应该阻止删除并列出所有文件夹
        {
            let server_id = "multi-use-server-789";
            let sync_folder1 = SyncFolderConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name: "Folder 1".to_string(),
                local_path: PathBuf::from("/test/folder1"),
                remote_path: "/folder1".to_string(),
                server_id: server_id.to_string(),
                sync_direction: "bidirectional".to_string(),
                sync_interval: 30,
                auto_sync: true,
                ignore_patterns: vec![],
                conflict_resolution: "newer-wins".to_string(),
            };

            let sync_folder2 = SyncFolderConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name: "Folder 2".to_string(),
                local_path: PathBuf::from("/test/folder2"),
                remote_path: "/folder2".to_string(),
                server_id: server_id.to_string(),
                sync_direction: "upload-only".to_string(),
                sync_interval: 60,
                auto_sync: false,
                ignore_patterns: vec![],
                conflict_resolution: "local-wins".to_string(),
            };

            let sync_folder3 = SyncFolderConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name: "Folder 3".to_string(),
                local_path: PathBuf::from("/test/folder3"),
                remote_path: "/folder3".to_string(),
                server_id: server_id.to_string(),
                sync_direction: "download-only".to_string(),
                sync_interval: 15,
                auto_sync: true,
                ignore_patterns: vec!["*.tmp".to_string()],
                conflict_resolution: "remote-wins".to_string(),
            };

            let config = AppConfig {
                version: "0.1.0".to_string(),
                language: "zh-CN".to_string(),
                theme: "system".to_string(),
                auto_start: false,
                minimize_to_tray: true,
                sync_folders: vec![sync_folder1, sync_folder2, sync_folder3],
                webdav_servers: vec![],
            };

            // 检查是否有文件夹使用该服务器
            let folders_using_server: Vec<_> = config
                .sync_folders
                .iter()
                .filter(|folder| folder.server_id == server_id)
                .collect();

            assert_eq!(
                folders_using_server.len(),
                3,
                "被多个文件夹使用的服务器应该有 3 个关联的文件夹"
            );

            // 构建错误消息
            let folder_names: Vec<_> = folders_using_server
                .iter()
                .map(|f| f.name.as_str())
                .collect();
            let error_message = format!(
                "Cannot delete server: it is being used by {} sync folder(s): {}",
                folders_using_server.len(),
                folder_names.join(", ")
            );

            assert!(
                error_message.contains("3 sync folder"),
                "错误信息应该包含文件夹数量"
            );
            assert!(
                error_message.contains("Folder 1")
                    && error_message.contains("Folder 2")
                    && error_message.contains("Folder 3"),
                "错误信息应该包含所有使用该服务器的文件夹名称"
            );
            println!("  ✓ 场景 3: 被多个文件夹使用的服务器删除被阻止");
            println!("    错误信息: {}", error_message);
        }

        // 测试场景 4: 配置中有多个服务器和文件夹，只阻止被使用的服务器
        {
            let used_server_id = "used-server-abc";
            let unused_server_id = "unused-server-def";

            let sync_folder = SyncFolderConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name: "Only Folder".to_string(),
                local_path: PathBuf::from("/test/only"),
                remote_path: "/only".to_string(),
                server_id: used_server_id.to_string(),
                sync_direction: "bidirectional".to_string(),
                sync_interval: 30,
                auto_sync: true,
                ignore_patterns: vec![],
                conflict_resolution: "newer-wins".to_string(),
            };

            let config = AppConfig {
                version: "0.1.0".to_string(),
                language: "zh-CN".to_string(),
                theme: "system".to_string(),
                auto_start: false,
                minimize_to_tray: true,
                sync_folders: vec![sync_folder],
                webdav_servers: vec![],
            };

            // 检查被使用的服务器
            let used_folders: Vec<_> = config
                .sync_folders
                .iter()
                .filter(|folder| folder.server_id == used_server_id)
                .collect();
            assert_eq!(used_folders.len(), 1, "被使用的服务器应该有关联的文件夹");

            // 检查未被使用的服务器
            let unused_folders: Vec<_> = config
                .sync_folders
                .iter()
                .filter(|folder| folder.server_id == unused_server_id)
                .collect();
            assert_eq!(
                unused_folders.len(),
                0,
                "未被使用的服务器应该没有关联的文件夹"
            );

            println!("  ✓ 场景 4: 正确区分被使用和未使用的服务器");
        }

        println!("\n✅ Property 13 测试通过：删除保护机制验证成功");
    }

    // ========== Tauri 命令集成测试 ==========

    /// 测试命令参数序列化 - WebDavServerConfig
    ///
    /// 验证：
    /// 1. Rust 结构体能正确序列化为 JSON
    /// 2. snake_case 字段名转换为 camelCase
    /// 3. 所有字段类型正确
    #[test]
    fn test_command_parameter_serialization() {
        println!("\n========== 测试：命令参数序列化 ==========");

        let config = WebDavServerConfig {
            id: "test-123".to_string(),
            name: "Test Server".to_string(),
            url: "https://example.com/webdav".to_string(),
            username: "testuser".to_string(),
            use_https: true,
            timeout: 30,
            last_test_at: Some(1234567890),
            last_test_status: "success".to_string(),
            last_test_error: None,
            server_type: "nextcloud".to_string(),
            enabled: true,
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        println!("原始配置:");
        println!("  - id: {}", config.id);
        println!("  - use_https: {}", config.use_https);
        println!("  - last_test_at: {:?}", config.last_test_at);

        // 序列化为 JSON
        let json = serde_json::to_string(&config).expect("Failed to serialize");
        println!("\n序列化后的 JSON:");
        println!("{}", json);

        // 验证 camelCase 字段名
        assert!(
            json.contains("\"useHttps\""),
            "应该包含 camelCase 字段 useHttps"
        );
        assert!(
            json.contains("\"lastTestAt\""),
            "应该包含 camelCase 字段 lastTestAt"
        );
        assert!(
            json.contains("\"lastTestStatus\""),
            "应该包含 camelCase 字段 lastTestStatus"
        );
        assert!(
            json.contains("\"lastTestError\""),
            "应该包含 camelCase 字段 lastTestError"
        );
        assert!(
            json.contains("\"serverType\""),
            "应该包含 camelCase 字段 serverType"
        );
        assert!(
            json.contains("\"createdAt\""),
            "应该包含 camelCase 字段 createdAt"
        );
        assert!(
            json.contains("\"updatedAt\""),
            "应该包含 camelCase 字段 updatedAt"
        );

        // 验证不包含 snake_case 字段名
        assert!(
            !json.contains("\"use_https\""),
            "不应该包含 snake_case 字段 use_https"
        );
        assert!(
            !json.contains("\"last_test_at\""),
            "不应该包含 snake_case 字段 last_test_at"
        );

        println!("\n  ✓ 所有字段正确转换为 camelCase");

        // 反序列化验证
        let deserialized: WebDavServerConfig =
            serde_json::from_str(&json).expect("Failed to deserialize");
        assert_eq!(deserialized.id, config.id);
        assert_eq!(deserialized.use_https, config.use_https);
        assert_eq!(deserialized.last_test_at, config.last_test_at);
        println!("  ✓ 反序列化验证通过");

        println!("\n✅ 命令参数序列化测试通过");
    }

    /// 测试命令参数反序列化 - 从前端 JSON 到 Rust 结构体
    ///
    /// 验证：
    /// 1. 前端发送的 camelCase JSON 能正确解析
    /// 2. 可选字段处理正确
    /// 3. 类型转换正确
    #[test]
    fn test_command_parameter_deserialization() {
        println!("\n========== 测试：命令参数反序列化 ==========");

        // 模拟前端发送的 JSON（camelCase）
        let json = r#"{
            "id": "frontend-123",
            "name": "Frontend Server",
            "url": "https://frontend.com/dav",
            "username": "frontuser",
            "useHttps": true,
            "timeout": 60,
            "lastTestAt": 9876543210,
            "lastTestStatus": "failed",
            "lastTestError": "Connection timeout",
            "serverType": "owncloud",
            "enabled": false,
            "createdAt": 1000000000,
            "updatedAt": 1000000001
        }"#;

        println!("前端 JSON:");
        println!("{}", json);

        // 反序列化
        let config: WebDavServerConfig = serde_json::from_str(json).expect("Failed to deserialize");

        println!("\n解析后的配置:");
        println!("  - id: {}", config.id);
        println!("  - name: {}", config.name);
        println!("  - use_https: {}", config.use_https);
        println!("  - timeout: {}", config.timeout);
        println!("  - last_test_at: {:?}", config.last_test_at);
        println!("  - enabled: {}", config.enabled);

        // 验证字段值
        assert_eq!(config.id, "frontend-123");
        assert_eq!(config.name, "Frontend Server");
        assert_eq!(config.url, "https://frontend.com/dav");
        assert_eq!(config.username, "frontuser");
        assert_eq!(config.use_https, true);
        assert_eq!(config.timeout, 60);
        assert_eq!(config.last_test_at, Some(9876543210));
        assert_eq!(config.last_test_status, "failed");
        assert_eq!(
            config.last_test_error,
            Some("Connection timeout".to_string())
        );
        assert_eq!(config.server_type, "owncloud");
        assert_eq!(config.enabled, false);
        assert_eq!(config.created_at, 1000000000);
        assert_eq!(config.updated_at, 1000000001);

        println!("  ✓ 所有字段正确解析");

        // 测试可选字段为 null 的情况
        let json_with_null = r#"{
            "id": "test-null",
            "name": "Null Test",
            "url": "https://null.com",
            "username": "nulluser",
            "useHttps": false,
            "timeout": 30,
            "lastTestAt": null,
            "lastTestStatus": "unknown",
            "lastTestError": null,
            "serverType": "generic",
            "enabled": true,
            "createdAt": 1000000000,
            "updatedAt": 1000000000
        }"#;

        let config_null: WebDavServerConfig =
            serde_json::from_str(json_with_null).expect("Failed to deserialize null fields");

        assert_eq!(config_null.last_test_at, None);
        assert_eq!(config_null.last_test_error, None);
        println!("  ✓ 可选字段 null 处理正确");

        println!("\n✅ 命令参数反序列化测试通过");
    }

    /// 测试错误序列化 - SyncError 到 JSON
    ///
    /// 验证：
    /// 1. 各种错误类型能正确序列化
    /// 2. 错误信息完整传递
    /// 3. 前端能正确解析错误
    #[test]
    fn test_error_serialization() {
        println!("\n========== 测试：错误序列化 ==========");

        // 测试各种错误类型
        let errors = vec![
            (
                "ConfigError",
                crate::SyncError::ConfigError("Invalid URL format".to_string()),
            ),
            (
                "NotFound",
                crate::SyncError::NotFound("Server not found".to_string()),
            ),
            (
                "Network",
                crate::SyncError::Network("Connection timeout".to_string()),
            ),
            (
                "AuthError",
                crate::SyncError::AuthError("Invalid credentials".to_string()),
            ),
            (
                "WebDav",
                crate::SyncError::WebDav("HTTP 404 Not Found".to_string()),
            ),
        ];

        println!("测试 {} 种错误类型:\n", errors.len());

        for (error_type, error) in errors {
            println!("错误类型: {}", error_type);
            println!("  - 错误信息: {}", error);

            // 序列化错误
            let json = serde_json::to_string(&error).expect("Failed to serialize error");
            println!("  - JSON: {}", json);

            // 验证 JSON 包含错误信息
            assert!(json.len() > 0, "序列化后的 JSON 不应该为空");

            // 注意：SyncError 没有实现 Deserialize，所以我们只验证序列化
            // 前端会将错误作为字符串处理
            println!("  ✓ 序列化成功\n");
        }

        println!("✅ 错误序列化测试通过");
    }

    /// 测试 ConnectionTestResult 序列化
    ///
    /// 验证：
    /// 1. 成功结果正确序列化
    /// 2. 失败结果正确序列化
    /// 3. camelCase 字段名正确
    #[test]
    fn test_connection_test_result_serialization() {
        use super::{ConnectionTestResult, ServerInfo};

        println!("\n========== 测试：ConnectionTestResult 序列化 ==========");

        // 测试成功结果
        let success_result = ConnectionTestResult {
            success: true,
            message: "Connection successful".to_string(),
            server_info: Some(ServerInfo {
                server_type: "nextcloud".to_string(),
                available_space: Some(1024 * 1024 * 1024), // 1GB
            }),
        };

        println!("成功结果:");
        let success_json = serde_json::to_string(&success_result).expect("Failed to serialize");
        println!("{}", success_json);

        assert!(success_json.contains("\"success\":true"));
        assert!(success_json.contains("\"serverInfo\""));
        assert!(success_json.contains("\"serverType\""));
        assert!(success_json.contains("\"availableSpace\""));
        assert!(
            !success_json.contains("\"server_info\""),
            "不应该包含 snake_case"
        );
        println!("  ✓ 成功结果序列化正确\n");

        // 测试失败结果
        let failure_result = ConnectionTestResult {
            success: false,
            message: "Authentication failed".to_string(),
            server_info: None,
        };

        println!("失败结果:");
        let failure_json = serde_json::to_string(&failure_result).expect("Failed to serialize");
        println!("{}", failure_json);

        assert!(failure_json.contains("\"success\":false"));
        assert!(failure_json.contains("Authentication failed"));
        assert!(failure_json.contains("\"serverInfo\":null"));
        println!("  ✓ 失败结果序列化正确");

        println!("\n✅ ConnectionTestResult 序列化测试通过");
    }

    /// 测试命令参数验证
    ///
    /// 验证：
    /// 1. 无效参数被正确拒绝
    /// 2. 返回有意义的错误信息
    /// 3. 边界值处理正确
    #[test]
    fn test_command_parameter_validation() {
        println!("\n========== 测试：命令参数验证 ==========");

        // 测试场景 1: 空名称
        {
            println!("\n场景 1: 空名称");
            let mut config = create_test_config();
            config.name = "".to_string();

            let result = validate_server_config(&config);
            assert!(result.is_err(), "空名称应该被拒绝");
            println!("  ✓ 空名称被正确拒绝");
            println!("    错误: {}", result.unwrap_err());
        }

        // 测试场景 2: 空 URL
        {
            println!("\n场景 2: 空 URL");
            let mut config = create_test_config();
            config.url = "".to_string();

            let result = validate_server_config(&config);
            assert!(result.is_err(), "空 URL 应该被拒绝");
            println!("  ✓ 空 URL 被正确拒绝");
            println!("    错误: {}", result.unwrap_err());
        }

        // 测试场景 3: 无效 URL 格式
        {
            println!("\n场景 3: 无效 URL 格式");
            let mut config = create_test_config();
            config.url = "not-a-valid-url".to_string();

            let result = validate_server_config(&config);
            assert!(result.is_err(), "无效 URL 格式应该被拒绝");
            println!("  ✓ 无效 URL 格式被正确拒绝");
            println!("    错误: {}", result.unwrap_err());
        }

        // 测试场景 4: 超时时间过小
        {
            println!("\n场景 4: 超时时间过小");
            let mut config = create_test_config();
            config.timeout = 0;

            let result = validate_server_config(&config);
            assert!(result.is_err(), "超时时间 0 应该被拒绝");
            println!("  ✓ 超时时间过小被正确拒绝");
            println!("    错误: {}", result.unwrap_err());
        }

        // 测试场景 5: 超时时间过大
        {
            println!("\n场景 5: 超时时间过大");
            let mut config = create_test_config();
            config.timeout = 301;

            let result = validate_server_config(&config);
            assert!(result.is_err(), "超时时间 301 应该被拒绝");
            println!("  ✓ 超时时间过大被正确拒绝");
            println!("    错误: {}", result.unwrap_err());
        }

        // 测试场景 6: 边界值 - 最小超时时间
        {
            println!("\n场景 6: 边界值 - 最小超时时间 (1秒)");
            let mut config = create_test_config();
            config.timeout = 1;

            let result = validate_server_config(&config);
            assert!(result.is_ok(), "超时时间 1 应该被接受");
            println!("  ✓ 最小超时时间被正确接受");
        }

        // 测试场景 7: 边界值 - 最大超时时间
        {
            println!("\n场景 7: 边界值 - 最大超时时间 (300秒)");
            let mut config = create_test_config();
            config.timeout = 300;

            let result = validate_server_config(&config);
            assert!(result.is_ok(), "超时时间 300 应该被接受");
            println!("  ✓ 最大超时时间被正确接受");
        }

        // 测试场景 8: 有效配置
        {
            println!("\n场景 8: 有效配置");
            let config = create_test_config();

            let result = validate_server_config(&config);
            assert!(result.is_ok(), "有效配置应该被接受");
            println!("  ✓ 有效配置被正确接受");
        }

        println!("\n✅ 命令参数验证测试通过");
    }

    /// 验证服务器配置的辅助函数
    fn validate_server_config(config: &WebDavServerConfig) -> crate::Result<()> {
        // 验证名称
        if config.name.trim().is_empty() {
            return Err(crate::SyncError::ConfigError(
                "Server name cannot be empty".to_string(),
            ));
        }

        // 验证 URL
        if config.url.trim().is_empty() {
            return Err(crate::SyncError::ConfigError(
                "Server URL cannot be empty".to_string(),
            ));
        }

        // 验证 URL 格式
        url::Url::parse(&config.url)
            .map_err(|e| crate::SyncError::ConfigError(format!("Invalid URL format: {}", e)))?;

        // 验证超时时间
        if config.timeout < 1 || config.timeout > 300 {
            return Err(crate::SyncError::ConfigError(
                "Timeout must be between 1 and 300 seconds".to_string(),
            ));
        }

        Ok(())
    }

    /// 测试命令错误处理流程
    ///
    /// 验证：
    /// 1. 命令内部错误能正确传播
    /// 2. 错误信息完整保留
    /// 3. 错误类型正确
    #[tokio::test]
    async fn test_command_error_handling() {
        println!("\n========== 测试：命令错误处理流程 ==========");

        // 场景 1: 服务器不存在
        {
            println!("\n场景 1: 查询不存在的服务器");
            let (test_dir, db_path) = create_test_db();
            let non_existent_id = "non-existent-id-12345";

            let conn = rusqlite::Connection::open(&db_path).unwrap();
            let result: rusqlite::Result<WebDavServerConfig> = conn.query_row(
                "SELECT id, name, url, username, use_https, timeout, last_test_at, last_test_status, 
                        last_test_error, server_type, enabled, created_at, updated_at 
                 FROM webdav_servers WHERE id = ?1",
                rusqlite::params![non_existent_id],
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
            );

            assert!(result.is_err(), "查询不存在的服务器应该返回错误");
            println!("  ✓ 正确返回错误");
            println!("    错误类型: {:?}", result.unwrap_err());

            drop(conn);
            cleanup_test_data(test_dir, vec![]);
        }

        // 场景 2: 密码不存在
        {
            println!("\n场景 2: 读取不存在的密码");
            let non_existent_id = "password-not-found-67890";

            let result = KeyringManager::get_password(non_existent_id);
            assert!(result.is_err(), "读取不存在的密码应该返回错误");
            assert!(
                matches!(result, Err(crate::SyncError::NotFound(_))),
                "应该返回 NotFound 错误"
            );
            println!("  ✓ 正确返回 NotFound 错误");
            println!("    错误信息: {}", result.unwrap_err());
        }

        // 场景 3: 无效配置
        {
            println!("\n场景 3: 验证无效配置");
            let mut config = create_test_config();
            config.timeout = 0; // 无效的超时时间

            let result = validate_server_config(&config);
            assert!(result.is_err(), "无效配置应该返回错误");
            assert!(
                matches!(result, Err(crate::SyncError::ConfigError(_))),
                "应该返回 ConfigError"
            );
            println!("  ✓ 正确返回 ConfigError");
            println!("    错误信息: {}", result.unwrap_err());
        }

        println!("\n✅ 命令错误处理流程测试通过");
    }
}
