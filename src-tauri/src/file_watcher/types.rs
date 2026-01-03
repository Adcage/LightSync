/// 文件系统监控核心数据结构定义
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 文件事件类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileEventType {
    /// 文件创建
    Create,
    /// 文件修改
    Modify,
    /// 文件删除
    Delete,
    /// 文件重命名
    Rename,
}

/// 文件事件
///
/// 表示文件系统中发生的单个事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEvent {
    /// 事件类型
    pub event_type: FileEventType,
    /// 文件路径
    pub path: PathBuf,
    /// 旧路径（用于 Rename 事件）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_path: Option<PathBuf>,
    /// 事件时间戳（Unix 时间戳，秒）
    pub timestamp: i64,
}

impl FileEvent {
    /// 创建新的文件事件
    pub fn new(event_type: FileEventType, path: PathBuf) -> Self {
        Self {
            event_type,
            path,
            old_path: None,
            timestamp: chrono::Utc::now().timestamp(),
        }
    }

    /// 创建重命名事件
    pub fn new_rename(old_path: PathBuf, new_path: PathBuf) -> Self {
        Self {
            event_type: FileEventType::Rename,
            path: new_path,
            old_path: Some(old_path),
            timestamp: chrono::Utc::now().timestamp(),
        }
    }
}

/// 监控器状态
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum WatcherState {
    /// 运行中
    Running,
    /// 已停止
    Stopped,
    /// 错误状态
    Error {
        /// 错误消息
        message: String,
    },
}

impl WatcherState {
    /// 创建错误状态
    pub fn error(message: impl Into<String>) -> Self {
        Self::Error {
            message: message.into(),
        }
    }

    /// 检查是否为运行状态
    pub fn is_running(&self) -> bool {
        matches!(self, Self::Running)
    }

    /// 检查是否为错误状态
    pub fn is_error(&self) -> bool {
        matches!(self, Self::Error { .. })
    }
}

/// 文件同步状态
///
/// 表示文件的当前同步状态，用于 UI 显示和未来的 Shell Integration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileState {
    /// 已同步
    Synced,
    /// 同步中
    Syncing,
    /// 冲突
    Conflict,
    /// 错误
    Error,
    /// 待同步
    Pending,
    /// 未知状态
    Unknown,
}

impl FileState {
    /// 获取状态优先级（用于文件夹状态聚合）
    ///
    /// 优先级：Error > Conflict > Syncing > Pending > Synced > Unknown
    pub fn priority(&self) -> u8 {
        match self {
            Self::Error => 6,
            Self::Conflict => 5,
            Self::Syncing => 4,
            Self::Pending => 3,
            Self::Synced => 2,
            Self::Unknown => 1,
        }
    }

    /// 比较两个状态，返回优先级更高的状态
    pub fn max(self, other: Self) -> Self {
        if self.priority() >= other.priority() {
            self
        } else {
            other
        }
    }
}

impl Default for FileState {
    fn default() -> Self {
        Self::Unknown
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_event_creation() {
        let path = PathBuf::from("/test/file.txt");
        let event = FileEvent::new(FileEventType::Create, path.clone());

        assert_eq!(event.event_type, FileEventType::Create);
        assert_eq!(event.path, path);
        assert!(event.old_path.is_none());
        assert!(event.timestamp > 0);
    }

    #[test]
    fn test_file_event_rename() {
        let old_path = PathBuf::from("/test/old.txt");
        let new_path = PathBuf::from("/test/new.txt");
        let event = FileEvent::new_rename(old_path.clone(), new_path.clone());

        assert_eq!(event.event_type, FileEventType::Rename);
        assert_eq!(event.path, new_path);
        assert_eq!(event.old_path, Some(old_path));
    }

    #[test]
    fn test_watcher_state() {
        let running = WatcherState::Running;
        assert!(running.is_running());
        assert!(!running.is_error());

        let error = WatcherState::error("test error");
        assert!(!error.is_running());
        assert!(error.is_error());
    }

    #[test]
    fn test_file_state_priority() {
        assert!(FileState::Error.priority() > FileState::Conflict.priority());
        assert!(FileState::Conflict.priority() > FileState::Syncing.priority());
        assert!(FileState::Syncing.priority() > FileState::Pending.priority());
        assert!(FileState::Pending.priority() > FileState::Synced.priority());
        assert!(FileState::Synced.priority() > FileState::Unknown.priority());
    }

    #[test]
    fn test_file_state_max() {
        assert_eq!(FileState::Error.max(FileState::Synced), FileState::Error);
        assert_eq!(FileState::Synced.max(FileState::Error), FileState::Error);
        assert_eq!(
            FileState::Conflict.max(FileState::Syncing),
            FileState::Conflict
        );
    }

    #[test]
    fn test_file_state_default() {
        assert_eq!(FileState::default(), FileState::Unknown);
    }

    #[test]
    fn test_serialization() {
        // 测试 FileEvent 序列化
        let event = FileEvent::new(FileEventType::Create, PathBuf::from("/test.txt"));
        let json = serde_json::to_string(&event).unwrap();
        let deserialized: FileEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(event.event_type, deserialized.event_type);
        assert_eq!(event.path, deserialized.path);

        // 测试 WatcherState 序列化
        let state = WatcherState::Running;
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: WatcherState = serde_json::from_str(&json).unwrap();
        assert_eq!(state, deserialized);

        // 测试 FileState 序列化
        let file_state = FileState::Synced;
        let json = serde_json::to_string(&file_state).unwrap();
        let deserialized: FileState = serde_json::from_str(&json).unwrap();
        assert_eq!(file_state, deserialized);
    }
}
