// 系统信息模块

use std::env;

/// 获取操作系统类型
pub fn get_os_type() -> String {
    std::env::consts::OS.to_string()
}

/// 获取系统架构
pub fn get_arch() -> String {
    std::env::consts::ARCH.to_string()
}

/// 获取系统信息
pub fn get_system_info() -> String {
    format!("{}-{}", get_os_type(), get_arch())
}

/// 获取当前运行环境信息
#[tauri::command]
pub fn get_runtime_environment() -> crate::Result<String> {
    let os_type = get_os_type();
    let arch = get_arch();
    let app_version = env!("CARGO_PKG_VERSION");
    
    let env_info = format!(
        "OS: {}, Arch: {}, App: {}",
        os_type, arch, app_version
    );
    
    Ok(env_info)
}

/// 获取当前运行模式（开发环境或生产环境）
#[tauri::command]
pub fn get_environment_mode() -> crate::Result<String> {
    let mode = if cfg!(debug_assertions) {
        "development".to_string()
    } else {
        "production".to_string()
    };
    
    Ok(mode)
}