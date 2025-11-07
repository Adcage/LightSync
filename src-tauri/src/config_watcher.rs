/// LightSync 配置文件监听模块
///
/// 监听配置文件变化，当配置文件被外部程序修改时通知前端
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

use crate::error::{Result, SyncError};

/// 配置文件监听器
pub struct ConfigWatcher {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    app_handle: AppHandle,
}

impl ConfigWatcher {
    /// 创建新的配置文件监听器
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
            app_handle,
        }
    }

    /// 开始监听配置文件
    pub async fn start(&self, config_path: PathBuf) -> Result<()> {
        let (tx, rx) = channel();
        let app_handle = self.app_handle.clone();

        // 创建文件监听器
        let mut watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| SyncError::WatcherError(format!("Failed to create watcher: {}", e)))?;

        // 监听配置文件
        watcher
            .watch(&config_path, RecursiveMode::NonRecursive)
            .map_err(|e| {
                SyncError::WatcherError(format!("Failed to watch config file: {}", e))
            })?;

        // 保存 watcher 实例
        let mut watcher_lock = self.watcher.lock().await;
        *watcher_lock = Some(watcher);

        // 启动事件处理任务
        let app_handle_clone = app_handle.clone();
        tokio::spawn(async move {
            loop {
                match rx.recv() {
                    Ok(event) => {
                        // 当配置文件发生变化时，发送通知到前端
                        // 不发送事件对象，只发送通知消息
                        let event_type = format!("{:?}", event.kind);
                        if let Err(e) = app_handle_clone.emit("config-changed", event_type) {
                            eprintln!("Failed to emit config-changed event: {}", e);
                        }
                    }
                    Err(_) => {
                        // 通道关闭，退出循环
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    /// 停止监听
    pub async fn stop(&self) {
        let mut watcher_lock = self.watcher.lock().await;
        *watcher_lock = None;
    }
}

/// 启动配置文件监听
#[tauri::command]
pub async fn start_config_watcher(app: AppHandle) -> Result<()> {
    // 获取配置文件路径
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| SyncError::ConfigError(format!("Failed to get config dir: {}", e)))?;

    let config_path = config_dir.join("config.json");

    // 创建配置目录（如果不存在）
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir).map_err(|e| {
            SyncError::ConfigError(format!("Failed to create config dir: {}", e))
        })?;
    }

    // 创建配置文件（如果不存在）
    if !config_path.exists() {
        std::fs::write(&config_path, "{}").map_err(|e| {
            SyncError::ConfigError(format!("Failed to create config file: {}", e))
        })?;
    }

    // 创建并启动监听器
    let watcher = ConfigWatcher::new(app.clone());
    watcher.start(config_path).await?;

    // 将监听器存储到应用状态中
    app.manage(watcher);

    Ok(())
}

/// 停止配置文件监听
#[tauri::command]
pub async fn stop_config_watcher(app: AppHandle) -> Result<()> {
    if let Some(watcher) = app.try_state::<ConfigWatcher>() {
        watcher.stop().await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_config_watcher_creation() {
        // 测试配置文件监听器创建
        // 注意: 这个测试需要在 Tauri 环境中运行
    }
}

