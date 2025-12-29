// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn main() {
    // 初始化日志系统
    init_logging();

    // 启动应用
    lightsync_lib::run()
}

/// 初始化日志系统
///
/// 开发环境：输出到控制台，级别为 debug
/// 生产环境：输出到文件，级别为 info
fn init_logging() {
    #[cfg(debug_assertions)]
    {
        // 开发环境：控制台输出
        tracing_subscriber::registry()
            .with(
                fmt::layer()
                    .with_target(true)
                    .with_thread_ids(true)
                    .with_line_number(true),
            )
            .with(
                EnvFilter::from_default_env()
                    .add_directive("lightsync=debug".parse().unwrap())
                    .add_directive("lightsync_lib=debug".parse().unwrap()),
            )
            .init();

        tracing::info!("LightSync 启动 (开发模式)");
    }

    #[cfg(not(debug_assertions))]
    {
        // 生产环境：文件输出
        use std::path::PathBuf;
        use tracing_appender::rolling;

        // 日志目录：用户数据目录/logs
        let log_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("LightSync")
            .join("logs");

        // 确保日志目录存在
        std::fs::create_dir_all(&log_dir).ok();

        // 每天滚动日志
        let file_appender = rolling::daily(log_dir, "lightsync.log");
        let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

        tracing_subscriber::registry()
            .with(fmt::layer().with_writer(non_blocking).with_ansi(false))
            .with(EnvFilter::new("lightsync=info,lightsync_lib=info"))
            .init();

        tracing::info!("LightSync 启动 (生产模式)");
    }
}
