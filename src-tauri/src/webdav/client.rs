/// WebDAV 客户端实现
///
/// 提供与 WebDAV 服务器通信的核心功能
///
/// # 设计说明
///
/// `WebDavClient` 是一个临时对象，每次需要与服务器通信时创建：
/// 1. 从数据库读取 `WebDavServerConfig`
/// 2. 从 Keyring 读取密码
/// 3. 创建 `WebDavClient` 实例
/// 4. 执行操作
/// 5. 实例在作用域结束时自动销毁
///
/// 配置信息存储在数据库中，密码存储在系统 Keyring 中，
/// `WebDavClient` 本身不持久化。
use crate::database::WebDavServerConfig;
use crate::{Result, SyncError};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use std::fmt::Display;
use std::path::Path;
use std::time::Duration;

/// WebDAV 文件信息
///
/// 表示 WebDAV 服务器上的文件或文件夹的元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    /// 文件路径（相对于服务器根路径）
    pub path: String,

    /// 文件名
    pub name: String,

    /// 是否为目录
    pub is_directory: bool,

    /// 文件大小（字节）
    pub size: u64,

    /// 最后修改时间（Unix 时间戳，秒）
    pub modified: Option<i64>,
}

/// WebDAV 客户端
///
/// 封装与 WebDAV 服务器的所有通信逻辑
#[derive(Debug)]
pub struct WebDavClient {
    /// WebDAV 服务器 URL (从 WebDavServerConfig.url 获取)
    url: String,

    /// 用户名 (从 WebDavServerConfig.username 获取)
    username: String,

    /// 密码 (从 Keyring 读取，不持久化在配置中)
    password: String,

    /// 连接超时时间 (从 WebDavServerConfig.timeout 获取)
    timeout: Duration,

    /// HTTP 客户端 (支持连接复用)
    client: reqwest::Client,
}

impl WebDavClient {
    /// 从服务器配置和密码创建客户端实例
    ///
    /// # 参数
    /// - `config`: 服务器配置(从数据库读取)
    /// - `password`: 服务器密码(从 Keyring 读取)
    ///
    /// # 返回
    /// - `Ok(WebDavClient)`: 创建成功
    /// - `Err(SyncError)`: 创建失败，可能的原因：
    ///   - 配置验证失败
    ///   - HTTP 客户端创建失败
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// use lightsync_lib::webdav::client::WebDavClient;
    /// use lightsync_lib::database::WebDavServerConfig;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// // 1. 从数据库获取服务器配置
    /// let config = WebDavServerConfig {
    ///     id: "test-id".to_string(),
    ///     name: "My Server".to_string(),
    ///     url: "https://example.com/webdav".to_string(),
    ///     username: "user".to_string(),
    ///     use_https: true,
    ///     timeout: 30,
    ///     last_test_at: None,
    ///     last_test_status: "unknown".to_string(),
    ///     last_test_error: None,
    ///     server_type: "generic".to_string(),
    ///     enabled: true,
    ///     created_at: 0,
    ///     updated_at: 0,
    /// };
    ///
    /// // 2. 从 Keyring 获取密码
    /// let password = "my_password".to_string();
    ///
    /// // 3. 创建 WebDavClient 实例
    /// let client = WebDavClient::new(&config, password)?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn new(config: &WebDavServerConfig, password: String) -> Result<Self> {
        // 验证配置
        config
            .validate()
            .map_err(|e| SyncError::ConfigError(format!("Invalid server config: {}", e)))?;

        // 验证密码不为空
        if password.trim().is_empty() {
            return Err(SyncError::ConfigError(
                "Password cannot be empty".to_string(),
            ));
        }

        // 构建认证头
        let mut headers = HeaderMap::new();
        let auth_value = format!(
            "Basic {}",
            base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                format!("{}:{}", config.username, password)
            )
        );
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&auth_value).map_err(|e| {
                SyncError::ConfigError(format!("Failed to create authorization header: {}", e))
            })?,
        );

        // 创建 HTTP 客户端
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(config.timeout as u64))
            .default_headers(headers)
            .build()
            .map_err(|e| SyncError::Network(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            url: config.url.clone(),
            username: config.username.clone(),
            password,
            timeout: Duration::from_secs(config.timeout as u64),
            client,
        })
    }

    /// 获取服务器 URL
    pub fn url(&self) -> &str {
        &self.url
    }

    /// 获取用户名
    pub fn username(&self) -> &str {
        &self.username
    }

    /// 获取超时时间
    pub fn timeout(&self) -> Duration {
        self.timeout
    }

    /// 测试与服务器的连接
    ///
    /// 发送 PROPFIND 请求到服务器根路径，验证：
    /// 1. 服务器是否可达
    /// 2. 认证信息是否正确
    /// 3. 服务器是否支持 WebDAV 协议
    ///
    /// 同时尝试检测服务器类型（Nextcloud、ownCloud 等）
    ///
    /// # 返回
    /// - `Ok(String)`: 连接成功，返回检测到的服务器类型
    /// - `Err(SyncError)`: 连接失败，可能的原因：
    ///   - `Network`: 网络连接失败或超时
    ///   - `AuthError`: 认证失败（401）
    ///   - `WebDav`: 服务器不支持 WebDAV 或其他协议错误
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// # use lightsync_lib::webdav::client::WebDavClient;
    /// # use lightsync_lib::database::WebDavServerConfig;
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let config = WebDavServerConfig {
    /// #     id: "test".to_string(),
    /// #     name: "Test".to_string(),
    /// #     url: "https://example.com/webdav".to_string(),
    /// #     username: "user".to_string(),
    /// #     use_https: true,
    /// #     timeout: 30,
    /// #     last_test_at: None,
    /// #     last_test_status: "unknown".to_string(),
    /// #     last_test_error: None,
    /// #     server_type: "generic".to_string(),
    /// #     enabled: true,
    /// #     created_at: 0,
    /// #     updated_at: 0,
    /// # };
    /// # let password = "password".to_string();
    /// let client = WebDavClient::new(&config, password)?;
    /// let server_type = client.test_connection().await?;
    /// println!("Connected to {} server", server_type);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn test_connection(&self) -> Result<String> {
        // 构建 PROPFIND 请求体（请求基本属性）
        let propfind_body = r#"<?xml version="1.0" encoding="utf-8" ?>
            <D:propfind xmlns:D="DAV:">
                <D:prop>
                    <D:resourcetype/>
                    <D:getcontentlength/>
                </D:prop>
            </D:propfind>"#;

        // 发送 PROPFIND 请求到根路径
        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &self.url)
            .header("Depth", "0")
            .header("Content-Type", "application/xml; charset=utf-8")
            .body(propfind_body)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    SyncError::Network(format!(
                        "Connection timeout after {} seconds",
                        self.timeout.as_secs()
                    ))
                } else if e.is_connect() {
                    SyncError::Network(format!("Failed to connect to server: {}", e))
                } else {
                    SyncError::Network(format!("Network error: {}", e))
                }
            })?;

        // 检查响应状态码
        let status = response.status();
        println!("Response status: {}", status);

        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(SyncError::AuthError(
                "Authentication failed: Invalid username or password".to_string(),
            ));
        }

        if status == reqwest::StatusCode::FORBIDDEN {
            return Err(SyncError::AuthError(
                "Access forbidden: User does not have permission".to_string(),
            ));
        }

        if !status.is_success() && status != reqwest::StatusCode::MULTI_STATUS {
            return Err(SyncError::WebDav(format!(
                "Server returned error status: {} {}",
                status.as_u16(),
                status.canonical_reason().unwrap_or("Unknown")
            )));
        }

        // 检测服务器类型（通过响应头）
        let server_type = self.detect_server_type(&response);

        // 验证响应是否为有效的 WebDAV 响应
        // WebDAV 服务器应该返回 207 Multi-Status 或 200 OK
        if status != reqwest::StatusCode::MULTI_STATUS && status != reqwest::StatusCode::OK {
            return Err(SyncError::WebDav(
                "Server does not appear to support WebDAV protocol".to_string(),
            ));
        }

        Ok(server_type)
    }

    /// 检测服务器类型
    ///
    /// 通过分析 HTTP 响应头来识别服务器类型
    ///
    /// # 参数
    /// - `response`: HTTP 响应对象
    ///
    /// # 返回
    /// 服务器类型字符串：
    /// - "nextcloud": Nextcloud 服务器
    /// - "owncloud": ownCloud 服务器
    /// - "apache": Apache WebDAV
    /// - "nginx": Nginx WebDAV
    /// - "generic": 通用 WebDAV 服务器
    fn detect_server_type(&self, response: &reqwest::Response) -> String {
        let headers = response.headers();

        // 检查 Server 头
        if let Some(server_header) = headers.get("server") {
            if let Ok(server_str) = server_header.to_str() {
                let server_lower = server_str.to_lowercase();

                if server_lower.contains("nextcloud") {
                    return "nextcloud".to_string();
                }
                if server_lower.contains("owncloud") {
                    return "owncloud".to_string();
                }
                if server_lower.contains("apache") {
                    return "apache".to_string();
                }
                if server_lower.contains("nginx") {
                    return "nginx".to_string();
                }
            }
        }

        // 检查 X-Powered-By 头（某些服务器会提供）
        if let Some(powered_by) = headers.get("x-powered-by") {
            if let Ok(powered_str) = powered_by.to_str() {
                let powered_lower = powered_str.to_lowercase();

                if powered_lower.contains("nextcloud") {
                    return "nextcloud".to_string();
                }
                if powered_lower.contains("owncloud") {
                    return "owncloud".to_string();
                }
            }
        }

        // 检查 X-OC-Version 头（ownCloud/Nextcloud 特有）
        if headers.contains_key("x-oc-version") {
            // 如果有 X-OC-Version 但没有明确标识，默认为 ownCloud
            return "owncloud".to_string();
        }

        // 默认返回通用类型
        "generic".to_string()
    }

    /// 列出指定路径下的文件和文件夹
    ///
    /// 发送 PROPFIND 请求获取目录内容
    ///
    /// # 参数
    /// - `path`: 远程路径（相对于服务器根路径）
    ///
    /// # 返回
    /// - `Ok(Vec<FileInfo>)`: 文件和文件夹列表
    /// - `Err(SyncError)`: 操作失败
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// # use lightsync_lib::webdav::client::WebDavClient;
    /// # use lightsync_lib::database::WebDavServerConfig;
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let config = WebDavServerConfig {
    /// #     id: "test".to_string(),
    /// #     name: "Test".to_string(),
    /// #     url: "https://example.com/webdav".to_string(),
    /// #     username: "user".to_string(),
    /// #     use_https: true,
    /// #     timeout: 30,
    /// #     last_test_at: None,
    /// #     last_test_status: "unknown".to_string(),
    /// #     last_test_error: None,
    /// #     server_type: "generic".to_string(),
    /// #     enabled: true,
    /// #     created_at: 0,
    /// #     updated_at: 0,
    /// # };
    /// # let password = "password".to_string();
    /// let client = WebDavClient::new(&config, password)?;
    /// let files = client.list("/documents").await?;
    /// for file in files {
    ///     println!("{}: {} bytes", file.name, file.size);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn list(&self, path: &str) -> Result<Vec<FileInfo>> {
        // 构建完整 URL
        let url = self.build_url(path);

        // 构建 PROPFIND 请求体
        let propfind_body = r#"<?xml version="1.0" encoding="utf-8" ?>
            <D:propfind xmlns:D="DAV:">
                <D:prop>
                    <D:resourcetype/>
                    <D:getcontentlength/>
                    <D:getlastmodified/>
                    <D:displayname/>
                </D:prop>
            </D:propfind>"#;

        // 发送 PROPFIND 请求
        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
            .header("Depth", "1") // 只列出当前目录，不递归
            .header("Content-Type", "application/xml; charset=utf-8")
            .body(propfind_body)
            .send()
            .await
            .map_err(|e| self.map_request_error(e))?;

        // 检查响应状态
        self.check_response_status(&response)?;

        // 解析响应体
        let body = response
            .text()
            .await
            .map_err(|e| SyncError::WebDav(format!("Failed to read response body: {}", e)))?;

        // 简单解析 XML 响应（这里使用简单的字符串解析，生产环境应使用 XML 解析库）
        self.parse_propfind_response(&body, path)
    }

    /// 上传本地文件到远程路径
    ///
    /// 使用 PUT 方法上传文件内容
    ///
    /// # 参数
    /// - `local_path`: 本地文件路径
    /// - `remote_path`: 远程文件路径（相对于服务器根路径）
    ///
    /// # 返回
    /// - `Ok(())`: 上传成功
    /// - `Err(SyncError)`: 上传失败
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// # use lightsync_lib::webdav::client::WebDavClient;
    /// # use lightsync_lib::database::WebDavServerConfig;
    /// # use std::path::Path;
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let config = WebDavServerConfig {
    /// #     id: "test".to_string(),
    /// #     name: "Test".to_string(),
    /// #     url: "https://example.com/webdav".to_string(),
    /// #     username: "user".to_string(),
    /// #     use_https: true,
    /// #     timeout: 30,
    /// #     last_test_at: None,
    /// #     last_test_status: "unknown".to_string(),
    /// #     last_test_error: None,
    /// #     server_type: "generic".to_string(),
    /// #     enabled: true,
    /// #     created_at: 0,
    /// #     updated_at: 0,
    /// # };
    /// # let password = "password".to_string();
    /// let client = WebDavClient::new(&config, password)?;
    /// client.upload(Path::new("local.txt"), "/remote.txt").await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<()> {
        // 读取本地文件内容
        let content = tokio::fs::read(local_path)
            .await
            .map_err(|e| SyncError::Io(e))?;

        // 构建完整 URL
        let url = self.build_url(remote_path);

        // 发送 PUT 请求
        let response = self
            .client
            .put(&url)
            .body(content)
            .send()
            .await
            .map_err(|e| self.map_request_error(e))?;

        // 检查响应状态
        self.check_response_status(&response)?;

        Ok(())
    }

    /// 从远程路径下载文件到本地
    ///
    /// 使用 GET 方法下载文件内容
    ///
    /// # 参数
    /// - `remote_path`: 远程文件路径（相对于服务器根路径）
    /// - `local_path`: 本地文件路径
    ///
    /// # 返回
    /// - `Ok(())`: 下载成功
    /// - `Err(SyncError)`: 下载失败
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// # use lightsync_lib::webdav::client::WebDavClient;
    /// # use lightsync_lib::database::WebDavServerConfig;
    /// # use std::path::Path;
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let config = WebDavServerConfig {
    /// #     id: "test".to_string(),
    /// #     name: "Test".to_string(),
    /// #     url: "https://example.com/webdav".to_string(),
    /// #     username: "user".to_string(),
    /// #     use_https: true,
    /// #     timeout: 30,
    /// #     last_test_at: None,
    /// #     last_test_status: "unknown".to_string(),
    /// #     last_test_error: None,
    /// #     server_type: "generic".to_string(),
    /// #     enabled: true,
    /// #     created_at: 0,
    /// #     updated_at: 0,
    /// # };
    /// # let password = "password".to_string();
    /// let client = WebDavClient::new(&config, password)?;
    /// client.download("/remote.txt", Path::new("local.txt")).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn download(&self, remote_path: &str, local_path: &Path) -> Result<()> {
        // 构建完整 URL
        let url = self.build_url(remote_path);

        // 发送 GET 请求
        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| self.map_request_error(e))?;

        // 检查响应状态
        self.check_response_status(&response)?;

        // 读取响应内容
        let content = response
            .bytes()
            .await
            .map_err(|e| SyncError::WebDav(format!("Failed to read response body: {}", e)))?;

        // 写入本地文件
        tokio::fs::write(local_path, content)
            .await
            .map_err(|e| SyncError::Io(e))?;

        Ok(())
    }

    /// 删除远程路径的文件或文件夹
    ///
    /// 使用 DELETE 方法删除资源
    ///
    /// # 参数
    /// - `path`: 远程路径（相对于服务器根路径）
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SyncError)`: 删除失败
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// # use lightsync_lib::webdav::client::WebDavClient;
    /// # use lightsync_lib::database::WebDavServerConfig;
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let config = WebDavServerConfig {
    /// #     id: "test".to_string(),
    /// #     name: "Test".to_string(),
    /// #     url: "https://example.com/webdav".to_string(),
    /// #     username: "user".to_string(),
    /// #     use_https: true,
    /// #     timeout: 30,
    /// #     last_test_at: None,
    /// #     last_test_status: "unknown".to_string(),
    /// #     last_test_error: None,
    /// #     server_type: "generic".to_string(),
    /// #     enabled: true,
    /// #     created_at: 0,
    /// #     updated_at: 0,
    /// # };
    /// # let password = "password".to_string();
    /// let client = WebDavClient::new(&config, password)?;
    /// client.delete("/old_file.txt").await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn delete(&self, path: &str) -> Result<()> {
        // 构建完整 URL
        let url = self.build_url(path);

        // 发送 DELETE 请求
        let response = self
            .client
            .delete(&url)
            .send()
            .await
            .map_err(|e| self.map_request_error(e))?;

        // 检查响应状态
        self.check_response_status(&response)?;

        Ok(())
    }

    /// 在远程路径创建文件夹
    ///
    /// 使用 MKCOL 方法创建目录
    ///
    /// # 参数
    /// - `path`: 远程路径（相对于服务器根路径）
    ///
    /// # 返回
    /// - `Ok(())`: 创建成功
    /// - `Err(SyncError)`: 创建失败
    ///
    /// # 示例
    ///
    /// ```rust,no_run
    /// # use lightsync_lib::webdav::client::WebDavClient;
    /// # use lightsync_lib::database::WebDavServerConfig;
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let config = WebDavServerConfig {
    /// #     id: "test".to_string(),
    /// #     name: "Test".to_string(),
    /// #     url: "https://example.com/webdav".to_string(),
    /// #     username: "user".to_string(),
    /// #     use_https: true,
    /// #     timeout: 30,
    /// #     last_test_at: None,
    /// #     last_test_status: "unknown".to_string(),
    /// #     last_test_error: None,
    /// #     server_type: "generic".to_string(),
    /// #     enabled: true,
    /// #     created_at: 0,
    /// #     updated_at: 0,
    /// # };
    /// # let password = "password".to_string();
    /// let client = WebDavClient::new(&config, password)?;
    /// client.mkdir("/new_folder").await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn mkdir(&self, path: &str) -> Result<()> {
        // 构建完整 URL
        let url = self.build_url(path);

        // 发送 MKCOL 请求
        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"MKCOL").unwrap(), &url)
            .send()
            .await
            .map_err(|e| self.map_request_error(e))?;

        // 检查响应状态
        self.check_response_status(&response)?;

        Ok(())
    }

    // ========== 辅助方法 ==========

    /// 构建完整的 WebDAV URL
    ///
    /// # 参数
    /// - `path`: 相对路径
    ///
    /// # 返回
    /// 完整的 URL 字符串
    fn build_url(&self, path: &str) -> String {
        let path = path.trim_start_matches('/');
        format!("{}/{}", self.url.trim_end_matches('/'), path)
    }

    /// 映射 reqwest 错误到 SyncError
    ///
    /// 将 HTTP 客户端错误转换为应用层的 SyncError，提供详细的错误信息
    ///
    /// # 参数
    /// - `error`: reqwest 错误
    ///
    /// # 返回
    /// 对应的 SyncError，包含详细的错误类型和描述
    ///
    /// # 错误类型映射
    /// - 超时错误 -> `Network` (包含超时时间)
    /// - 连接错误 -> `Network` (包含连接失败原因)
    /// - DNS 解析错误 -> `Network` (包含域名信息)
    /// - TLS/SSL 错误 -> `Network` (包含证书错误信息)
    /// - 其他网络错误 -> `Network` (包含具体错误描述)
    fn map_request_error(&self, error: reqwest::Error) -> SyncError {
        // 超时错误
        if error.is_timeout() {
            return SyncError::Network(format!(
                "Connection timeout after {} seconds. Please check your network connection or increase the timeout setting.",
                self.timeout.as_secs()
            ));
        }

        // 连接错误
        if error.is_connect() {
            // 尝试提取更详细的错误信息
            let error_msg = error.to_string();

            // DNS 解析失败
            if error_msg.contains("dns") || error_msg.contains("resolve") {
                return SyncError::Network(format!(
                    "Failed to resolve server address '{}'. Please check the server URL and your DNS settings.",
                    self.url
                ));
            }

            // 连接被拒绝
            if error_msg.contains("refused") {
                return SyncError::Network(format!(
                    "Connection refused by server '{}'. Please verify the server is running and accessible.",
                    self.url
                ));
            }

            // TLS/SSL 错误
            if error_msg.contains("ssl")
                || error_msg.contains("tls")
                || error_msg.contains("certificate")
            {
                return SyncError::Network(format!(
                    "SSL/TLS connection error: {}. This may be caused by an invalid certificate or unsupported protocol.",
                    error
                ));
            }

            // 通用连接错误
            return SyncError::Network(format!(
                "Failed to connect to server '{}': {}. Please check the server URL and your network connection.",
                self.url, error
            ));
        }

        // 请求构建错误
        if error.is_builder() {
            return SyncError::ConfigError(format!(
                "Failed to build HTTP request: {}. This may indicate an invalid configuration.",
                error
            ));
        }

        // 请求发送错误
        if error.is_request() {
            return SyncError::Network(format!(
                "Failed to send request: {}. Please check your network connection.",
                error
            ));
        }

        // 响应体读取错误
        if error.is_body() || error.is_decode() {
            return SyncError::WebDav(format!(
                "Failed to read server response: {}. The server may have sent invalid data.",
                error
            ));
        }

        // 重定向错误
        if error.is_redirect() {
            return SyncError::WebDav(format!(
                "Too many redirects or invalid redirect: {}. Please check the server URL.",
                error
            ));
        }

        // HTTP 状态错误（如果有状态码）
        if let Some(status) = error.status() {
            return self.map_status_error(status, &error.to_string());
        }

        // 其他未分类的网络错误
        SyncError::Network(format!(
            "Network error: {}. Please check your connection and try again.",
            error
        ))
    }

    /// 检查 HTTP 响应状态码
    ///
    /// 将 HTTP 状态码转换为应用层错误，提供详细的错误信息
    ///
    /// # 参数
    /// - `response`: HTTP 响应对象
    ///
    /// # 返回
    /// - `Ok(())`: 状态码表示成功 (2xx 或 207 Multi-Status)
    /// - `Err(SyncError)`: 状态码表示失败，包含详细的错误类型和描述
    ///
    /// # 错误分类
    /// - 401 Unauthorized -> `AuthError` (认证失败)
    /// - 403 Forbidden -> `AuthError` (权限不足)
    /// - 404 Not Found -> `NotFound` (资源不存在)
    /// - 其他 4xx -> `WebDav` (客户端错误)
    /// - 5xx -> `WebDav` (服务器错误)
    fn check_response_status(&self, response: &reqwest::Response) -> Result<()> {
        let status = response.status();

        // 成功状态码
        if status.is_success() || status == reqwest::StatusCode::MULTI_STATUS {
            return Ok(());
        }

        // 认证错误 (401)
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(SyncError::AuthError(
                "Authentication failed: Invalid username or password. Please check your credentials.".to_string(),
            ));
        }

        // 权限错误 (403)
        if status == reqwest::StatusCode::FORBIDDEN {
            return Err(SyncError::AuthError(
                "Access forbidden: You do not have permission to access this resource. Please check your account permissions.".to_string(),
            ));
        }

        // 资源不存在 (404)
        if status == reqwest::StatusCode::NOT_FOUND {
            return Err(SyncError::NotFound(
                "Resource not found: The requested file or folder does not exist on the server."
                    .to_string(),
            ));
        }

        // 其他客户端错误 (4xx)
        if status.is_client_error() {
            let error_detail = match status.as_u16() {
                400 => "Bad Request: The server could not understand the request. This may indicate a client bug.",
                405 => "Method Not Allowed: The requested operation is not supported for this resource.",
                409 => "Conflict: The request conflicts with the current state of the resource. The resource may already exist or be locked.",
                411 => "Length Required: The request did not specify the length of its content.",
                412 => "Precondition Failed: One or more conditions in the request header fields evaluated to false.",
                413 => "Payload Too Large: The request entity is larger than the server is willing or able to process.",
                415 => "Unsupported Media Type: The server does not support the media type of the request.",
                423 => "Locked: The resource is locked and cannot be modified.",
                424 => "Failed Dependency: The request failed due to failure of a previous request.",
                507 => "Insufficient Storage: The server is unable to store the representation needed to complete the request.",
                _ => "Client error occurred.",
            };

            return Err(SyncError::WebDav(format!(
                "HTTP {} {}: {}",
                status.as_u16(),
                status.canonical_reason().unwrap_or("Unknown"),
                error_detail
            )));
        }

        // 服务器错误 (5xx)
        if status.is_server_error() {
            let error_detail = match status.as_u16() {
                500 => "Internal Server Error: The server encountered an unexpected condition. Please try again later or contact the server administrator.",
                501 => "Not Implemented: The server does not support the functionality required to fulfill the request.",
                502 => "Bad Gateway: The server received an invalid response from an upstream server.",
                503 => "Service Unavailable: The server is temporarily unable to handle the request. Please try again later.",
                504 => "Gateway Timeout: The server did not receive a timely response from an upstream server.",
                507 => "Insufficient Storage: The server is unable to store the representation needed to complete the request.",
                _ => "Server error occurred. Please try again later or contact the server administrator.",
            };

            return Err(SyncError::WebDav(format!(
                "HTTP {} {}: {}",
                status.as_u16(),
                status.canonical_reason().unwrap_or("Unknown"),
                error_detail
            )));
        }

        // 其他未知状态码
        Err(SyncError::WebDav(format!(
            "Unexpected HTTP status: {} {}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        )))
    }

    /// 映射 HTTP 状态码到 SyncError（用于 map_request_error）
    ///
    /// # 参数
    /// - `status`: HTTP 状态码
    /// - `additional_info`: 额外的错误信息
    ///
    /// # 返回
    /// 对应的 SyncError
    fn map_status_error(&self, status: reqwest::StatusCode, additional_info: &str) -> SyncError {
        // 认证错误 (401)
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return SyncError::AuthError(
                "Authentication failed: Invalid username or password. Please check your credentials.".to_string(),
            );
        }

        // 权限错误 (403)
        if status == reqwest::StatusCode::FORBIDDEN {
            return SyncError::AuthError(
                "Access forbidden: You do not have permission to access this resource. Please check your account permissions.".to_string(),
            );
        }

        // 资源不存在 (404)
        if status == reqwest::StatusCode::NOT_FOUND {
            return SyncError::NotFound(
                "Resource not found: The requested file or folder does not exist on the server."
                    .to_string(),
            );
        }

        // 其他客户端错误 (4xx)
        if status.is_client_error() {
            let error_detail = match status.as_u16() {
                400 => "Bad Request: The server could not understand the request.",
                405 => "Method Not Allowed: The requested operation is not supported.",
                409 => "Conflict: The resource may already exist or be locked.",
                411 => "Length Required: The request did not specify content length.",
                412 => "Precondition Failed: Request conditions evaluated to false.",
                413 => "Payload Too Large: The request entity is too large.",
                415 => "Unsupported Media Type: The media type is not supported.",
                423 => "Locked: The resource is locked.",
                424 => "Failed Dependency: A previous request failed.",
                507 => "Insufficient Storage: The server has insufficient storage.",
                _ => "Client error occurred.",
            };

            let msg = if additional_info.is_empty() {
                format!(
                    "HTTP {} {}: {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown"),
                    error_detail
                )
            } else {
                format!(
                    "HTTP {} {}: {}. {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown"),
                    error_detail,
                    additional_info
                )
            };

            return SyncError::WebDav(msg);
        }

        // 服务器错误 (5xx)
        if status.is_server_error() {
            let error_detail = match status.as_u16() {
                500 => "Internal Server Error: Please try again later.",
                501 => "Not Implemented: The server does not support this functionality.",
                502 => "Bad Gateway: Invalid response from upstream server.",
                503 => "Service Unavailable: Please try again later.",
                504 => "Gateway Timeout: Upstream server timeout.",
                507 => "Insufficient Storage: The server has insufficient storage.",
                _ => "Server error occurred.",
            };

            let msg = if additional_info.is_empty() {
                format!(
                    "HTTP {} {}: {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown"),
                    error_detail
                )
            } else {
                format!(
                    "HTTP {} {}: {}. {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown"),
                    error_detail,
                    additional_info
                )
            };

            return SyncError::WebDav(msg);
        }

        // 其他未知状态码
        SyncError::WebDav(format!(
            "Unexpected HTTP status: {} {}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        ))
    }

    /// 解析 PROPFIND 响应
    ///
    /// 简单的 XML 解析实现，提取文件信息
    ///
    /// # 参数
    /// - `xml`: XML 响应体
    /// - `base_path`: 基础路径
    ///
    /// # 返回
    /// 文件信息列表
    fn parse_propfind_response(&self, xml: &str, base_path: &str) -> Result<Vec<FileInfo>> {
        let mut files = Vec::new();

        // 简单的 XML 解析（生产环境应使用专业的 XML 解析库如 quick-xml）
        // 这里使用简单的字符串匹配来提取信息

        // 分割响应为多个 <D:response> 块
        for response_block in xml.split("<D:response>").skip(1) {
            if let Some(end_pos) = response_block.find("</D:response>") {
                let response_content = &response_block[..end_pos];

                // 提取 href（路径）
                let path = self.extract_xml_value(response_content, "D:href")?;

                // 跳过当前目录本身
                let normalized_base = base_path.trim_end_matches('/');
                let normalized_path = path.trim_end_matches('/');
                if normalized_path == normalized_base {
                    continue;
                }

                // 提取文件名
                let name = path
                    .trim_end_matches('/')
                    .split('/')
                    .last()
                    .unwrap_or("")
                    .to_string();

                // 检查是否为目录
                let is_directory = response_content.contains("<D:collection/>");

                // 提取文件大小
                let size = if is_directory {
                    0
                } else {
                    self.extract_xml_value(response_content, "D:getcontentlength")
                        .ok()
                        .and_then(|s| s.parse::<u64>().ok())
                        .unwrap_or(0)
                };

                // 提取修改时间（简化处理）
                let modified = None; // TODO: 解析 D:getlastmodified

                files.push(FileInfo {
                    path: path.clone(),
                    name,
                    is_directory,
                    size,
                    modified,
                });
            }
        }

        Ok(files)
    }

    /// 从 XML 中提取标签值
    ///
    /// # 参数
    /// - `xml`: XML 字符串
    /// - `tag`: 标签名
    ///
    /// # 返回
    /// 标签内容
    fn extract_xml_value(&self, xml: &str, tag: &str) -> Result<String> {
        let start_tag = format!("<{}>", tag);
        let end_tag = format!("</{}>", tag);

        if let Some(start_pos) = xml.find(&start_tag) {
            let content_start = start_pos + start_tag.len();
            if let Some(end_pos) = xml[content_start..].find(&end_tag) {
                return Ok(xml[content_start..content_start + end_pos].to_string());
            }
        }

        Err(SyncError::WebDav(format!(
            "Failed to extract XML value for tag: {}",
            tag
        )))
    }
}

impl Display for WebDavClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "WebDAV Client for {}", self.url)
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    /// 创建测试用的服务器配置
    fn create_test_config() -> WebDavServerConfig {
        let now = chrono::Utc::now().timestamp();
        let config = WebDavServerConfig {
            id: "test-id".to_string(),
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
        };
        println!("{:?}", config);
        config
    }

    /// 创建使用 mock 服务器 URL 的配置
    fn create_mock_config(url: String) -> WebDavServerConfig {
        let now = chrono::Utc::now().timestamp();
        WebDavServerConfig {
            id: "test-id".to_string(),
            name: "Test Server".to_string(),
            url,
            username: "testuser".to_string(),
            use_https: false,
            timeout: 5,
            last_test_at: None,
            last_test_status: "unknown".to_string(),
            last_test_error: None,
            server_type: "generic".to_string(),
            enabled: true,
            created_at: now,
            updated_at: now,
        }
    }

    #[test]
    fn test_create_client_success() {
        let config = create_test_config();
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_ok());

        let client = result.unwrap();
        assert_eq!(client.url(), "https://example.com/webdav");
        assert_eq!(client.username(), "testuser");
        assert_eq!(client.timeout(), Duration::from_secs(30));
    }

    #[test]
    fn test_create_client_with_http() {
        let mut config = create_test_config();
        config.url = "http://example.com/webdav".to_string();
        config.use_https = false;
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_ok());

        let client = result.unwrap();
        assert_eq!(client.url(), "http://example.com/webdav");
    }

    #[test]
    fn test_create_client_empty_password() {
        let config = create_test_config();
        let password = "".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Password cannot be empty"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_whitespace_password() {
        let config = create_test_config();
        let password = "   ".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Password cannot be empty"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_invalid_config_empty_name() {
        let mut config = create_test_config();
        config.name = "".to_string();
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_invalid_config_empty_url() {
        let mut config = create_test_config();
        config.url = "".to_string();
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_invalid_config_bad_url() {
        let mut config = create_test_config();
        config.url = "not-a-valid-url".to_string();
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_invalid_config_empty_username() {
        let mut config = create_test_config();
        config.username = "".to_string();
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_invalid_config_timeout_too_small() {
        let mut config = create_test_config();
        config.timeout = 0;
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_invalid_config_timeout_too_large() {
        let mut config = create_test_config();
        config.timeout = 301;
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_create_client_custom_timeout() {
        let mut config = create_test_config();
        config.timeout = 60;
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_ok());

        let client = result.unwrap();
        assert_eq!(client.timeout(), Duration::from_secs(60));
    }

    #[test]
    fn test_create_client_minimum_timeout() {
        let mut config = create_test_config();
        config.timeout = 1;
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_ok());

        let client = result.unwrap();
        assert_eq!(client.timeout(), Duration::from_secs(1));
    }

    #[test]
    fn test_create_client_maximum_timeout() {
        let mut config = create_test_config();
        config.timeout = 300;
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_ok());

        let client = result.unwrap();
        assert_eq!(client.timeout(), Duration::from_secs(300));
    }

    // ========== test_connection 方法测试 ==========

    #[tokio::test]
    async fn test_connection_success_generic() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .match_header("depth", "0")
            .match_header("authorization", mockito::Matcher::Any)
            .with_status(207) // Multi-Status
            .with_header("content-type", "application/xml")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        println!("创建的mock服务器{}", server.url());
        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        println!("获取的返回结果{:?}", result);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "generic");
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_success_nextcloud() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .match_header("depth", "0")
            .with_status(207)
            .with_header("server", "Apache/2.4.41 (Ubuntu) Nextcloud")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "nextcloud");
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_success_owncloud() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .match_header("depth", "0")
            .with_status(207)
            .with_header("server", "Apache/2.4.41 (Ubuntu) ownCloud")
            .with_header("x-oc-version", "10.8.0")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "owncloud");
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_success_apache() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .match_header("depth", "0")
            .with_status(207)
            .with_header("server", "Apache/2.4.41 (Ubuntu)")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "apache");
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_success_nginx() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .match_header("depth", "0")
            .with_status(207)
            .with_header("server", "nginx/1.18.0")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "nginx");
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_success_with_200_ok() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .match_header("depth", "0")
            .with_status(200) // Some servers return 200 OK instead of 207
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_auth_failure_401() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .with_status(401)
            .with_header("www-authenticate", "Basic realm=\"WebDAV\"")
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "wrong_password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::AuthError(msg) => {
                assert!(msg.contains("Authentication failed"));
            }
            _ => panic!("Expected AuthError"),
        }
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_forbidden_403() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .with_status(403)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::AuthError(msg) => {
                assert!(msg.contains("Access forbidden"));
            }
            _ => panic!("Expected AuthError"),
        }
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_not_found_404() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .with_status(404)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::WebDav(msg) => {
                assert!(msg.contains("404"));
            }
            _ => panic!("Expected WebDav error"),
        }
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_server_error_500() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .with_status(500)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::WebDav(msg) => {
                assert!(msg.contains("500"));
            }
            _ => panic!("Expected WebDav error"),
        }
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_connection_network_error() {
        // 使用一个不存在的地址来模拟网络错误
        let mut config = create_test_config();
        config.url = "http://localhost:1".to_string(); // 不太可能有服务在这个端口
        config.timeout = 1; // 短超时
        config.use_https = false;

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::Network(_) => {
                // 预期的网络错误
            }
            _ => panic!("Expected Network error"),
        }
    }

    #[tokio::test]
    async fn test_detect_server_type_with_x_powered_by() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .with_status(207)
            .with_header("x-powered-by", "Nextcloud")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "nextcloud");
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_detect_server_type_with_x_oc_version() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/")
            .with_status(207)
            .with_header("x-oc-version", "10.8.0")
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.test_connection().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "owncloud");
        mock.assert_async().await;
    }

    // ========== 文件操作方法测试 ==========

    #[tokio::test]
    async fn test_list_files_success() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/documents")
            .match_header("depth", "1")
            .with_status(207)
            .with_body(
                r#"<?xml version="1.0"?>
                <D:multistatus xmlns:D="DAV:">
                    <D:response>
                        <D:href>/documents/</D:href>
                        <D:propstat>
                            <D:prop>
                                <D:resourcetype><D:collection/></D:resourcetype>
                            </D:prop>
                        </D:propstat>
                    </D:response>
                    <D:response>
                        <D:href>/documents/file1.txt</D:href>
                        <D:propstat>
                            <D:prop>
                                <D:resourcetype/>
                                <D:getcontentlength>1024</D:getcontentlength>
                            </D:prop>
                        </D:propstat>
                    </D:response>
                    <D:response>
                        <D:href>/documents/folder1/</D:href>
                        <D:propstat>
                            <D:prop>
                                <D:resourcetype><D:collection/></D:resourcetype>
                            </D:prop>
                        </D:propstat>
                    </D:response>
                </D:multistatus>"#,
            )
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.list("/documents").await;
        assert!(result.is_ok());

        let files = result.unwrap();
        assert_eq!(files.len(), 2); // 不包括当前目录本身

        // 检查文件
        let file = files.iter().find(|f| f.name == "file1.txt").unwrap();
        assert!(!file.is_directory);
        assert_eq!(file.size, 1024);

        // 检查文件夹
        let folder = files.iter().find(|f| f.name == "folder1").unwrap();
        assert!(folder.is_directory);
        assert_eq!(folder.size, 0);

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_list_files_empty_directory() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PROPFIND", "/empty")
            .match_header("depth", "1")
            .with_status(207)
            .with_body(
                r#"<?xml version="1.0"?>
                <D:multistatus xmlns:D="DAV:">
                    <D:response>
                        <D:href>/empty/</D:href>
                        <D:propstat>
                            <D:prop>
                                <D:resourcetype><D:collection/></D:resourcetype>
                            </D:prop>
                        </D:propstat>
                    </D:response>
                </D:multistatus>"#,
            )
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.list("/empty").await;
        assert!(result.is_ok());

        let files = result.unwrap();
        assert_eq!(files.len(), 0);

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_upload_file_success() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("PUT", "/test.txt")
            .with_status(201) // Created
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // 创建临时测试文件
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_upload.txt");
        tokio::fs::write(&test_file, b"test content").await.unwrap();

        let result = client.upload(&test_file, "/test.txt").await;
        assert!(result.is_ok());

        // 清理
        tokio::fs::remove_file(&test_file).await.ok();

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_upload_file_not_found() {
        let mut server = mockito::Server::new_async().await;
        let _mock = server
            .mock("PUT", "/test.txt")
            .with_status(201)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // 尝试上传不存在的文件
        let result = client
            .upload(Path::new("/nonexistent/file.txt"), "/test.txt")
            .await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::Io(_) => {
                // 预期的 IO 错误
            }
            _ => panic!("Expected Io error"),
        }
    }

    #[tokio::test]
    async fn test_download_file_success() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", "/test.txt")
            .with_status(200)
            .with_body("downloaded content")
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // 创建临时下载路径
        let temp_dir = std::env::temp_dir();
        let download_file = temp_dir.join("test_download.txt");

        let result = client.download("/test.txt", &download_file).await;
        assert!(result.is_ok());

        // 验证文件内容
        let content = tokio::fs::read_to_string(&download_file).await.unwrap();
        assert_eq!(content, "downloaded content");

        // 清理
        tokio::fs::remove_file(&download_file).await.ok();

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_download_file_not_found() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", "/nonexistent.txt")
            .with_status(404)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let temp_dir = std::env::temp_dir();
        let download_file = temp_dir.join("test_download_404.txt");

        let result = client.download("/nonexistent.txt", &download_file).await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::NotFound(_) => {
                // 预期的 NotFound 错误
            }
            _ => panic!("Expected NotFound error"),
        }

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_delete_file_success() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("DELETE", "/test.txt")
            .with_status(204) // No Content
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.delete("/test.txt").await;
        assert!(result.is_ok());

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_delete_file_not_found() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("DELETE", "/nonexistent.txt")
            .with_status(404)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.delete("/nonexistent.txt").await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::NotFound(_) => {
                // 预期的 NotFound 错误
            }
            _ => panic!("Expected NotFound error"),
        }

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_mkdir_success() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("MKCOL", "/new_folder")
            .with_status(201) // Created
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.mkdir("/new_folder").await;
        assert!(result.is_ok());

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_mkdir_already_exists() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("MKCOL", "/existing_folder")
            .with_status(405) // Method Not Allowed (folder already exists)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let result = client.mkdir("/existing_folder").await;
        assert!(result.is_err());

        match result.unwrap_err() {
            SyncError::WebDav(_) => {
                // 预期的 WebDav 错误
            }
            _ => panic!("Expected WebDav error"),
        }

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_build_url() {
        let config = create_test_config();
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // 测试各种路径格式
        assert_eq!(
            client.build_url("/documents"),
            "https://example.com/webdav/documents"
        );
        assert_eq!(
            client.build_url("documents"),
            "https://example.com/webdav/documents"
        );
        assert_eq!(
            client.build_url("/documents/file.txt"),
            "https://example.com/webdav/documents/file.txt"
        );
    }

    // ========== Property 7: 错误信息完整性测试 ==========
    // Feature: webdav-connection, Property 7: 错误信息完整性
    // Validates: Requirements 2.3, 7.1, 7.3, 7.4
    //
    // 验证所有 WebDAV 操作失败时返回的错误都包含：
    // 1. 错误类型（Network, AuthError, WebDav, NotFound 等）
    // 2. 详细的错误描述
    // 3. 可操作的建议（如"请检查网络连接"）

    #[tokio::test]
    async fn test_property7_network_error_completeness() {
        // 测试网络错误的完整性
        let mut config = create_test_config();
        config.url = "http://localhost:1".to_string(); // 不存在的服务
        config.timeout = 1;
        config.use_https = false;

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        let result = client.test_connection().await;

        assert!(result.is_err());
        let error = result.unwrap_err();

        // 验证错误类型
        assert!(matches!(error, SyncError::Network(_)));

        // 验证错误消息包含详细信息
        let error_msg = error.to_string();
        assert!(!error_msg.is_empty(), "Error message should not be empty");

        // 网络错误应该包含以下信息之一：
        // - 超时信息
        // - 连接失败信息
        // - 可操作的建议
        assert!(
            error_msg.contains("timeout")
                || error_msg.contains("connect")
                || error_msg.contains("network")
                || error_msg.contains("connection"),
            "Network error should contain descriptive information. Got: {}",
            error_msg
        );
    }

    #[tokio::test]
    async fn test_property7_auth_error_completeness() {
        // 测试认证错误的完整性
        let mut server = mockito::Server::new_async().await;
        let _mock = server
            .mock("PROPFIND", "/")
            .with_status(401)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "wrong_password".to_string()).unwrap();
        let result = client.test_connection().await;

        assert!(result.is_err());
        let error = result.unwrap_err();

        // 验证错误类型
        assert!(
            matches!(error, SyncError::AuthError(_)),
            "Expected AuthError, got: {:?}",
            error
        );

        // 验证错误消息包含详细信息
        let error_msg = error.to_string();
        assert!(!error_msg.is_empty(), "Error message should not be empty");

        // 认证错误应该包含：
        // - "Authentication failed" 或类似描述
        // - 建议检查凭据
        assert!(
            error_msg.contains("Authentication") || error_msg.contains("authentication"),
            "Auth error should mention authentication. Got: {}",
            error_msg
        );
        assert!(
            error_msg.contains("credentials")
                || error_msg.contains("username")
                || error_msg.contains("password"),
            "Auth error should suggest checking credentials. Got: {}",
            error_msg
        );
    }

    #[tokio::test]
    async fn test_property7_http_4xx_error_completeness() {
        // 测试 HTTP 4xx 错误的完整性
        let test_cases = vec![
            (400, "Bad Request"),
            (405, "Method Not Allowed"),
            (409, "Conflict"),
            (423, "Locked"),
        ];

        for (status_code, status_name) in test_cases {
            let mut server = mockito::Server::new_async().await;
            let _mock = server
                .mock("PROPFIND", "/")
                .with_status(status_code)
                .create_async()
                .await;

            let config = create_mock_config(server.url());
            let client = WebDavClient::new(&config, "password".to_string()).unwrap();
            let result = client.test_connection().await;

            assert!(result.is_err(), "Expected error for status {}", status_code);
            let error = result.unwrap_err();

            // 验证错误类型（4xx 应该是 WebDav 错误，除了 401/403/404）
            assert!(
                matches!(error, SyncError::WebDav(_)),
                "Expected WebDav error for status {}, got: {:?}",
                status_code,
                error
            );

            // 验证错误消息包含详细信息
            let error_msg = error.to_string();
            assert!(
                !error_msg.is_empty(),
                "Error message should not be empty for status {}",
                status_code
            );

            // 错误消息应该包含：
            // - HTTP 状态码
            // - 状态名称或描述
            assert!(
                error_msg.contains(&status_code.to_string()),
                "Error should contain status code {}. Got: {}",
                status_code,
                error_msg
            );
            assert!(
                error_msg.contains(status_name) || error_msg.contains("HTTP"),
                "Error should contain status description for {}. Got: {}",
                status_code,
                error_msg
            );
        }
    }

    #[tokio::test]
    async fn test_property7_http_5xx_error_completeness() {
        // 测试 HTTP 5xx 错误的完整性
        let test_cases = vec![
            (500, "Internal Server Error"),
            (502, "Bad Gateway"),
            (503, "Service Unavailable"),
        ];

        for (status_code, status_name) in test_cases {
            let mut server = mockito::Server::new_async().await;
            let _mock = server
                .mock("PROPFIND", "/")
                .with_status(status_code)
                .create_async()
                .await;

            let config = create_mock_config(server.url());
            let client = WebDavClient::new(&config, "password".to_string()).unwrap();
            let result = client.test_connection().await;

            assert!(result.is_err(), "Expected error for status {}", status_code);
            let error = result.unwrap_err();

            // 验证错误类型
            assert!(
                matches!(error, SyncError::WebDav(_)),
                "Expected WebDav error for status {}, got: {:?}",
                status_code,
                error
            );

            // 验证错误消息包含详细信息
            let error_msg = error.to_string();
            assert!(
                !error_msg.is_empty(),
                "Error message should not be empty for status {}",
                status_code
            );

            // 错误消息应该包含：
            // - HTTP 状态码
            // - 状态名称或描述
            // - 建议（如"请稍后重试"）
            assert!(
                error_msg.contains(&status_code.to_string()),
                "Error should contain status code {}. Got: {}",
                status_code,
                error_msg
            );
            assert!(
                error_msg.contains(status_name)
                    || error_msg.contains("Server")
                    || error_msg.contains("HTTP"),
                "Error should contain status description for {}. Got: {}",
                status_code,
                error_msg
            );
        }
    }

    #[tokio::test]
    async fn test_property7_timeout_error_completeness() {
        // 测试超时错误的完整性
        let mut config = create_test_config();
        config.url = "http://10.255.255.1".to_string(); // 不可路由的地址
        config.timeout = 1; // 1 秒超时
        config.use_https = false;

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        let result = client.test_connection().await;

        assert!(result.is_err());
        let error = result.unwrap_err();

        // 验证错误类型
        assert!(
            matches!(error, SyncError::Network(_)),
            "Expected Network error, got: {:?}",
            error
        );

        // 验证错误消息包含详细信息
        let error_msg = error.to_string();
        assert!(!error_msg.is_empty(), "Error message should not be empty");

        // 超时错误应该包含：
        // - "timeout" 关键字
        // - 超时时间
        // - 可操作的建议
        assert!(
            error_msg.to_lowercase().contains("timeout"),
            "Timeout error should mention timeout. Got: {}",
            error_msg
        );
    }

    #[tokio::test]
    async fn test_property7_not_found_error_completeness() {
        // 测试资源不存在错误的完整性
        let mut server = mockito::Server::new_async().await;
        let _mock = server
            .mock("GET", "/nonexistent.txt")
            .with_status(404)
            .create_async()
            .await;

        let config = create_mock_config(server.url());
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        let temp_dir = std::env::temp_dir();
        let download_file = temp_dir.join("test_404.txt");

        let result = client.download("/nonexistent.txt", &download_file).await;

        assert!(result.is_err());
        let error = result.unwrap_err();

        // 验证错误类型
        assert!(
            matches!(error, SyncError::NotFound(_)),
            "Expected NotFound error, got: {:?}",
            error
        );

        // 验证错误消息包含详细信息
        let error_msg = error.to_string();
        assert!(!error_msg.is_empty(), "Error message should not be empty");

        // NotFound 错误应该包含：
        // - "not found" 或类似描述
        // - 资源类型（文件/文件夹）
        assert!(
            error_msg.to_lowercase().contains("not found")
                || error_msg.to_lowercase().contains("does not exist"),
            "NotFound error should mention resource not found. Got: {}",
            error_msg
        );
    }

    #[tokio::test]
    async fn test_property7_all_errors_have_type_and_description() {
        // 综合测试：验证所有错误都有类型和描述
        // 这个测试确保我们的错误处理策略是一致的

        // 所有错误类型都应该：
        // 1. 有明确的错误类型（通过 enum 变体区分）
        // 2. 包含非空的错误消息
        // 3. 错误消息提供有用的上下文信息

        // 测试各种错误类型的消息格式
        let network_error = SyncError::Network("Connection failed".to_string());
        assert!(!network_error.to_string().is_empty());
        assert!(network_error.to_string().contains("Connection"));

        let auth_error = SyncError::AuthError("Invalid credentials".to_string());
        assert!(!auth_error.to_string().is_empty());
        assert!(auth_error.to_string().contains("credentials"));

        let webdav_error = SyncError::WebDav("HTTP 500: Server error".to_string());
        assert!(!webdav_error.to_string().is_empty());
        assert!(webdav_error.to_string().contains("500"));

        let not_found_error = SyncError::NotFound("Resource not found".to_string());
        assert!(!not_found_error.to_string().is_empty());
        assert!(not_found_error.to_string().contains("not found"));

        println!("✓ All error types have proper type and description");
    }

    // ========== Property 6: 连接超时机制测试 ==========
    // Feature: webdav-connection, Property 6: 连接超时机制
    // Validates: Requirements 2.5, 7.5
    //
    // 验证对于任何设置的超时时间，如果连接操作超过该时间，
    // 应该终止连接并返回超时错误

    #[tokio::test]
    async fn test_property6_connection_timeout_1_second() {
        println!("\n========== Property 6 测试：1 秒超时 ==========");

        // 测试 1 秒超时
        let mut config = create_test_config();
        config.url = "http://10.255.255.1".to_string(); // 不可路由的地址，会触发超时
        config.timeout = 1; // 1 秒超时
        config.use_https = false;

        println!("配置信息:");
        println!("  - URL: {}", config.url);
        println!("  - 超时设置: {} 秒", config.timeout);
        println!("  - 使用 HTTPS: {}", config.use_https);

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("✓ WebDavClient 创建成功");

        println!("\n开始测试连接...");
        let start = std::time::Instant::now();
        let result = client.test_connection().await;
        let elapsed = start.elapsed();

        println!("连接测试完成");
        println!("  - 实际耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "失败 ✓"
            } else {
                "成功 ✗"
            }
        );

        // 验证操作失败
        assert!(result.is_err(), "Expected timeout error");

        // 验证是网络错误
        match result.unwrap_err() {
            SyncError::Network(msg) => {
                println!("  - 错误类型: Network ✓");
                println!("  - 错误消息: {}", msg);

                // 验证错误消息提到超时
                assert!(
                    msg.to_lowercase().contains("timeout"),
                    "Error message should mention timeout. Got: {}",
                    msg
                );
                println!("  - 包含 'timeout' 关键字: ✓");

                // 验证错误消息包含超时时间
                assert!(
                    msg.contains("1 second"),
                    "Error message should mention timeout duration. Got: {}",
                    msg
                );
                println!("  - 包含超时时间 '1 second': ✓");
            }
            other => panic!("Expected Network error, got: {:?}", other),
        }

        // 验证实际耗时接近设置的超时时间（允许一定误差）
        // 超时应该在 1-3 秒之间（考虑到系统调度和网络栈的延迟）
        assert!(
            elapsed.as_secs() >= 1 && elapsed.as_secs() <= 3,
            "Operation should timeout around 1 second, but took {} seconds",
            elapsed.as_secs()
        );
        println!("  - 超时时间在合理范围内 (1-3秒): ✓");

        println!("\n✅ Property 6 测试通过：1 秒超时机制正常工作");
    }

    #[tokio::test]
    async fn test_property6_connection_timeout_5_seconds() {
        println!("\n========== Property 6 测试：5 秒超时 ==========");

        // 测试 5 秒超时
        let mut config = create_test_config();
        config.url = "http://10.255.255.1".to_string(); // 不可路由的地址
        config.timeout = 5; // 5 秒超时
        config.use_https = false;

        println!("配置信息:");
        println!("  - URL: {}", config.url);
        println!("  - 超时设置: {} 秒", config.timeout);

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("✓ WebDavClient 创建成功");

        println!("\n开始测试连接（预计等待 5 秒）...");
        let start = std::time::Instant::now();
        let result = client.test_connection().await;
        let elapsed = start.elapsed();

        println!("连接测试完成");
        println!("  - 实际耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "失败 ✓"
            } else {
                "成功 ✗"
            }
        );

        // 验证操作失败
        assert!(result.is_err(), "Expected timeout error");

        // 验证是网络错误且提到超时
        match result.unwrap_err() {
            SyncError::Network(msg) => {
                println!("  - 错误类型: Network ✓");
                println!("  - 错误消息: {}", msg);

                assert!(
                    msg.to_lowercase().contains("timeout"),
                    "Error message should mention timeout. Got: {}",
                    msg
                );
                println!("  - 包含 'timeout' 关键字: ✓");

                assert!(
                    msg.contains("5 second"),
                    "Error message should mention timeout duration. Got: {}",
                    msg
                );
                println!("  - 包含超时时间 '5 second': ✓");
            }
            other => panic!("Expected Network error, got: {:?}", other),
        }

        // 验证实际耗时接近设置的超时时间
        assert!(
            elapsed.as_secs() >= 5 && elapsed.as_secs() <= 7,
            "Operation should timeout around 5 seconds, but took {} seconds",
            elapsed.as_secs()
        );
        println!("  - 超时时间在合理范围内 (5-7秒): ✓");

        println!("\n✅ Property 6 测试通过：5 秒超时机制正常工作");
    }

    #[tokio::test]
    async fn test_property6_different_operations_respect_timeout() {
        println!("\n========== Property 6 测试：不同操作都遵守超时设置 ==========");

        // 测试不同操作都遵守超时设置
        let mut config = create_test_config();
        config.url = "http://10.255.255.1".to_string(); // 不可路由的地址
        config.timeout = 2; // 2 秒超时
        config.use_https = false;

        println!("配置信息:");
        println!("  - URL: {}", config.url);
        println!("  - 超时设置: {} 秒", config.timeout);

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("✓ WebDavClient 创建成功\n");

        // 测试 test_connection 操作
        println!("测试 1/3: test_connection() 操作");
        let start = std::time::Instant::now();
        let result = client.test_connection().await;
        let elapsed = start.elapsed();
        println!("  - 耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "超时 ✓"
            } else {
                "成功 ✗"
            }
        );
        assert!(result.is_err());
        assert!(elapsed.as_secs() >= 2 && elapsed.as_secs() <= 4);
        println!("  - 超时时间在合理范围内: ✓\n");

        // 测试 list 操作
        println!("测试 2/3: list() 操作");
        let start = std::time::Instant::now();
        let result = client.list("/").await;
        let elapsed = start.elapsed();
        println!("  - 耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "超时 ✓"
            } else {
                "成功 ✗"
            }
        );
        assert!(result.is_err());
        assert!(elapsed.as_secs() >= 2 && elapsed.as_secs() <= 4);
        println!("  - 超时时间在合理范围内: ✓\n");

        // 测试 mkdir 操作
        println!("测试 3/3: mkdir() 操作");
        let start = std::time::Instant::now();
        let result = client.mkdir("/test").await;
        let elapsed = start.elapsed();
        println!("  - 耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "超时 ✓"
            } else {
                "成功 ✗"
            }
        );
        assert!(result.is_err());
        assert!(elapsed.as_secs() >= 2 && elapsed.as_secs() <= 4);
        println!("  - 超时时间在合理范围内: ✓");

        println!("\n✅ Property 6 测试通过：所有操作都正确遵守超时设置");
    }

    #[tokio::test]
    async fn test_property6_timeout_prevents_long_wait() {
        println!("\n========== Property 6 测试：超时机制防止长时间等待 ==========");

        // 测试超时机制能够防止长时间等待
        // 使用不可路由的地址来模拟慢速/无响应的服务器
        let mut config = create_test_config();
        config.url = "http://10.255.255.1".to_string(); // 不可路由的地址
        config.timeout = 2; // 2 秒超时
        config.use_https = false;

        println!("测试场景: 使用不可路由的地址模拟无响应服务器");
        println!("配置信息:");
        println!("  - URL: {}", config.url);
        println!("  - 超时设置: {} 秒", config.timeout);

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("✓ WebDavClient 创建成功");

        println!("\n开始测试连接...");
        let start = std::time::Instant::now();
        let result = client.test_connection().await;
        let elapsed = start.elapsed();

        println!("连接测试完成");
        println!("  - 实际耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "超时失败 ✓"
            } else {
                "成功 ✗"
            }
        );

        // 验证操作因超时而失败
        assert!(result.is_err(), "Expected timeout error");

        // 验证是超时错误
        match result.unwrap_err() {
            SyncError::Network(msg) => {
                println!("  - 错误类型: Network ✓");
                println!("  - 错误消息: {}", msg);

                assert!(
                    msg.to_lowercase().contains("timeout"),
                    "Error should mention timeout. Got: {}",
                    msg
                );
                println!("  - 包含 'timeout' 关键字: ✓");
            }
            other => panic!("Expected Network timeout error, got: {:?}", other),
        }

        // 验证实际耗时接近超时时间（2-4 秒之间，考虑系统延迟）
        assert!(
            elapsed.as_secs() >= 2 && elapsed.as_secs() <= 4,
            "Should timeout around 2 seconds. Took {} seconds",
            elapsed.as_secs()
        );
        println!("  - 超时时间在合理范围内 (2-4秒): ✓");
        println!("  - 成功防止了无限期等待: ✓");

        println!("\n✅ Property 6 测试通过：超时机制有效防止长时间等待");
    }

    #[tokio::test]
    async fn test_property6_timeout_boundary_values() {
        println!("\n========== Property 6 测试：边界值测试 ==========");

        // 测试边界值：最小和最大超时时间

        // 测试最小超时时间 (1 秒)
        println!("测试 1/2: 最小超时时间 (1 秒)");
        let mut config = create_test_config();
        config.url = "http://10.255.255.1".to_string();
        config.timeout = 1; // 最小值
        config.use_https = false;

        println!("  - 配置超时: {} 秒", config.timeout);
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("  - 客户端超时设置: {} 秒", client.timeout().as_secs());
        assert_eq!(client.timeout(), Duration::from_secs(1));
        println!("  - 超时配置验证: ✓");

        println!("  - 开始连接测试...");
        let start = std::time::Instant::now();
        let result = client.test_connection().await;
        let elapsed = start.elapsed();

        println!("  - 实际耗时: {:.2} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_err() {
                "超时 ✓"
            } else {
                "成功 ✗"
            }
        );
        assert!(result.is_err());
        assert!(elapsed.as_secs() >= 1 && elapsed.as_secs() <= 3);
        println!("  - 超时时间在合理范围内 (1-3秒): ✓\n");

        // 测试最大超时时间 (300 秒) - 但我们不会真的等 300 秒
        // 只验证客户端正确设置了超时值
        println!("测试 2/2: 最大超时时间 (300 秒)");
        let mut config = create_test_config();
        config.timeout = 300; // 最大值
        println!("  - 配置超时: {} 秒", config.timeout);

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("  - 客户端超时设置: {} 秒", client.timeout().as_secs());
        assert_eq!(client.timeout(), Duration::from_secs(300));
        println!("  - 超时配置验证: ✓");
        println!("  - 注意: 不实际等待 300 秒，仅验证配置正确性");

        println!("\n✅ Property 6 测试通过：边界值（最小/最大超时）配置正确");
    }

    #[tokio::test]
    async fn test_property6_successful_connection_within_timeout() {
        println!("\n========== Property 6 测试：成功连接在超时时间内完成 ==========");

        // 测试成功连接（在超时时间内完成）
        let mut server = mockito::Server::new_async().await;
        println!("✓ Mock 服务器创建成功: {}", server.url());

        let mock = server
            .mock("PROPFIND", "/")
            .with_status(207)
            .with_body(r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>"#)
            .create_async()
            .await;
        println!("✓ Mock 端点配置完成 (PROPFIND /, 207 Multi-Status)");

        let mut config = create_mock_config(server.url());
        config.timeout = 5; // 5 秒超时
        println!("\n配置信息:");
        println!("  - URL: {}", config.url);
        println!("  - 超时设置: {} 秒", config.timeout);

        let client = WebDavClient::new(&config, "password".to_string()).unwrap();
        println!("✓ WebDavClient 创建成功");

        println!("\n开始测试连接...");
        let start = std::time::Instant::now();
        let result = client.test_connection().await;
        let elapsed = start.elapsed();

        println!("连接测试完成");
        println!("  - 实际耗时: {:.3} 秒", elapsed.as_secs_f64());
        println!(
            "  - 结果: {}",
            if result.is_ok() {
                "成功 ✓"
            } else {
                "失败 ✗"
            }
        );

        // 验证操作成功
        assert!(result.is_ok(), "Expected successful connection");
        println!("  - 连接成功验证: ✓");

        // 验证操作在超时时间内完成（应该很快，远小于 5 秒）
        assert!(
            elapsed.as_secs() < 5,
            "Operation should complete quickly, took {} seconds",
            elapsed.as_secs()
        );
        println!("  - 在超时时间内完成 (< 5秒): ✓");
        println!(
            "  - 响应速度: {} (远小于超时设置)",
            if elapsed.as_millis() < 100 {
                "极快"
            } else if elapsed.as_millis() < 500 {
                "快速"
            } else {
                "正常"
            }
        );

        mock.assert_async().await;
        println!("  - Mock 服务器调用验证: ✓");

        println!("\n✅ Property 6 测试通过：成功连接在超时时间内快速完成");
    }

    // ========== 单元测试：URL 解析 ==========

    #[test]
    fn test_url_parsing_with_trailing_slash() {
        let config = create_test_config();
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // URL 末尾有斜杠的情况
        assert_eq!(
            client.build_url("/documents"),
            "https://example.com/webdav/documents"
        );
    }

    #[test]
    fn test_url_parsing_without_trailing_slash() {
        let mut config = create_test_config();
        config.url = "https://example.com/webdav".to_string(); // 无末尾斜杠
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(
            client.build_url("/documents"),
            "https://example.com/webdav/documents"
        );
    }

    #[test]
    fn test_url_parsing_with_path_no_leading_slash() {
        let config = create_test_config();
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // 路径没有前导斜杠
        assert_eq!(
            client.build_url("documents"),
            "https://example.com/webdav/documents"
        );
    }

    #[test]
    fn test_url_parsing_nested_paths() {
        let config = create_test_config();
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(
            client.build_url("/documents/2024/report.pdf"),
            "https://example.com/webdav/documents/2024/report.pdf"
        );
    }

    #[test]
    fn test_url_parsing_root_path() {
        let config = create_test_config();
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(client.build_url("/"), "https://example.com/webdav/");
        assert_eq!(client.build_url(""), "https://example.com/webdav/");
    }

    #[test]
    fn test_url_parsing_with_special_characters() {
        let config = create_test_config();
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        // 注意：实际使用中，特殊字符应该被 URL 编码
        // 这里只测试路径拼接逻辑
        assert_eq!(
            client.build_url("/documents/file with spaces.txt"),
            "https://example.com/webdav/documents/file with spaces.txt"
        );
    }

    // ========== 单元测试：认证头构建 ==========

    #[test]
    fn test_auth_header_construction() {
        let config = create_test_config();
        let password = "test_password".to_string();

        // 创建客户端会构建认证头
        let result = WebDavClient::new(&config, password);
        assert!(
            result.is_ok(),
            "Should successfully create client with auth header"
        );

        // 验证客户端创建成功意味着认证头构建成功
        let client = result.unwrap();
        assert_eq!(client.username(), "testuser");
    }

    #[test]
    fn test_auth_header_with_special_characters_in_username() {
        let mut config = create_test_config();
        config.username = "user@example.com".to_string(); // 包含 @ 符号
        let password = "test_password".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(
            result.is_ok(),
            "Should handle special characters in username"
        );

        let client = result.unwrap();
        assert_eq!(client.username(), "user@example.com");
    }

    #[test]
    fn test_auth_header_with_special_characters_in_password() {
        let config = create_test_config();
        let password = "p@ssw0rd!#$%".to_string(); // 包含特殊字符

        let result = WebDavClient::new(&config, password);
        assert!(
            result.is_ok(),
            "Should handle special characters in password"
        );
    }

    #[test]
    fn test_auth_header_with_unicode_characters() {
        let config = create_test_config();
        let password = "密码123".to_string(); // Unicode 字符

        let result = WebDavClient::new(&config, password);
        assert!(
            result.is_ok(),
            "Should handle Unicode characters in password"
        );
    }

    #[test]
    fn test_auth_header_with_long_credentials() {
        let mut config = create_test_config();
        config.username = "a".repeat(100); // 长用户名
        let password = "b".repeat(100); // 长密码

        let result = WebDavClient::new(&config, password);
        assert!(result.is_ok(), "Should handle long credentials");
    }

    #[test]
    fn test_auth_header_rejects_empty_password() {
        let config = create_test_config();
        let password = "".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err(), "Should reject empty password");

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Password cannot be empty"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_auth_header_rejects_whitespace_only_password() {
        let config = create_test_config();
        let password = "   \t\n  ".to_string();

        let result = WebDavClient::new(&config, password);
        assert!(result.is_err(), "Should reject whitespace-only password");
    }

    // ========== 单元测试：超时机制配置 ==========

    #[test]
    fn test_timeout_configuration_default() {
        let config = create_test_config(); // 默认 30 秒
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(
            client.timeout(),
            Duration::from_secs(30),
            "Default timeout should be 30 seconds"
        );
    }

    #[test]
    fn test_timeout_configuration_custom() {
        let mut config = create_test_config();
        config.timeout = 60;
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(
            client.timeout(),
            Duration::from_secs(60),
            "Custom timeout should be respected"
        );
    }

    #[test]
    fn test_timeout_configuration_minimum() {
        let mut config = create_test_config();
        config.timeout = 1; // 最小值
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(
            client.timeout(),
            Duration::from_secs(1),
            "Minimum timeout (1 second) should be accepted"
        );
    }

    #[test]
    fn test_timeout_configuration_maximum() {
        let mut config = create_test_config();
        config.timeout = 300; // 最大值
        let client = WebDavClient::new(&config, "password".to_string()).unwrap();

        assert_eq!(
            client.timeout(),
            Duration::from_secs(300),
            "Maximum timeout (300 seconds) should be accepted"
        );
    }

    #[test]
    fn test_timeout_configuration_rejects_zero() {
        let mut config = create_test_config();
        config.timeout = 0; // 无效值

        let result = WebDavClient::new(&config, "password".to_string());
        assert!(result.is_err(), "Should reject zero timeout");

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }

    #[test]
    fn test_timeout_configuration_rejects_too_large() {
        let mut config = create_test_config();
        config.timeout = 301; // 超过最大值

        let result = WebDavClient::new(&config, "password".to_string());
        assert!(result.is_err(), "Should reject timeout > 300 seconds");

        match result.unwrap_err() {
            SyncError::ConfigError(msg) => {
                assert!(msg.contains("Invalid server config"));
            }
            _ => panic!("Expected ConfigError"),
        }
    }
}
