// 统一错误处理模块
mod error;
// 配置管理模块
mod config;
// 配置文件监听模块
mod config_watcher;
// 常量定义模块
mod constants;
// 数据库操作模块
mod database;
// 系统信息模块
mod system;
// WebDAV 模块
mod webdav;

// 测试辅助模块（仅在测试时编译）
#[cfg(test)]
pub mod test_utils;

// 公开导出错误类型，供其他模块使用
pub use error::{Result, SyncError};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 测试错误处理系统的命令
/// 返回一个成功的结果
#[tauri::command]
fn test_error_success() -> Result<String> {
    Ok("错误处理系统测试成功！".to_string())
}

/// 测试错误处理系统的命令
/// 返回一个错误
#[tauri::command]
fn test_error_failure() -> Result<String> {
    Err(SyncError::ConfigError("这是一个测试错误".to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(
                    "sqlite:lightsync.db",
                    vec![
                        tauri_plugin_sql::Migration {
                            version: 1,
                            description: "initial database schema",
                            sql: include_str!("../migrations/001_initial.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 2,
                            description: "add webdav_servers table",
                            sql: include_str!("../migrations/002_webdav_servers.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                    ],
                )
                .build(),
        )
        .setup(|app| {
            use tauri::Manager;

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    use tauri::TitleBarStyle;
                    let _ = window.set_title_bar_style(TitleBarStyle::Overlay);
                    let _ = window.set_title("");
                }

                #[cfg(not(target_os = "macos"))]
                {
                    let _ = window.set_decorations(false);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            test_error_success,
            test_error_failure,
            // 配置管理命令
            config::init_config,
            config::get_config,
            config::update_config,
            config::get_config_value,
            config::set_config_value,
            config::reset_config,
            // 配置文件监听命令
            config_watcher::start_config_watcher,
            config_watcher::stop_config_watcher,
            // 系统信息命令
            system::get_runtime_environment,
            system::get_environment_mode,
            system::get_os_type,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
