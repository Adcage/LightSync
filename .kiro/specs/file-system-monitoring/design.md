# Design Document - File System Monitoring

## Overview

文件系统监控模块是 LightSync 的核心组件，负责实时检测本地同步文件夹的文件变更事件。该模块采用事件驱动架构，使用 Rust 的 `notify` crate 封装操作系统原生的文件监控 API，实现高性能、低资源占用的文件监控功能。

### 核心目标

1. **实时监控**: 检测文件的创建、修改、删除、重命名事件
2. **智能批处理**: 合并短时间内的多个事件，减少同步频率
3. **灵活过滤**: 支持默认和自定义忽略规则，避免监控不必要的文件
4. **状态管理**: 维护文件同步状态，为 UI 和未来的 Shell Integration 提供查询接口
5. **高性能**: CPU 使用率 < 5%（空闲）/ < 15%（活跃），初始化时间 < 2s

### 设计原则

- **模块化**: 文件监控、事件批处理、忽略过滤、状态管理各自独立
- **可扩展**: 状态管理接口设计考虑未来的 Shell Integration 扩展
- **高性能**: 使用异步 I/O、内存缓存、批量处理优化性能
- **容错性**: 优雅处理错误，不影响其他文件夹的监控

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ FileWatcherUI    │  │ EventListUI      │  │ IgnoreRulesUI │ │
│  │ - 监控状态显示    │  │ - 事件列表显示    │  │ - 规则配置     │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ Tauri Events
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Rust/Tauri)                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FileWatcherManager (主控制器)                  │ │
│  │  - 管理多个 FileWatcher 实例                                │ │
│  │  - 协调各模块工作                                           │ │
│  │  - 发送 Tauri 事件到前端                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │                    │                    │            │
│           ↓                    ↓                    ↓            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ FileWatcher  │    │ EventBatcher │    │ IgnoreFilter │     │
│  │ (notify)     │───→│ (批处理)     │───→│ (过滤)       │     │
│  │              │    │              │    │              │     │
│  │ - 监控事件    │    │ - 事件合并    │    │ - Glob 匹配  │     │
│  │ - 递归监控    │    │ - 去重优化    │    │ - 规则管理   │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                │                                │
│                                ↓                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           SyncStateManager (状态管理)                       │ │
│  │  - 维护文件同步状态 (HashMap<PathBuf, FileState>)          │ │
│  │  - 提供快速查询接口 (< 100ms)                              │ │
│  │  - 状态变更通知 (broadcast channel)                        │ │
│  │  - 状态持久化到数据库                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                │
│                                ↓                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Database (SQLite)                          │ │
│  │  - file_metadata (文件元数据 + sync_state)                 │ │
│  │  - sync_logs (同步日志)                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
文件系统事件
    ↓
FileWatcher (notify)
    ↓
EventBatcher (500ms 批处理)
    ↓
IgnoreFilter (过滤)
    ↓
SyncStateManager (更新状态)
    ↓
┌─────────────┬─────────────┐
│             │             │
↓             ↓             ↓
Frontend UI   Database      同步引擎 (Phase 4)
```

## Components and Interfaces

### 1. FileWatcher

**职责**: 监控单个同步文件夹的文件系统事件

**核心结构**:

```rust
pub struct FileWatcher {
    /// 监控的文件夹路径
    folder_id: String,
    folder_path: PathBuf,

    /// notify 监控器
    watcher: RecommendedWatcher,

    /// 事件接收通道
    event_rx: mpsc::Receiver<notify::Result<Event>>,

    /// 监控状态
    state: Arc<RwLock<WatcherState>>,

    /// 事件批处理器
    event_batcher: Arc<EventBatcher>,

    /// 忽略过滤器
    ignore_filter: Arc<IgnoreFilter>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WatcherState {
    Running,
    Stopped,
    Error(String),
}
```

**接口**:

```rust
impl FileWatcher {
    /// 创建新的文件监控器
    pub fn new(
        folder_id: String,
        folder_path: PathBuf,
        ignore_filter: Arc<IgnoreFilter>,
        event_batcher: Arc<EventBatcher>,
    ) -> Result<Self, SyncError>;

    /// 启动监控
    pub async fn start(&mut self) -> Result<(), SyncError>;

    /// 停止监控
    pub async fn stop(&mut self) -> Result<(), SyncError>;

    /// 获取当前状态
    pub fn get_state(&self) -> WatcherState;

    /// 处理文件系统事件
    async fn handle_event(&self, event: notify::Event) -> Result<(), SyncError>;
}
```

### 2. EventBatcher

**职责**: 批处理文件事件，合并短时间内的多个事件

**核心结构**:

```rust
pub struct EventBatcher {
    /// 待处理事件缓存 (path -> events)
    pending_events: Arc<RwLock<HashMap<PathBuf, Vec<FileEvent>>>>,

    /// 批处理间隔 (默认 500ms)
    batch_interval: Duration,

    /// 事件发送通道
    event_tx: mpsc::Sender<Vec<FileEvent>>,
}

#[derive(Debug, Clone)]
pub struct FileEvent {
    pub event_type: FileEventType,
    pub path: PathBuf,
    pub old_path: Option<PathBuf>, // 用于 Rename 事件
    pub timestamp: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileEventType {
    Create,
    Modify,
    Delete,
    Rename,
}
```

**接口**:

```rust
impl EventBatcher {
    /// 创建新的事件批处理器
    pub fn new(batch_interval: Duration) -> (Self, mpsc::Receiver<Vec<FileEvent>>);

    /// 添加事件到批处理队列
    pub async fn add_event(&self, event: FileEvent);

    /// 合并事件（去重和优化）
    fn merge_events(&self, events: Vec<FileEvent>) -> Vec<FileEvent>;

    /// 启动批处理定时器
    async fn start_batch_timer(&self);
}
```

**事件合并规则**:

- Create + Modify → Modify
- Create + Delete → 取消（无需同步）
- Modify + Modify → Modify（保留最后一个）
- Delete + Create → Modify（文件被替换）

### 3. IgnoreFilter

**职责**: 根据 Glob 规则过滤不需要监控的文件

**核心结构**:

```rust
pub struct IgnoreFilter {
    /// 默认忽略规则
    default_rules: Vec<glob::Pattern>,

    /// 用户自定义规则 (folder_id -> rules)
    custom_rules: Arc<RwLock<HashMap<String, Vec<glob::Pattern>>>>,
}
```

**接口**:

```rust
impl IgnoreFilter {
    /// 创建新的忽略过滤器
    pub fn new() -> Self;

    /// 检查文件是否应该被忽略
    pub fn should_ignore(&self, folder_id: &str, path: &Path) -> bool;

    /// 添加自定义规则
    pub fn add_custom_rule(&self, folder_id: String, pattern: String) -> Result<(), SyncError>;

    /// 移除自定义规则
    pub fn remove_custom_rule(&self, folder_id: &str, pattern: &str);

    /// 获取所有生效的规则
    pub fn get_effective_rules(&self, folder_id: &str) -> Vec<String>;
}
```

**默认忽略规则**:

```rust
const DEFAULT_IGNORE_PATTERNS: &[&str] = &[
    // 临时文件
    "*.tmp",
    "*.temp",
    "*.swp",
    "*~",

    // 系统文件
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",

    // 版本控制
    ".git/**",
    ".svn/**",
    ".hg/**",

    // IDE
    ".vscode/**",
    ".idea/**",

    // 构建产物
    "node_modules/**",
    "target/**",
    "dist/**",
    "build/**",
];
```

### 4. SyncStateManager

**职责**: 集中管理文件同步状态，为 UI 和未来的 Shell Integration 提供查询接口

**核心结构**:

```rust
pub struct SyncStateManager {
    /// 文件状态缓存 (path -> state)
    state_cache: Arc<RwLock<HashMap<PathBuf, FileState>>>,

    /// 状态变更通知通道
    state_change_tx: broadcast::Sender<StateChangeEvent>,

    /// 数据库连接
    db: Arc<Database>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileState {
    Synced,           // 已同步
    Syncing,          // 同步中
    Conflict,         // 冲突
    Error(String),    // 错误
    Pending,          // 待同步
    Unknown,          // 未知
}

#[derive(Debug, Clone)]
pub struct StateChangeEvent {
    pub path: PathBuf,
    pub old_state: FileState,
    pub new_state: FileState,
    pub timestamp: i64,
}
```

**接口**:

```rust
impl SyncStateManager {
    /// 创建新的状态管理器
    pub fn new(db: Arc<Database>) -> Self;

    /// 获取文件状态 (< 100ms)
    pub fn get_file_state(&self, path: &Path) -> FileState;

    /// 批量获取文件状态
    pub fn get_multiple_states(&self, paths: &[PathBuf]) -> Vec<FileState>;

    /// 设置文件状态
    pub async fn set_file_state(&self, path: PathBuf, state: FileState);

    /// 订阅状态变更事件
    pub fn subscribe_state_changes(&self) -> broadcast::Receiver<StateChangeEvent>;

    /// 计算文件夹状态（聚合子文件状态）
    pub fn calculate_folder_state(&self, folder: &Path) -> FileState;

    /// 从数据库加载状态
    pub async fn load_from_database(&self) -> Result<(), SyncError>;

    /// 清理过期状态
    pub fn cleanup_stale_states(&self, max_age_days: i64);
}
```

**状态优先级**（用于文件夹状态聚合）:

```
Error > Conflict > Syncing > Pending > Synced > Unknown
```

### 5. FileWatcherManager

**职责**: 管理多个 FileWatcher 实例，协调各模块工作

**核心结构**:

```rust
pub struct FileWatcherManager {
    /// 所有监控器 (folder_id -> FileWatcher)
    watchers: Arc<RwLock<HashMap<String, FileWatcher>>>,

    /// 状态管理器
    state_manager: Arc<SyncStateManager>,

    /// 忽略过滤器
    ignore_filter: Arc<IgnoreFilter>,

    /// Tauri App Handle (用于发送事件到前端)
    app_handle: tauri::AppHandle,
}
```

**接口**:

```rust
impl FileWatcherManager {
    /// 创建新的管理器
    pub fn new(
        state_manager: Arc<SyncStateManager>,
        ignore_filter: Arc<IgnoreFilter>,
        app_handle: tauri::AppHandle,
    ) -> Self;

    /// 启动监控
    pub async fn start_watching(&self, folder_id: String, folder_path: PathBuf) -> Result<(), SyncError>;

    /// 停止监控
    pub async fn stop_watching(&self, folder_id: &str) -> Result<(), SyncError>;

    /// 获取监控状态
    pub fn get_watcher_state(&self, folder_id: &str) -> Option<WatcherState>;

    /// 获取所有监控器状态
    pub fn get_all_watcher_states(&self) -> HashMap<String, WatcherState>;
}
```

## Data Models

### 数据库扩展

**扩展 file_metadata 表**:

```sql
-- 添加同步状态字段
ALTER TABLE file_metadata ADD COLUMN sync_state TEXT DEFAULT 'Unknown';
ALTER TABLE file_metadata ADD COLUMN state_updated_at INTEGER;

-- 创建索引
CREATE INDEX idx_file_metadata_sync_state ON file_metadata(sync_state);
CREATE INDEX idx_file_metadata_state_updated ON file_metadata(state_updated_at);
```

### 配置数据模型

**SyncFolder 配置扩展**:

```typescript
interface SyncFolder {
  id: string
  name: string
  localPath: string
  serverId: string
  remotePath: string

  // 监控配置
  watchEnabled: boolean // 是否启用监控
  ignoreRules: string[] // 自定义忽略规则
  batchInterval: number // 批处理间隔 (ms)

  // 状态
  watcherState: 'running' | 'stopped' | 'error'
  lastError?: string
}
```

### 前端数据模型

**FileEvent (前端)**:

```typescript
interface FileEvent {
  id: string
  folderId: string
  eventType: 'create' | 'modify' | 'delete' | 'rename'
  path: string
  oldPath?: string // 用于 rename
  timestamp: number
}

interface WatcherStatus {
  folderId: string
  state: 'running' | 'stopped' | 'error'
  error?: string
  eventCount: number
  lastEventTime?: number
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: File event detection completeness

_For any_ monitored directory and any file operation (create, modify, delete, rename), the FileWatcher should generate a corresponding FileEvent with the correct event type.
**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

### Property 2: Recursive monitoring coverage

_For any_ monitored directory, when monitoring is enabled, the FileWatcher should detect events in all subdirectories at any depth.
**Validates: Requirements 1.1**

### Property 3: Event batching within time window

_For any_ file and any sequence of events on that file within 500ms, the EventBatcher should merge these events into a single batch.
**Validates: Requirements 2.1, 2.2**

### Property 4: Event merge rule - Create + Modify

_For any_ file, if a Create event and a Modify event occur in the same batch, the EventBatcher should produce only a Modify event.
**Validates: Requirements 2.4**

### Property 5: Event merge rule - Create + Delete

_For any_ file, if a Create event and a Delete event occur in the same batch, the EventBatcher should cancel both events (produce no event).
**Validates: Requirements 2.5**

### Property 6: Batch delivery after timeout

_For any_ batch of events, when the batch interval (500ms) expires, the EventBatcher should deliver the batch to the sync engine.
**Validates: Requirements 2.3**

### Property 7: Default ignore rules effectiveness

_For any_ file path matching default ignore patterns (\*.tmp, .DS_Store, .git/**, etc.), the IgnoreFilter should return true for should_ignore().
**Validates: Requirements 3.1\*\*

### Property 8: Custom and default rules merge

_For any_ SyncFolder with custom ignore rules, the IgnoreFilter should apply both default rules and custom rules when filtering events.
**Validates: Requirements 3.2**

### Property 9: Ignore filter application

_For any_ FileEvent with a path matching any ignore rule, the IgnoreFilter should discard the event before it reaches the sync engine.
**Validates: Requirements 3.3, 3.4**

### Property 10: Glob pattern support

_For any_ valid glob pattern (with \*, **, ?, or ! prefix), the IgnoreFilter should correctly match file paths according to glob semantics.
**Validates: Requirements 3.5\*\*

### Property 11: Ignore rules persistence

_For any_ SyncFolder, when a custom ignore rule is added, the System should persist it to the configuration file.
**Validates: Requirements 4.1**

### Property 12: Ignore rules hot reload

_For any_ SyncFolder, when ignore rules are modified, the FileWatcher should immediately apply the new rules to subsequent events.
**Validates: Requirements 4.2**

### Property 13: Ignore rules reset

_For any_ SyncFolder, when all custom ignore rules are deleted, the IgnoreFilter should revert to using only default rules.
**Validates: Requirements 4.3**

### Property 14: Per-folder rule isolation

_For any_ two different SyncFolders with different ignore rules, events in one folder should not be affected by rules from the other folder.
**Validates: Requirements 4.4**

### Property 15: Effective rules query

_For any_ SyncFolder, querying effective rules should return the union of default rules and custom rules.
**Validates: Requirements 4.5**

### Property 16: Watcher state notification

_For any_ FileWatcher, when it starts or stops, the System should emit a state change event to the frontend.
**Validates: Requirements 5.1**

### Property 17: File event notification

_For any_ detected FileEvent, the System should emit an event notification to the frontend containing path, event type, and timestamp.
**Validates: Requirements 5.2**

### Property 18: Watcher state query

_For any_ SyncFolder, querying its watcher state should return the current state (Running, Stopped, or Error).
**Validates: Requirements 5.3**

### Property 19: Event list size limit

_For any_ SyncFolder, querying recent events should return at most the 50 most recent FileEvents.
**Validates: Requirements 5.4**

### Property 20: Per-folder event filtering

_For any_ SyncFolder, querying its events should return only events from that folder, not from other folders.
**Validates: Requirements 5.5**

### Property 21: Directory deletion handling

_For any_ monitored directory, when the directory is deleted, the FileWatcher should stop monitoring and set state to Stopped.
**Validates: Requirements 6.3**

### Property 22: Directory move handling

_For any_ monitored directory, when the directory is moved, the FileWatcher should attempt to relocate and continue monitoring, or stop if relocation fails.
**Validates: Requirements 6.4**

### Property 23: Error state propagation

_For any_ FileWatcher error, the System should set WatcherState to Error and emit an error notification to the frontend.
**Validates: Requirements 6.5**

### Property 24: Concurrent folder monitoring

_For any_ set of SyncFolders, starting monitoring on multiple folders should result in independent FileWatcher instances that don't block each other.
**Validates: Requirements 7.4**

### Property 25: Start monitoring command

_For any_ SyncFolder, calling start_watching should create and start a FileWatcher for that folder.
**Validates: Requirements 8.1**

### Property 26: Stop monitoring command

_For any_ running FileWatcher, calling stop_watching should stop the watcher and set its state to Stopped.
**Validates: Requirements 8.2**

### Property 27: Monitoring state persistence

_For any_ SyncFolder with monitoring enabled, after application restart, the System should automatically restore the FileWatcher based on saved configuration.
**Validates: Requirements 8.4**

### Property 28: File state maintenance

_For any_ file path, the SyncStateManager should maintain its sync state (Synced, Syncing, Conflict, Error, or Pending) in memory.
**Validates: Requirements 9.1**

### Property 29: State query performance

_For any_ file path, querying its state from SyncStateManager should return a result (functionality test, not performance).
**Validates: Requirements 9.3**

### Property 30: State change notification

_For any_ file, when its sync state changes, the SyncStateManager should emit a StateChangeEvent to all subscribers.
**Validates: Requirements 9.4**

## Error Handling

### Error Categories

1. **File System Errors**
   - 权限不足 (Permission Denied)
   - 目录不存在 (Directory Not Found)
   - 磁盘空间不足 (Disk Full)
   - 文件被锁定 (File Locked)

2. **Resource Errors**
   - 文件描述符不足 (Too Many Open Files)
   - 内存不足 (Out of Memory)
   - 线程创建失败 (Thread Creation Failed)

3. **Configuration Errors**
   - 无效的 Glob 模式 (Invalid Glob Pattern)
   - 无效的文件夹路径 (Invalid Folder Path)
   - 配置文件损坏 (Corrupted Config)

4. **Runtime Errors**
   - 监控器崩溃 (Watcher Crashed)
   - 事件处理超时 (Event Processing Timeout)
   - 数据库连接失败 (Database Connection Failed)

### Error Handling Strategies

#### 1. FileWatcher Errors

```rust
impl FileWatcher {
    async fn handle_error(&mut self, error: SyncError) {
        // 1. 记录错误日志
        error!("FileWatcher error for folder {}: {:?}", self.folder_id, error);

        // 2. 更新状态为 Error
        {
            let mut state = self.state.write().unwrap();
            *state = WatcherState::Error(error.to_string());
        }

        // 3. 发送错误通知到前端
        let _ = self.app_handle.emit_all("watcher-error", WatcherErrorEvent {
            folder_id: self.folder_id.clone(),
            error: error.to_string(),
            timestamp: chrono::Utc::now().timestamp(),
        });

        // 4. 根据错误类型决定是否重试
        match error {
            SyncError::PermissionDenied | SyncError::DirectoryNotFound => {
                // 致命错误，停止监控
                let _ = self.stop().await;
            }
            SyncError::TooManyOpenFiles => {
                // 资源限制，记录警告但继续运行
                warn!("Resource limit reached, continuing with degraded performance");
            }
            _ => {
                // 其他错误，尝试重启监控
                tokio::time::sleep(Duration::from_secs(5)).await;
                let _ = self.start().await;
            }
        }
    }
}
```

#### 2. EventBatcher Errors

```rust
impl EventBatcher {
    fn handle_merge_error(&self, error: SyncError) {
        // 事件合并失败不应该影响其他事件
        error!("Event merge error: {:?}", error);
        // 继续处理其他事件
    }
}
```

#### 3. IgnoreFilter Errors

```rust
impl IgnoreFilter {
    pub fn add_custom_rule(&self, folder_id: String, pattern: String) -> Result<(), SyncError> {
        // 验证 Glob 模式
        let glob_pattern = glob::Pattern::new(&pattern)
            .map_err(|e| SyncError::InvalidGlobPattern(e.to_string()))?;

        // 添加到规则列表
        let mut rules = self.custom_rules.write().unwrap();
        rules.entry(folder_id).or_insert_with(Vec::new).push(glob_pattern);

        Ok(())
    }
}
```

#### 4. SyncStateManager Errors

```rust
impl SyncStateManager {
    pub async fn set_file_state(&self, path: PathBuf, state: FileState) {
        // 更新内存缓存（不应该失败）
        {
            let mut cache = self.state_cache.write().unwrap();
            cache.insert(path.clone(), state);
        }

        // 异步持久化到数据库（失败不影响内存状态）
        let db = self.db.clone();
        tokio::spawn(async move {
            if let Err(e) = db.update_file_state(&path, state).await {
                error!("Failed to persist file state: {:?}", e);
                // 不抛出错误，只记录日志
            }
        });
    }
}
```

### Error Recovery

1. **自动重试**: 对于临时性错误（网络超时、资源暂时不可用），自动重试最多 3 次
2. **降级运行**: 对于资源限制错误，降低监控频率或减少监控范围
3. **用户通知**: 对于致命错误，通过前端通知用户并提供解决建议
4. **状态恢复**: 应用重启后，从数据库恢复上次的状态

## Testing Strategy

### Unit Testing

**测试框架**: Rust 标准测试框架 + `tokio::test` (异步测试)

**测试覆盖**:

1. **FileWatcher Tests**
   - 测试启动/停止功能
   - 测试事件检测（create, modify, delete, rename）
   - 测试递归监控
   - 测试错误处理

2. **EventBatcher Tests**
   - 测试事件合并规则
   - 测试批处理触发时机
   - 测试事件去重

3. **IgnoreFilter Tests**
   - 测试默认规则匹配
   - 测试自定义规则添加/删除
   - 测试 Glob 模式匹配
   - 测试规则合并

4. **SyncStateManager Tests**
   - 测试状态设置/查询
   - 测试状态变更通知
   - 测试文件夹状态聚合
   - 测试状态持久化

### Property-Based Testing

**测试框架**: `proptest` (Rust property-based testing library)

**配置**: 每个属性测试运行至少 100 次迭代

**测试策略**:

1. **生成器 (Generators)**

   ```rust
   // 生成随机文件路径
   prop_compose! {
       fn arb_file_path()(
           dir in "[a-z]{3,10}",
           file in "[a-z]{3,10}",
           ext in "[a-z]{2,4}"
       ) -> PathBuf {
           PathBuf::from(format!("{}/{}.{}", dir, file, ext))
       }
   }

   // 生成随机文件事件
   prop_compose! {
       fn arb_file_event()(
           event_type in prop_oneof![
               Just(FileEventType::Create),
               Just(FileEventType::Modify),
               Just(FileEventType::Delete),
           ],
           path in arb_file_path(),
       ) -> FileEvent {
           FileEvent {
               event_type,
               path,
               old_path: None,
               timestamp: chrono::Utc::now().timestamp(),
           }
       }
   }

   // 生成随机 Glob 模式
   prop_compose! {
       fn arb_glob_pattern()(
           pattern in "([a-z*?]+/)*[a-z*?]+\\.[a-z]{2,4}"
       ) -> String {
           pattern
       }
   }
   ```

2. **属性测试示例**
   ```rust
   #[cfg(test)]
   mod property_tests {
       use super::*;
       use proptest::prelude::*;

       // Property 4: Create + Modify → Modify
       proptest! {
           #[test]
           fn test_event_merge_create_modify(path in arb_file_path()) {
               // **Feature: file-system-monitoring, Property 4: Event merge rule - Create + Modify**
               let batcher = EventBatcher::new(Duration::from_millis(500));

               // 添加 Create 事件
               batcher.add_event(FileEvent {
                   event_type: FileEventType::Create,
                   path: path.clone(),
                   old_path: None,
                   timestamp: 0,
               }).await;

               // 添加 Modify 事件
               batcher.add_event(FileEvent {
                   event_type: FileEventType::Modify,
                   path: path.clone(),
                   old_path: None,
                   timestamp: 100,
               }).await;

               // 触发批处理
               let merged = batcher.flush().await;

               // 验证：只有一个 Modify 事件
               prop_assert_eq!(merged.len(), 1);
               prop_assert_eq!(merged[0].event_type, FileEventType::Modify);
           }
       }

       // Property 7: Default ignore rules effectiveness
       proptest! {
           #[test]
           fn test_default_ignore_rules(
               dir in "[a-z]{3,10}",
               file in "[a-z]{3,10}"
           ) {
               // **Feature: file-system-monitoring, Property 7: Default ignore rules effectiveness**
               let filter = IgnoreFilter::new();

               // 测试临时文件
               let tmp_path = PathBuf::from(format!("{}/{}.tmp", dir, file));
               prop_assert!(filter.should_ignore("test-folder", &tmp_path));

               // 测试系统文件
               let ds_store = PathBuf::from(format!("{}/.DS_Store", dir));
               prop_assert!(filter.should_ignore("test-folder", &ds_store));

               // 测试版本控制目录
               let git_path = PathBuf::from(format!("{}/.git/config", dir));
               prop_assert!(filter.should_ignore("test-folder", &git_path));
           }
       }

       // Property 10: Glob pattern support
       proptest! {
           #[test]
           fn test_glob_pattern_matching(
               pattern in arb_glob_pattern(),
               path in arb_file_path()
           ) {
               // **Feature: file-system-monitoring, Property 10: Glob pattern support**
               let filter = IgnoreFilter::new();

               // 添加自定义规则
               let result = filter.add_custom_rule("test-folder".to_string(), pattern.clone());
               prop_assert!(result.is_ok());

               // 验证：如果路径匹配模式，should_ignore 应该返回 true
               if glob::Pattern::new(&pattern).unwrap().matches_path(&path) {
                   prop_assert!(filter.should_ignore("test-folder", &path));
               }
           }
       }

       // Property 30: State change notification
       proptest! {
           #[test]
           fn test_state_change_notification(
               path in arb_file_path(),
               old_state in prop_oneof![
                   Just(FileState::Synced),
                   Just(FileState::Pending),
               ],
               new_state in prop_oneof![
                   Just(FileState::Syncing),
                   Just(FileState::Synced),
               ]
           ) {
               // **Feature: file-system-monitoring, Property 30: State change notification**
               let state_manager = SyncStateManager::new(Arc::new(mock_database()));
               let mut rx = state_manager.subscribe_state_changes();

               // 设置初始状态
               state_manager.set_file_state(path.clone(), old_state).await;

               // 更新状态
               state_manager.set_file_state(path.clone(), new_state).await;

               // 验证：应该收到状态变更通知
               let event = rx.recv().await.unwrap();
               prop_assert_eq!(event.path, path);
               prop_assert_eq!(event.old_state, old_state);
               prop_assert_eq!(event.new_state, new_state);
           }
       }
   }
   ```

### Integration Testing

**测试场景**:

1. **端到端文件监控流程**
   - 启动监控 → 创建文件 → 验证事件 → 停止监控

2. **多文件夹并发监控**
   - 同时监控 3 个文件夹，验证事件不会混淆

3. **忽略规则热更新**
   - 修改规则 → 立即创建匹配文件 → 验证被忽略

4. **状态持久化和恢复**
   - 设置状态 → 重启应用 → 验证状态恢复

### Performance Testing

**测试指标**:

1. **初始化时间**: 监控 10,000 个文件的目录，初始化时间 < 2s
2. **CPU 使用率**: 空闲状态 < 5%，活跃状态 < 15%
3. **内存使用**: 监控 10 个文件夹，内存占用 < 50MB
4. **状态查询性能**: 查询单个文件状态 < 100ms

**测试工具**: `criterion` (Rust benchmarking library)

### Test Coverage Goals

- **单元测试覆盖率**: > 80%
- **属性测试覆盖**: 所有核心逻辑（事件合并、规则匹配、状态管理）
- **集成测试**: 覆盖所有用户场景
- **性能测试**: 验证所有性能指标
