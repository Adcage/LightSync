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
pub fn init_test_logging() {
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

/// 创建测试用的 Tauri 应用句柄
///
/// 这个函数创建一个临时的测试应用环境，包括：
/// - 临时的应用数据目录
/// - 初始化的数据库
/// - 配置存储
///
/// # 返回
/// - `tauri::AppHandle`: 测试用的应用句柄
///
/// # 示例
/// ```no_run
/// use crate::test_utils::create_test_app;
///
/// #[tokio::test]
/// async fn my_test() {
///     let app = create_test_app().await;
///     // 使用 app 进行测试...
/// }
/// ```
pub async fn create_test_app() -> tauri::AppHandle {
    use std::fs;
    use uuid::Uuid;

    // 创建临时测试目录
    let test_id = Uuid::new_v4();
    let test_dir = std::env::temp_dir().join(format!("lightsync_test_{}", test_id));
    fs::create_dir_all(&test_dir).expect("Failed to create test directory");

    // 创建数据库
    let db_path = test_dir.join("lightsync.db");
    let conn = rusqlite::Connection::open(&db_path).expect("Failed to open test database");

    // 运行迁移
    conn.execute_batch(include_str!("../migrations/002_webdav_servers.sql"))
        .expect("Failed to run migration 002");
    drop(conn);

    // 创建 Tauri 应用构建器
    // 注意：在测试环境中，我们需要使用 tauri::test 功能
    // 但由于该功能需要 "test" feature，我们使用 mock 方式
    #[cfg(feature = "test")]
    {
        let app = tauri::test::mock_builder()
            .build(tauri::generate_context!())
            .expect("Failed to build test app");
        app
    }

    #[cfg(not(feature = "test"))]
    {
        // 在没有 test feature 的情况下，我们无法创建真正的 AppHandle
        // 这里返回一个占位符，实际测试需要启用 test feature
        panic!(
            "Test feature is required to create test app. Please run tests with --features test"
        );
    }
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
