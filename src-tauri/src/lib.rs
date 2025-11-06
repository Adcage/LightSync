// 统一错误处理模块
mod error;

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
        .invoke_handler(tauri::generate_handler![
            greet,
            test_error_success,
            test_error_failure
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
