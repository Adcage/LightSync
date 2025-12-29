//! 测试辅助工具
//!
//! 提供全局测试初始化和辅助函数
//!
//! 日志系统会在测试开始前自动初始化，无需手动调用。

use std::sync::Once;
use tracing_subscriber::{fmt, EnvFilter};

static INIT: Once = Once::new();

/// 初始化测试日志系统
///
/// 这个函数使用 `Once` 确保只初始化一次。
///
/// **注意**: 由于使用了 `#[ctor]` 属性，这个函数会在测试开始前自动调用，
/// 你不需要在测试中手动调用它。
fn init_test_logging() {
    INIT.call_once(|| {
        // 配置日志格式：时间 + 级别 + 消息
        let subscriber = fmt()
            .with_env_filter(
                EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("debug")),
            )
            .with_test_writer() // 使用测试专用的输出
            .with_target(false) // 不显示目标模块（简化输出）
            .with_thread_ids(false) // 不显示线程 ID
            .with_file(false) // 不显示文件名
            .with_line_number(false) // 不显示行号
            .compact() // 使用紧凑格式
            .finish();

        tracing::subscriber::set_global_default(subscriber)
            .expect("Failed to set tracing subscriber");

        tracing::info!("✓ 测试日志系统已自动初始化");
    });
}

/// 测试构造函数
///
/// 使用 `#[ctor]` 属性标记，会在测试二进制文件加载时自动执行。
/// 这确保了所有测试运行前日志系统已经初始化完成。
///
/// # 工作原理
///
/// 1. 编译器生成测试二进制文件时，会将 `#[ctor]` 标记的函数
///    注册到特殊的 `.init_array` 段（Linux）或等效机制（Windows/macOS）
///
/// 2. 操作系统加载二进制文件时，会自动执行这些构造函数
///
/// 3. 这发生在 `main()` 函数之前，也在测试框架初始化之前
///
/// 4. 因此当第一个测试运行时，日志系统已经就绪
#[ctor::ctor]
fn init() {
    init_test_logging();
}

#[cfg(test)]
mod tests {
    use tracing::info;

    #[test]
    fn test_logging_auto_initialized() {
        // 不需要调用 init_test_logging()
        // 日志系统已经自动初始化了
        info!("测试日志自动初始化");
    }

    #[tokio::test]
    async fn test_async_logging_auto_initialized() {
        // 异步测试中也不需要手动初始化
        info!("异步测试中的日志也自动工作");
    }
}
?