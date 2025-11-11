/// LightSync 配置文件监听模块
///
/// 监听配置文件变化，当配置文件被外部程序修改时通知前端
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

use crate::error::{Result, SyncError};

/// 配置文件监听器
#[derive(Clone)]
pub struct ConfigWatcher {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    app_handle: AppHandle,
    last_event_time: Arc<Mutex<Option<Instant>>>,
}

impl ConfigWatcher {
    /// 创建新的配置文件监听器
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
            app_handle,
            last_event_time: Arc::new(Mutex::new(None)),
        }
    }

    /// 开始监听配置文件
    pub async fn start(&self, config_path: PathBuf) -> Result<()> {
        let (tx, rx) = channel();
        let app_handle = self.app_handle.clone();
        let last_event_time = self.last_event_time.clone();

        // 创建文件监听器，使用更宽松的配置以减少 macOS 上的事件频率
        let mut watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    // 过滤掉不相关的事件，减少 macOS 上的事件噪音
                    match event.kind {
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                            let _ = tx.send(event);
                        }
                        _ => {
                            // 忽略其他类型的事件（如权限变更等）
                        }
                    }
                }
            },
            Config::default()
                .with_poll_interval(Duration::from_secs(2)) // 增加轮询间隔
                .with_compare_contents(false) // 禁用内容比较，提高性能
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
                        // 防抖处理：检查距离上次事件的时间
                        let now = Instant::now();
                        let should_notify = {
                            let mut last_time = last_event_time.lock().await;
                            match *last_time {
                                None => {
                                    *last_time = Some(now);
                                    true
                                }
                                Some(last) => {
                                    if now.duration_since(last) > Duration::from_millis(500) {
                                        *last_time = Some(now);
                                        true
                                    } else {
                                        false
                                    }
                                }
                            }
                        };

                        if should_notify {
                            // 当配置文件发生变化时，发送通知到前端
                            let event_type = format!("{:?}", event.kind);
                            if let Err(e) = app_handle_clone.emit("config-changed", event_type) {
                                eprintln!("Failed to emit config-changed event: {}", e);
                            }
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
        
        // 重置最后事件时间
        let mut last_time = self.last_event_time.lock().await;
        *last_time = None;
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

    // 检查是否已经存在监听器，避免重复创建
    if app.try_state::<ConfigWatcher>().is_some() {
        return Err(SyncError::ConfigError("Config watcher already running".to_string()));
    }

    // 创建监听器并存储到应用状态中
    let watcher = ConfigWatcher::new(app.clone());
    let watcher_clone = watcher.clone();
    app.manage(watcher);

    // 启动监听器
    let config_path_clone = config_path.clone();
    let app_handle = app.clone();
    
    // 使用 tokio::spawn 创建任务，并处理可能的错误
    tokio::spawn(async move {
        match watcher_clone.start(config_path_clone).await {
            Ok(_) => {
                println!("Config watcher started successfully");
            }
            Err(e) => {
                eprintln!("Failed to start config watcher: {}", e);
                // 发送错误事件到前端
                let _ = app_handle.emit("config-watcher-error", e.to_string());
            }
        }
    });

    Ok(())
}

/// 停止配置文件监听
#[tauri::command]
pub async fn stop_config_watcher(app: AppHandle) -> Result<()> {
    if let Some(watcher) = app.try_state::<ConfigWatcher>() {
        watcher.stop().await;
        
        // 发送停止事件到前端
        let _ = app.emit("config-watcher-stopped", "Config watcher stopped");
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

