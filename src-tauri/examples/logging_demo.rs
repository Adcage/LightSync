/// 日志系统使用示例
///
/// 运行方式：
/// ```bash
/// cargo run --example logging_demo
/// ```

use tracing::{debug, error, info, instrument, warn};

#[tokio::main]
async fn main() {
    // 初始化日志系统
    tracing_subscriber::fmt()
        .with_target(true)
        .with_thread_ids(true)
        .with_line_number(true)
        .init();

    info!("========== 日志系统示例 ==========");

    // 1. 基本日志级别
    demo_log_levels();

    // 2. 结构化字段
    demo_structured_fields();

    // 3. 函数追踪
    demo_function_tracing().await;

    // 4. 错误处理
    demo_error_handling().await;

    info!("========== 示例结束 ==========");
}

/// 演示不同日志级别
fn demo_log_levels() {
    info!("\n--- 日志级别示例 ---");

    debug!("这是 DEBUG 级别日志（开发环境）");
    info!("这是 INFO 级别日志（生产环境默认）");
    warn!("这是 WARN 级别日志（警告信息）");
    error!("这是 ERROR 级别日志（错误信息）");
}

/// 演示结构化字段
fn demo_structured_fields() {
    info!("\n--- 结构化字段示例 ---");

    let server_id = "server-123";
    let url = "https://example.com/webdav";
    let timeout = 30;

    // ✅ 推荐：使用结构化字段
    info!(
        server_id = %server_id,
        url = %url,
        timeout_secs = timeout,
        "服务器配置已加载"
    );

    // ❌ 不推荐：字符串拼接
    info!("服务器配置已加载: {} {} {}", server_id, url, timeout);
}

/// 演示函数追踪
#[instrument]
async fn demo_function_tracing() {
    info!("\n--- 函数追踪示例 ---");

    let result = connect_to_server("https://example.com", 30).await;
    info!(success = result.is_ok(), "连接结果");
}

/// 模拟连接服务器
#[instrument(skip(timeout))]  // 跳过不重要的参数
async fn connect_to_server(url: &str, timeout: u32) -> Result<(), String> {
    info!("开始连接");
    debug!(timeout_secs = timeout, "连接参数");

    // 模拟异步操作
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    info!("连接成功");
    Ok(())
}

/// 演示错误处理
async fn demo_error_handling() {
    info!("\n--- 错误处理示例 ---");

    match risky_operation().await {
        Ok(value) => {
            info!(value = %value, "操作成功");
        }
        Err(e) => {
            error!(error = %e, "操作失败");
        }
    }
}

/// 模拟可能失败的操作
async fn risky_operation() -> Result<String, String> {
    warn!("执行风险操作");
    Err("模拟错误".to_string())
}
