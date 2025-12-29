# LightSync 日志系统使用指南

## 概述

LightSync 使用 `tracing` 作为日志系统，提供结构化、高性能的日志记录能力。

## 日志级别

| 级别     | 用途                   | 示例                     |
| -------- | ---------------------- | ------------------------ |
| `error!` | 严重错误，需要立即关注 | 数据库连接失败、文件损坏 |
| `warn!`  | 警告，可能导致问题     | 配置不合理、资源即将耗尽 |
| `info!`  | 重要信息，生产环境默认 | 服务启动、连接成功       |
| `debug!` | 调试信息，开发环境使用 | 函数参数、中间状态       |

## 基本使用

### 1. 导入宏

```rust
use tracing::{info, debug, warn, error};
```

### 2. 记录日志

```rust
// 简单消息
info!("应用启动");

// 带变量
let server_id = "server-123";
info!("服务器 {} 连接成功", server_id);

// 结构化字段（推荐）
info!(
    server_id = %server_id,
    url = %config.url,
    "服务器连接成功"
);
```

## 函数追踪

使用 `#[instrument]` 自动追踪函数调用：

```rust
use tracing::instrument;

#[instrument]
async fn test_connection(&self) -> Result<String> {
    info!("开始测试连接");
    // 函数参数会自动记录
    // 返回值和错误也会自动记录
    Ok("success".into())
}
```

### 跳过敏感参数

```rust
#[instrument(skip(password))]
async fn authenticate(username: &str, password: &str) -> Result<()> {
    info!("用户认证");  // 不会记录 password
    Ok(())
}
```

## 结构化字段

使用结构化字段便于日志分析和查询：

```rust
// ✅ 推荐：结构化字段
info!(
    server_id = %config.id,
    url = %config.url,
    timeout_secs = config.timeout,
    enabled = config.enabled,
    "配置已加载"
);

// ❌ 不推荐：字符串拼接
info!("配置已加载: {} {} {} {}",
    config.id, config.url, config.timeout, config.enabled);
```

### 字段格式化

- `%` - Display 格式化（适合大多数类型）
- `?` - Debug 格式化（适合复杂类型）
- 无前缀 - 直接使用（适合数字、布尔值）

```rust
info!(
    url = %url,           // Display
    config = ?config,     // Debug
    timeout = timeout,    // 直接使用
    "配置信息"
);
```

## 敏感信息保护

**永远不要记录密码、密钥等敏感信息！**

```rust
// ✅ 正确：跳过密码
#[instrument(skip(password))]
async fn connect(url: &str, username: &str, password: &str) -> Result<()> {
    info!(url = %url, username = %username, "开始连接");
    Ok(())
}

// ✅ 正确：使用占位符
info!(server = %url, "连接到服务器（密码已隐藏）");

// ❌ 错误：记录密码
error!("认证失败: {} {}", username, password);  // 不要这样做！
```

## 错误处理

记录错误时包含上下文信息：

```rust
match client.test_connection().await {
    Ok(server_type) => {
        info!(
            server_id = %config.id,
            server_type = %server_type,
            "连接测试成功"
        );
    }
    Err(e) => {
        error!(
            server_id = %config.id,
            url = %config.url,
            error = %e,
            "连接测试失败"
        );
    }
}
```

## 测试中的日志

### 方式 1：使用 `tracing-test`（复杂测试）

```rust
use tracing_test::traced_test;

#[traced_test]
#[tokio::test]
async fn test_with_tracing() {
    info!("测试开始");
    let result = some_operation().await;
    assert!(result.is_ok());
    // 日志会自动捕获和显示
}
```

### 方式 2：使用 `println!`（简单测试）

```rust
#[tokio::test]
async fn test_with_println() {
    println!("\n========== 测试：功能描述 ==========");
    println!("配置信息:");
    println!("  - 参数1: {}", value1);
    println!("✓ 测试通过");
}
```

## 日志配置

### 开发环境

日志输出到控制台，级别为 `debug`：

```bash
# 运行应用
cargo run

# 运行测试（显示日志）
cargo test -- --nocapture
```

### 生产环境

日志输出到文件，级别为 `info`：

- **Windows**: `%APPDATA%\LightSync\logs\lightsync.log`
- **macOS**: `~/Library/Application Support/LightSync/logs/lightsync.log`
- **Linux**: `~/.local/share/LightSync/logs/lightsync.log`

日志文件每天滚动，自动创建新文件。

### 环境变量控制

使用 `RUST_LOG` 环境变量调整日志级别：

```bash
# 显示所有 debug 日志
RUST_LOG=debug cargo run

# 只显示 lightsync 的 debug 日志
RUST_LOG=lightsync=debug cargo run

# 显示特定模块的日志
RUST_LOG=lightsync::webdav=trace cargo run
```

## 最佳实践

### 1. 选择合适的日志级别

```rust
// ✅ 正确使用
error!("数据库连接失败");           // 严重错误
warn!("配置文件不存在，使用默认值");  // 警告
info!("WebDAV 服务器连接成功");      // 重要信息
debug!("请求参数: {:?}", params);    // 调试信息
```

### 2. 提供足够的上下文

```rust
// ✅ 好：包含上下文
error!(
    server_id = %id,
    url = %url,
    error = %e,
    "连接失败"
);

// ❌ 差：缺少上下文
error!("连接失败");
```

### 3. 使用 `#[instrument]` 追踪关键函数

```rust
// ✅ 追踪重要的异步函数
#[instrument]
async fn sync_files(&self) -> Result<()> {
    // 自动记录函数调用和结果
}
```

### 4. 避免过度日志

```rust
// ❌ 不要在循环中记录过多日志
for file in files {
    debug!("处理文件: {}", file);  // 可能产生大量日志
}

// ✅ 记录汇总信息
info!(file_count = files.len(), "开始处理文件");
```

## 示例代码

查看完整示例：

```bash
# 运行日志示例
cargo run --example logging_demo
```

## 参考资源

- [tracing 文档](https://docs.rs/tracing/)
- [tracing-subscriber 文档](https://docs.rs/tracing-subscriber/)
- [LightSync Backend 开发规范](../.kiro/steering/backend.md)
