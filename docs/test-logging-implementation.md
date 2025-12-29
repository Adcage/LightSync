# 测试日志自动初始化实现原理

## 概述

LightSync 使用 `ctor` crate 实现测试日志的自动初始化，无需在任何测试中手动调用初始化函数。

## 技术栈

- **ctor**: 0.2 - 提供构造函数属性宏
- **tracing**: 0.1 - 结构化日志框架
- **tracing-subscriber**: 0.3 - 日志订阅器
- **std::sync::Once**: 确保只初始化一次

## 实现原理

### 1. 程序加载流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. 操作系统加载测试二进制文件                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 执行 .init_array 段中的构造函数                      │
│    (Linux) 或等效机制 (Windows/macOS)                   │
│                                                          │
│    #[ctor::ctor]                                        │
│    fn init() {                                          │
│        init_test_logging();  ← 在这里自动执行           │
│    }                                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 初始化 tracing subscriber                            │
│    - 配置日志格式                                        │
│    - 设置过滤级别                                        │
│    - 注册全局订阅器                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 运行测试框架 (cargo test)                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 执行各个测试函数                                      │
│    - 日志系统已经就绪                                    │
│    - 可以直接使用 info!(), debug!() 等宏                │
└─────────────────────────────────────────────────────────┘
```

### 2. `#[ctor]` 属性的工作机制

`ctor` crate 利用了编译器和操作系统的构造函数机制：

#### Linux/Unix

```c
// 编译器生成类似这样的代码
__attribute__((constructor))
void init() {
    // 你的初始化代码
}
```

这些函数会被放入 ELF 文件的 `.init_array` 段，操作系统加载程序时会自动执行。

#### Windows

```c
// 使用 CRT 初始化段
#pragma section(".CRT$XCU", read)
__declspec(allocate(".CRT$XCU"))
void (*init_func)(void) = init;
```

#### macOS

```c
// 使用 __mod_init_func 段
__attribute__((section("__DATA,__mod_init_func")))
void (*init_func)(void) = init;
```

### 3. `std::sync::Once` 的作用

虽然 `#[ctor]` 确保函数只在程序加载时执行一次，但我们仍然使用 `Once` 作为额外保护：

```rust
static INIT: Once = Once::new();

fn init_test_logging() {
    INIT.call_once(|| {
        // 这个闭包只会执行一次
        // 即使 init_test_logging() 被多次调用
        tracing::subscriber::set_global_default(subscriber)
            .expect("Failed to set tracing subscriber");
    });
}
```

**为什么需要 `Once`？**

1. **防御性编程**: 如果有人手动调用 `init_test_logging()`，不会导致错误
2. **线程安全**: `Once` 提供线程安全的初始化保证
3. **清晰的语义**: 明确表达"只初始化一次"的意图

## 代码结构

### test_utils.rs

```rust
use std::sync::Once;
use tracing_subscriber::{fmt, EnvFilter};

static INIT: Once = Once::new();

// 私有函数，只被 #[ctor] 调用
fn init_test_logging() {
    INIT.call_once(|| {
        let subscriber = fmt()
            .with_env_filter(EnvFilter::new("debug"))
            .with_test_writer()
            .compact()
            .finish();

        tracing::subscriber::set_global_default(subscriber)
            .expect("Failed to set tracing subscriber");
    });
}

// 构造函数，自动执行
#[ctor::ctor]
fn init() {
    init_test_logging();
}
```

### lib.rs

```rust
// 只在测试时编译
#[cfg(test)]
pub mod test_utils;
```

## 使用示例

### 在测试中使用

```rust
#[cfg(test)]
mod tests {
    use tracing::info;

    #[test]
    fn test_example() {
        // 不需要任何初始化代码
        info!("测试开始");

        // 执行测试逻辑
        let result = some_function();

        info!(result = ?result, "测试结果");
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_async() {
        // 异步测试也自动支持
        info!("异步测试开始");

        let result = async_function().await;

        info!("✓ 测试通过");
        assert!(result.is_ok());
    }
}
```

### 运行测试

```bash
# 查看日志输出
cargo test -- --nocapture

# 只运行特定测试
cargo test test_example -- --nocapture

# 设置日志级别
RUST_LOG=trace cargo test -- --nocapture
```

## 优势

### ✅ 零侵入性

- 不需要在测试中添加任何初始化代码
- 不需要使用 `#[traced_test]` 等属性宏
- 测试代码保持简洁

### ✅ 全局生效

- 所有测试文件自动获得日志支持
- 同步和异步测试都支持
- 不需要在每个模块中重复配置

### ✅ 性能优化

- 只初始化一次，不会重复执行
- 使用 `Once` 保证线程安全
- 没有运行时开销

### ✅ 灵活配置

- 支持 `RUST_LOG` 环境变量
- 可以自定义日志格式
- 可以选择性启用/禁用

## 调试技巧

### 验证初始化

在测试输出中查找初始化消息：

```
2025-12-29T10:29:29.156844Z  INFO ✓ 测试日志系统已自动初始化
```

### 查看详细日志

```bash
# 显示所有级别的日志
RUST_LOG=trace cargo test -- --nocapture

# 只显示特定模块的日志
RUST_LOG=lightsync::webdav=debug cargo test -- --nocapture
```

### 禁用日志

如果需要禁用日志（例如性能测试）：

```bash
RUST_LOG=off cargo test
```

## 常见问题

### Q: 为什么看不到日志输出？

A: 确保使用 `--nocapture` 参数：

```bash
cargo test -- --nocapture
```

### Q: 可以在生产代码中使用 `#[ctor]` 吗？

A: 可以，但要谨慎：

- ✅ 适合：全局初始化、注册插件
- ❌ 不适合：依赖执行顺序的初始化
- ⚠️ 注意：构造函数的执行顺序是未定义的

### Q: `#[ctor]` 会影响编译时间吗？

A: 几乎没有影响。`ctor` 只是生成一些简单的初始化代码。

### Q: 可以有多个 `#[ctor]` 函数吗？

A: 可以，但它们的执行顺序是未定义的。如果需要顺序，应该在一个函数中按顺序调用。

## 参考资源

- [ctor crate 文档](https://docs.rs/ctor/)
- [tracing 文档](https://docs.rs/tracing/)
- [std::sync::Once 文档](https://doc.rust-lang.org/std/sync/struct.Once.html)
- [ELF 初始化和终止函数](https://refspecs.linuxbase.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/baselib---libc-start-main-.html)

## 总结

通过结合 `ctor`、`Once` 和 `tracing`，我们实现了：

1. **自动化**: 测试日志自动初始化，无需手动调用
2. **安全性**: 使用 `Once` 保证只初始化一次
3. **简洁性**: 测试代码保持简洁，专注于测试逻辑
4. **灵活性**: 支持环境变量配置和自定义格式

这种方案在保持代码简洁的同时，提供了强大的日志功能，是 Rust 测试的最佳实践之一。
