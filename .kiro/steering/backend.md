---
inclusion: fileMatch
fileMatchPattern: 'src-tauri/**/*.rs'
---

# Backend Development Rules (Rust)

你是精通 Rust、Tauri 2.0 的后端专家。编写高性能、安全、可维护的 Rust 代码，遵循 idiomatic Rust 和 LightSync 规范。

## 核心原则

- **Idiomatic Rust**：符合 Rust 习惯用法，利用类型系统
- **内存安全**：利用所有权系统，避免 unsafe
- **性能优先**：内存 < 50MB，CPU < 10%，启动 < 2s
- **错误处理**：使用 Result<T>，禁止 panic
- **简洁可测**：最小修改，DRY 原则，完整测试

## 命名规范

**原则**：遵循 Rust 官方命名约定，提高代码可读性

```rust
// 函数/变量: snake_case（Rust 标准）
fn get_config_value(key: &str) -> Result<String> { }
let is_valid = true;

// 类型/结构体/Trait: PascalCase
struct AppConfig { }
enum SyncError { }
trait ConfigManager { }

// 常量: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT: u32 = 3;

// 模块: snake_case
mod config_watcher;
```

**参数类型选择**：

- 只读字符串用 `&str`（避免分配）
- 需要所有权用 `String`
- 只读结构体用 `&T`（避免克隆）

## 项目结构

```
src-tauri/src/
├── main.rs          # 应用入口
├── lib.rs           # 命令注册
├── error.rs         # 统一错误处理
├── config.rs        # 配置管理
├── database.rs      # 数据库类型
├── constants.rs     # 常量定义
└── webdav/          # WebDAV 模块
    ├── mod.rs       # 模块入口
    ├── client.rs    # 客户端实现
    └── db.rs        # 数据库操作
```

**导入顺序**：标准库 → 外部 crate → 内部模块

```rust
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::error::{Result, SyncError};
```

## 错误处理

**原则**：

- 所有可能失败的操作返回 `Result<T>`
- 使用 `thiserror` 定义统一错误类型
- 提供详细错误上下文（包含失败的值）
- 禁止 `unwrap()`/`expect()`（测试除外）

**何时定义新错误类型**：

- 需要区分不同错误来源（配置、数据库、网络）
- 需要自动转换（`#[from]`）

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SyncError {
    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error(transparent)]  // 自动转换 std::io::Error
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, SyncError>;
```

**错误传播**：

- 简单传播用 `?`
- 需要上下文用 `map_err`（包含失败的输入值）

```rust
// ✅ 使用 ? 传播
async fn load_config(path: &Path) -> Result<AppConfig> {
    let content = tokio::fs::read_to_string(path).await?;
    Ok(serde_json::from_str(&content)?)
}

// ✅ 添加上下文（包含失败的 URL）
fn parse_url(url: &str) -> Result<()> {
    url::Url::parse(url)
        .map_err(|e| SyncError::ConfigError(
            format!("Invalid URL '{}': {}", url, e)
        ))?;
    Ok(())
}

// ❌ 禁止：会导致 panic
// let config = load_config().unwrap();
```

## Tauri 命令

**规范**：

- 所有命令使用 `async`（即使不需要异步）
- 返回 `Result<T>`（统一错误处理）
- 在 `lib.rs` 中注册所有命令

```rust
#[tauri::command]
async fn get_config(app: AppHandle) -> Result<AppConfig> {
    let store = app.store(CONFIG_STORE_FILE)
        .map_err(|e| SyncError::ConfigError(format!("Store error: {}", e)))?;

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
    config: Arc<Mutex<AppConfig>>,  // Arc: 多线程共享，Mutex: 互斥访问
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
#[serde(rename_all = "camelCase")]  // Rust snake_case → 前端 camelCase
pub struct AppConfig {
    pub version: String,
    pub auto_start: bool,        // → autoStart
    pub sync_folders: Vec<SyncFolder>,  // → syncFolders
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            auto_start: false,
            sync_folders: Vec::new(),
        }
    }
}
```

**验证逻辑**：在数据结构上实现，而非分散在各处

```rust
impl WebDavServerConfig {
    pub fn validate(&self) -> Result<()> {
        if self.name.trim().is_empty() {
            return Err(SyncError::ConfigError("Name cannot be empty".into()));
        }
        if self.timeout < 1 || self.timeout > 300 {
            return Err(SyncError::ConfigError("Timeout must be 1-300s".into()));
        }
        Ok(())
    }
}
```

## 异步编程

**何时使用异步**：

- I/O 操作（文件、网络、数据库）
- 长时间运行的任务
- 需要并发执行的操作

**禁止在异步函数中使用阻塞操作**：

- ❌ `std::fs::read()` → ✅ `tokio::fs::read()`
- ❌ `std::thread::sleep()` → ✅ `tokio::time::sleep()`

```rust
use tokio::{fs, time::{sleep, Duration}};

async fn sync_file(path: &Path) -> Result<()> {
    let content = fs::read(path).await?;  // 异步 I/O
    sleep(Duration::from_secs(1)).await;  // 异步延迟
    Ok(())
}
```

**并发控制**：使用 `tokio::spawn` 处理多个任务

```rust
async fn sync_multiple(files: Vec<PathBuf>) -> Result<()> {
    let handles: Vec<_> = files.into_iter()
        .map(|f| tokio::spawn(async move { sync_file(&f).await }))
        .collect();

    for h in handles {
        h.await??;  // 等待所有任务完成
    }
    Ok(())
}
```

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

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default() {
        let config = AppConfig::default();
        assert_eq!(config.version, "1.0.0");
        assert!(!config.auto_start);
    }

    #[test]
    fn test_serialization() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("autoStart"));  // 验证驼峰命名
    }

    #[test]
    fn test_validation_error() {
        let mut config = WebDavServerConfig::default();
        config.name = "".into();
        assert!(config.validate().is_err());  // 验证错误处理
    }

    #[tokio::test]  // 异步测试
    async fn test_async() {
        let result = load_config("test.json").await;
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

## 性能目标

- 内存（空闲/同步）：< 30MB / < 50MB
- CPU（空闲/同步）：< 1% / < 10%
- 启动时间：< 2s

## 工具链

```bash
cd src-tauri
cargo clippy      # 代码检查
cargo fmt         # 格式化
cargo test        # 运行测试
```

## 设计模式

### Builder 模式

**何时使用**：构造函数参数 > 3 个，或有可选参数

```rust
pub struct WebDavClientBuilder {
    url: String,
    timeout: Option<u64>,
}

impl WebDavClientBuilder {
    pub fn new(url: String) -> Self {
        Self { url, timeout: None }
    }

    pub fn timeout(mut self, t: u64) -> Self {
        self.timeout = Some(t);
        self
    }

    pub fn build(self) -> Result<WebDavClient> {
        Ok(WebDavClient { /* ... */ })
    }
}
```

### 类型状态模式

**何时使用**：需要在编译时保证状态转换正确性

```rust
struct Disconnected;
struct Connected;

struct Client<S = Disconnected> {
    url: String,
    _state: PhantomData<S>,
}

impl Client<Disconnected> {
    pub async fn connect(self) -> Result<Client<Connected>> {
        Ok(Client { url: self.url, _state: PhantomData })
    }
}

impl Client<Connected> {
    pub async fn upload(&self, file: &Path) -> Result<()> {
        // 只有连接后才能调用（编译时保证）
        Ok(())
    }
}
```

## 开发原则

### 系统化流程

1. 深入分析需求和约束
2. 设计方案（错误处理、性能、安全）
3. 实现代码（最佳实践 + 测试）
4. 审查优化（clippy + 性能分析）
5. 完善文档

### 最小修改

- 只改必要部分，保持原有风格
- 不重写整个文件
- 优先复用现有逻辑

### 第一性原理

- 基于所有权/借用规则思考
- 确保内存安全和线程安全
- 避免不必要的复制/分配
- 利用类型系统防止错误
