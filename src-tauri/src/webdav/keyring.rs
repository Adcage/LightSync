/// WebDAV 服务器密码管理模块
///
/// 使用系统 Keyring 安全存储和检索 WebDAV 服务器的密码
/// 密码不存储在配置文件或数据库中，而是存储在操作系统级的加密存储中
///
/// # 设计说明
///
/// - 使用 `keyring` crate 与系统 Keyring 交互
/// - 每个服务器的密码使用服务器 ID 作为 key
/// - 服务名称固定为 "LightSync"，便于识别
/// - 处理 keyring 不可用的情况（某些系统或环境）
///
/// # 使用示例
///
/// ```ignore
/// // 保存密码
/// KeyringManager::save_password("server-uuid-1", "my-password")?;
///
/// // 读取密码
/// let password = KeyringManager::get_password("server-uuid-1")?;
///
/// // 删除密码
/// KeyringManager::delete_password("server-uuid-1")?;
/// ```
use crate::{Result, SyncError};

/// WebDAV 服务器密码管理器
///
/// 提供安全的密码存储和检索功能
pub struct KeyringManager;

impl KeyringManager {
    /// Keyring 服务名称
    const SERVICE_NAME: &'static str = "LightSync";

    /// 保存密码到系统 Keyring
    ///
    /// # 参数
    /// - server_id: 服务器唯一标识符（UUID）
    /// - password: 要保存的密码
    ///
    /// # 返回
    /// - Ok(()): 密码保存成功
    /// - Err(SyncError): 保存失败
    ///
    /// # 错误处理
    /// - 如果 Keyring 不可用，返回 ConfigError
    /// - 如果密码为空，返回 ConfigError
    ///
    /// # 注意
    /// - 如果相同的 server_id 已存在密码，会覆盖旧密码
    /// - 密码在系统 Keyring 中使用加密存储
    pub fn save_password(server_id: &str, password: &str) -> Result<()> {
        // 验证输入
        if server_id.trim().is_empty() {
            return Err(SyncError::ConfigError(
                "Server ID cannot be empty".to_string(),
            ));
        }

        if password.is_empty() {
            return Err(SyncError::ConfigError(
                "Password cannot be empty".to_string(),
            ));
        }

        // 创建 Keyring 条目
        let entry = keyring::Entry::new(Self::SERVICE_NAME, server_id).map_err(|e| {
            SyncError::ConfigError(format!("Failed to create keyring entry: {}", e))
        })?;

        // 保存密码
        entry.set_password(password).map_err(|e| {
            SyncError::ConfigError(format!("Failed to save password to keyring: {}", e))
        })?;

        Ok(())
    }

    /// 从系统 Keyring 读取密码
    ///
    /// # 参数
    /// - server_id: 服务器唯一标识符（UUID）
    ///
    /// # 返回
    /// - Ok(String): 读取成功，返回密码
    /// - Err(SyncError): 读取失败
    ///
    /// # 错误处理
    /// - 如果 Keyring 不可用，返回 ConfigError
    /// - 如果密码不存在，返回 NotFound
    /// - 如果 server_id 为空，返回 ConfigError
    ///
    /// # 注意
    /// - 返回的密码是明文，调用者需要妥善处理
    /// - 如果密码不存在，会返回 NotFound 错误而不是空字符串
    pub fn get_password(server_id: &str) -> Result<String> {
        // 验证输入
        if server_id.trim().is_empty() {
            return Err(SyncError::ConfigError(
                "Server ID cannot be empty".to_string(),
            ));
        }

        // 创建 Keyring 条目
        let entry = keyring::Entry::new(Self::SERVICE_NAME, server_id).map_err(|e| {
            SyncError::ConfigError(format!("Failed to create keyring entry: {}", e))
        })?;

        // 读取密码
        entry.get_password().map_err(|e| {
            // 区分密码不存在和其他错误
            match e {
                keyring::Error::NoEntry => {
                    SyncError::NotFound(format!("Password not found for server: {}", server_id))
                }
                _ => SyncError::ConfigError(format!("Failed to read password from keyring: {}", e)),
            }
        })
    }

    /// 从系统 Keyring 删除密码
    ///
    /// # 参数
    /// - server_id: 服务器唯一标识符（UUID）
    ///
    /// # 返回
    /// - Ok(()): 删除成功
    /// - Err(SyncError): 删除失败
    ///
    /// # 错误处理
    /// - 如果 Keyring 不可用，返回 ConfigError
    /// - 如果密码不存在，返回 NotFound
    /// - 如果 server_id 为空，返回 ConfigError
    ///
    /// # 注意
    /// - 删除不存在的密码会返回 NotFound 错误
    /// - 删除后无法恢复，请谨慎操作
    pub fn delete_password(server_id: &str) -> Result<()> {
        // 验证输入
        if server_id.trim().is_empty() {
            return Err(SyncError::ConfigError(
                "Server ID cannot be empty".to_string(),
            ));
        }

        // 创建 Keyring 条目
        let entry = keyring::Entry::new(Self::SERVICE_NAME, server_id).map_err(|e| {
            SyncError::ConfigError(format!("Failed to create keyring entry: {}", e))
        })?;

        // 删除密码
        entry.delete_password().map_err(|e| {
            // 区分密码不存在和其他错误
            match e {
                keyring::Error::NoEntry => {
                    SyncError::NotFound(format!("Password not found for server: {}", server_id))
                }
                _ => {
                    SyncError::ConfigError(format!("Failed to delete password from keyring: {}", e))
                }
            }
        })?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    /// 生成测试用的服务器 ID
    fn generate_test_server_id() -> String {
        format!("test-server-{}", Uuid::new_v4())
    }

    /// 清理测试数据（删除测试密码）
    fn cleanup_test_password(server_id: &str) {
        let _ = KeyringManager::delete_password(server_id);
    }

    #[test]
    fn test_save_password_success() {
        let server_id = generate_test_server_id();
        let password = "test-password-123";
        println!("{}", server_id);

        // 保存密码
        let result = KeyringManager::save_password(&server_id, password);
        assert!(result.is_ok(), "Failed to save password: {:?}", result);

        // 清理
        cleanup_test_password(&server_id);
    }

    #[test]
    fn test_save_password_empty_server_id() {
        let result = KeyringManager::save_password("", "password");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    #[test]
    fn test_save_password_empty_password() {
        let server_id = generate_test_server_id();
        let result = KeyringManager::save_password(&server_id, "");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    #[test]
    fn test_save_password_whitespace_server_id() {
        let result = KeyringManager::save_password("   ", "password");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    #[test]
    fn test_get_password_success() {
        let server_id = generate_test_server_id();
        let password = "test-password-456";

        // 保存密码
        KeyringManager::save_password(&server_id, password).unwrap();

        // 读取密码
        let result = KeyringManager::get_password(&server_id);
        assert!(result.is_ok(), "Failed to get password: {:?}", result);
        assert_eq!(result.unwrap(), password);

        // 清理
        cleanup_test_password(&server_id);
    }

    #[test]
    fn test_get_password_not_found() {
        let server_id = generate_test_server_id();

        // 尝试读取不存在的密码
        let result = KeyringManager::get_password(&server_id);
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::NotFound(_))));
    }

    #[test]
    fn test_get_password_empty_server_id() {
        let result = KeyringManager::get_password("");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    #[test]
    fn test_get_password_whitespace_server_id() {
        let result = KeyringManager::get_password("   ");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    #[test]
    fn test_delete_password_success() {
        let server_id = generate_test_server_id();
        let password = "test-password-789";

        // 保存密码
        KeyringManager::save_password(&server_id, password).unwrap();

        // 验证密码存在
        let get_result = KeyringManager::get_password(&server_id);
        assert!(get_result.is_ok());

        // 删除密码
        let delete_result = KeyringManager::delete_password(&server_id);
        assert!(
            delete_result.is_ok(),
            "Failed to delete password: {:?}",
            delete_result
        );

        // 验证密码已删除
        let get_result_after = KeyringManager::get_password(&server_id);
        assert!(get_result_after.is_err());
        assert!(matches!(get_result_after, Err(SyncError::NotFound(_))));
    }

    #[test]
    fn test_delete_password_not_found() {
        let server_id = generate_test_server_id();

        // 尝试删除不存在的密码
        let result = KeyringManager::delete_password(&server_id);
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::NotFound(_))));
    }

    #[test]
    fn test_delete_password_empty_server_id() {
        let result = KeyringManager::delete_password("");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    #[test]
    fn test_delete_password_whitespace_server_id() {
        let result = KeyringManager::delete_password("   ");
        assert!(result.is_err());
        assert!(matches!(result, Err(SyncError::ConfigError(_))));
    }

    /// Property 3: 密码安全存储 Round-Trip
    /// **Feature: webdav-connection, Property 3: 密码安全存储 Round-Trip**
    /// **Validates: Requirements 1.2, 4.4**
    ///
    /// 对于任何服务器 ID 和密码，保存到 Keyring 后再读取应该得到相同的密码
    #[test]
    fn test_password_roundtrip() {
        let test_passwords = vec![
            "simple-password".to_string(),
            "password-with-special-chars-!@#$%^&*()".to_string(),
            "password-with-unicode-中文-日本語".to_string(),
            "very-long-password-".repeat(10),
            "password with spaces".to_string(),
        ];

        for password in test_passwords {
            // 为每个密码生成新的 server_id
            let server_id = generate_test_server_id();

            // 保存密码
            let save_result = KeyringManager::save_password(&server_id, &password);
            assert!(
                save_result.is_ok(),
                "Failed to save password: {:?}",
                save_result
            );

            // 读取密码
            let get_result = KeyringManager::get_password(&server_id);
            assert!(
                get_result.is_ok(),
                "Failed to get password: {:?}",
                get_result
            );

            // 验证密码相同
            let retrieved_password = get_result.unwrap();
            assert_eq!(
                retrieved_password, password,
                "Password mismatch: expected '{}', got '{}'",
                password, retrieved_password
            );

            // 清理
            cleanup_test_password(&server_id);
        }
    }

    #[test]
    fn test_multiple_servers_independent() {
        let server_id_1 = generate_test_server_id();
        let server_id_2 = generate_test_server_id();
        let password_1 = "password-for-server-1";
        let password_2 = "password-for-server-2";

        // 保存两个服务器的密码
        KeyringManager::save_password(&server_id_1, password_1).unwrap();
        KeyringManager::save_password(&server_id_2, password_2).unwrap();

        // 验证两个密码独立存储
        let retrieved_1 = KeyringManager::get_password(&server_id_1).unwrap();
        let retrieved_2 = KeyringManager::get_password(&server_id_2).unwrap();

        assert_eq!(retrieved_1, password_1);
        assert_eq!(retrieved_2, password_2);

        // 删除第一个密码
        KeyringManager::delete_password(&server_id_1).unwrap();

        // 验证第一个密码已删除，第二个仍存在
        assert!(KeyringManager::get_password(&server_id_1).is_err());
        assert_eq!(
            KeyringManager::get_password(&server_id_2).unwrap(),
            password_2
        );

        // 清理
        cleanup_test_password(&server_id_2);
    }

    #[test]
    fn test_overwrite_existing_password() {
        let server_id = generate_test_server_id();
        let password_1 = "original-password";
        let password_2 = "updated-password";

        // 保存第一个密码
        KeyringManager::save_password(&server_id, password_1).unwrap();
        assert_eq!(
            KeyringManager::get_password(&server_id).unwrap(),
            password_1
        );

        // 覆盖密码
        KeyringManager::save_password(&server_id, password_2).unwrap();
        assert_eq!(
            KeyringManager::get_password(&server_id).unwrap(),
            password_2
        );

        // 清理
        cleanup_test_password(&server_id);
    }
}
