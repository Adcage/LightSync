---
inclusion: fileMatch
fileMatchPattern: 'src-tauri/**/*.rs'
---

# Backend Development Rules (Rust)

精通 Rust、Tauri 2.0 的后端专家。编写高性能、安全、可维护的代码。

## 核心原则

- **Idiomatic Rust**：利用类型系统，避免 unsafe
- **性能**：内存 < 50MB，CPU < 10%，启动 < 2s
- **错误处理**：使用 Result<T>，禁止 unwrap/panic
- **简洁可测**：最小修改，DRY，完整测试

## 命名规范

**原则**：遵循 Rust 官方命名约定，提高代码可读性

```rust
// 函数/变量: snake_case
fn get_config(key: &str) -> Result<String> { }

// 类型/结构体/Trait: PascalCase
struct AppConfig { }
enum SyncError { }

// 常量: SCREAMING_SNAKE_CASE
const MAX_RETRY: u32 = 3;

// 模块: snake_case
mod config_watcher;
```

**参数类型**：只读用 `&str`/`&T`，需要所有权用 `String`/`T`

**导入顺序**：标准库 → 外部 crate → 内部模块

## 错误处理

**规范**：

- 返回 `Result<T>`，禁止 `unwrap()`/`expect()`（测试除外）
- 使用 `thiserror` 定义统一错误类型
- 提供详细上下文（包含失败的值）

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SyncError {
    #[error("Config error: {0}")]
    ConfigError(String),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, SyncError>;

// ✅ 使用 ? 传播
async fn load(path: &Path) -> Result<AppConfig> {
    let content = tokio::fs::read_to_string(path).await?;
    Ok(serde_json::from_str(&content)?)
}

// ✅ 添加上下文
fn parse_url(url: &str) -> Result<()> {
    url::Url::parse(url)
        .map_err(|e| SyncError::ConfigError(format!("Invalid URL '{}': {}", url, e)))?;
    Ok(())
}

// ❌ 禁止：会导致 panic
// let config = load_config().unwrap();
```

## 日志系统

**使用 `tracing` 进行结构化日志**：

- 生产代码使用 `tracing` 宏（info!, debug!, warn!, error!）

**日志级别**：

```rust
use tracing::{info, debug, warn, error, instrument};

// 日志级别
error!(error = %e, "数据库连接失败");        // 严重错误
warn!(timeout = %cfg.timeout, "超时设置较大"); // 警告
info!(server_id = %id, "连接成功");          // 重要信息
debug!(url = %url, "发起请求");              // 调试信息

// 函数追踪（自动记录参数和返回值）
#[instrument(skip(password))]  // 跳过敏感参数
async fn test_connection(&self, password: &str) -> Result<String> {
    info!("开始测试连接");
    Ok("success".into())
}

// ✅ 结构化字段（便于分析）
info!(server_id = %id, url = %url, timeout = cfg.timeout, "配置已加载");

// ❌ 避免字符串拼接
// info!("配置已加载: {} {}", id, url);
```

**敏感信息保护**：

```rust
#[instrument(skip(password))]  // 不记录密码
async fn auth(user: &str, password: &str) -> Result<()> {
    debug!(username = %user, "开始认证");
    Ok(())
}
```

## Tauri 命令

**规范**：

- 所有命令使用 `async`（即使不需要异步）
- 返回 `Result<T>`（统一错误处理）
- 在 `lib.rs` 中注册所有命令
- 使用 `tracing` 记录关键操作

```rust
#[tauri::command]
async fn get_config(app: AppHandle) -> Result<AppConfig> {
    let store = app.store(CONFIG_STORE_FILE)
        .map_err(|e| SyncError::ConfigError(format!("Store: {}", e)))?;

    if let Some(value) = store.get("app_config") {
        return Ok(serde_json::from_value(value.clone())?);
    }
    Ok(AppConfig::default())
}
```

**状态管理**：需要跨命令共享数据时使用

```rust
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

struct AppState {
    config: Arc<Mutex<AppConfig>>,
}

#[tauri::command]
async fn get_state(state: State<'_, AppState>) -> Result<AppConfig> {
    Ok(state.config.lock().await.clone())
}
```

## 数据结构

**序列化规范**：

- 使用 `#[serde(rename_all = "camelCase")]`（前端使用驼峰命名）
- 实现 `Default` trait（提供默认值）
- 添加 `validate()` 方法（验证字段有效性）

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]  // snake_case → camelCase
pub struct AppConfig {
    pub version: String,
    pub auto_start: bool,        // → autoStart
    pub sync_folders: Vec<SyncFolder>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: "1.0.0".into(),
            auto_start: false,
            sync_folders: Vec::new(),
        }
    }
}

impl WebDavServerConfig {
    pub fn validate(&self) -> Result<()> {
        if self.name.trim().is_empty() {
            return Err(SyncError::ConfigError("Name empty".into()));
        }
        if self.timeout < 1 || self.timeout > 300 {
            return Err(SyncError::ConfigError("Timeout 1-300s".into()));
        }
        Ok(())
    }
}
```

## 异步编程

**何时使用**：I/O 操作、长时间任务、并发执行

**禁止阻塞操作**：

- ❌ `std::fs::read()` → ✅ `tokio::fs::read()`
- ❌ `std::thread::sleep()` → ✅ `tokio::time::sleep()`

````rust
use tokio::{fs, time::{sleep, Duration}};

async fn sync_file(path: &Path) -> Result<()> {
    let content = fs::read(path).await?;
    sleep(Duration::from_secs(1)).await;
    Ok(())
}

**并发控制**：使用 `tokio::spawn` 处理多个任务

```rust
async fn sync_multiple(files: Vec<PathBuf>) -> Result<()> {
    let handles: Vec<_> = files.into_iter()
        .map(|f| tokio::spawn(async move { sync_file(&f).await }))
        .collect();

    for h in handles {
        h.await??;
    }
    Ok(())
}
````

## 性能优化

**内存管理原则**：

- 只读操作用引用 `&T`（避免克隆）
- 需要修改才获取所有权
- 多线程共享用 `Arc<T>`（引用计数）

```rust
// ✅ 只读用引用
fn process(config: &AppConfig) -> Result<()> {
    println!("{}", config.version);
    Ok(())
}

// ✅ 需要修改才克隆
fn update(mut config: AppConfig) -> AppConfig {
    config.version = "2.0.0".into();
    config
}

// ✅ 多线程共享用 Arc
use std::sync::Arc;
let config = Arc::new(AppConfig::default());
let clone = Arc::clone(&config);  // 只增加引用计数，不复制数据
```

**集合优化**：

- 预分配容量（避免多次重新分配）
- 使用迭代器（避免中间分配）

```rust
// ✅ 预分配容量
let mut items = Vec::with_capacity(100);

// ✅ 迭代器链式调用（零成本抽象）
let sum: i32 = vec![1,2,3,4,5]
    .iter()
    .filter(|&&x| x > 2)
    .sum();
```

## 测试

**要求**：

- 每个模块必须有测试
- 测试覆盖：正常情况 + 错误情况 + 边界情况
- 验证序列化（确保 camelCase）
- **使用 `println!()` 输出测试信息**：清晰展示测试内容和结果

**测试输出参考**：

```rust
#[tokio::test]
async fn test_property_example() {
    println!("\n========== 测试：功能描述 ==========");

    // 1. 显示测试配置
    println!("配置信息:");
    println!("  - 参数1: {}", value1);
    println!("  - 参数2: {}", value2);

    // 2. 显示执行步骤
    println!("\n开始测试...");
    let result = some_operation().await;

    // 3. 显示测试结果
    println!("测试完成");
    println!("  - 实际结果: {:?}", result);
    println!("  - 验证状态: {}", if result.is_ok() { "✓" } else { "✗" });

    // 4. 断言验证
    assert!(result.is_ok());
    println!("  - 断言通过: ✓");

    println!("\n✅ 测试通过：功能正常工作");
}
```

**基础测试示例**：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default() {
        println!("\n测试：默认配置");
        let config = AppConfig::default();

        println!("  - version: {}", config.version);
        assert_eq!(config.version, "1.0.0");

        println!("  - auto_start: {}", config.auto_start);
        assert!(!config.auto_start);

        println!("✓ 默认配置测试通过");
    }

    #[test]
    fn test_serialization() {
        println!("\n测试：序列化（camelCase）");
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();

        println!("  - JSON: {}", json);
        assert!(json.contains("autoStart"));
        println!("✓ 包含 camelCase 字段");
    }

    #[test]
    fn test_validation_error() {
        println!("\n测试：验证错误处理");
        let mut config = WebDavServerConfig::default();
        config.name = "".into();

        let result = config.validate();
        println!("  - 空名称验证: {}", if result.is_err() { "拒绝 ✓" } else { "接受 ✗" });
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_async() {
        println!("\n测试：异步操作");
        let result = load_config("test.json").await;
        println!("  - 加载结果: {}", if result.is_ok() { "成功 ✓" } else { "失败 ✗" });
        assert!(result.is_ok());
    }
}
```

## 文档注释

**要求**：

- 模块级文档说明功能
- 公开函数必须有文档
- 包含示例代码（可运行）

````rust
/// LightSync WebDAV 客户端
///
/// 支持文件上传/下载、目录列表、连接测试
///
/// # Example
/// ```rust
/// let client = WebDavClient::new("https://example.com");
/// client.test_connection().await?;
/// ```

/// 验证服务器配置
///
/// # Returns
/// - `Ok(())` 所有字段有效
/// - `Err(SyncError)` 包含错误描述
pub fn validate(&self) -> Result<()> {
    // 实现
}
````

## 安全性

**输入验证**：所有外部输入必须验证

```rust
#[tauri::command]
async fn update_url(url: String) -> Result<()> {
    // 1. 检查空值
    if url.trim().is_empty() {
        return Err(SyncError::ConfigError("URL empty".into()));
    }

    // 2. 验证格式
    let parsed = url::Url::parse(&url)?;

    // 3. 验证协议
    if !["http", "https"].contains(&parsed.scheme()) {
        return Err(SyncError::ConfigError("Invalid protocol".into()));
    }
    Ok(())
}
```

**敏感数据**：

- 不在日志中输出密码
- 使用系统 Keyring 存储密码（不存储在配置文件）

```rust
fn log_attempt(url: &str, user: &str) {
    println!("Connecting to {} as {}", url, user);  // ✅ 不记录密码
}
```

## 工具链

```bash
cd src-tauri
cargo clippy      # 代码检查
cargo fmt         # 格式化
cargo test        # 运行测试
```

## LightSync 规范

### 常量定义（constants.rs）

```rust
pub const APP_VERSION: &str = "1.0.0";
pub const DEFAULT_LANGUAGE: &str = "zh-CN";
pub const CONFIG_STORE_FILE: &str = ".config.dat";
```

### 模块注册（lib.rs）

```rust
mod error;
mod config;
mod webdav;

pub use error::{Result, SyncError};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            config::get_config,
            config::update_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 数据库迁移

```rust
// 使用 SQL 文件管理迁移：migrations/001_initial.sql
tauri_plugin_sql::Builder::new()
    .add_migrations("sqlite:lightsync.db", vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "initial schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ])
    .build()
```

## 开发原则

- 深入分析需求和约束
- 设计方案（错误处理、性能、安全)
- 实现代码（最 2s测试）
- 只改必要部分，保持原有风格
- 基于所有权/借用规则思考，利用类型系统防止错误
