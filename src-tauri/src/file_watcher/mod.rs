/// 文件系统监控模块
///
/// 负责实时监控本地同步文件夹的文件变更事件，并触发相应的同步操作。
pub mod types;

pub use types::{FileEvent, FileEventType, FileState, WatcherState};
