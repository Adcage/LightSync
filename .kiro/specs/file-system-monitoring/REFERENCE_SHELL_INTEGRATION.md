# Shell Integration 技术设计文档（参考）

> **⚠️ 注意**: 这是一个**参考文档**，用于指导未来 Phase 9-10 的 Shell Integration 实现。
>
> **Phase 3 不需要实现这里的所有细节**，只需要：
>
> 1. 实现基础的状态管理功能
> 2. 使用良好的架构模式（观察者模式、独立模块）
> 3. 确保接口设计是通用的、可扩展的
>
> 本文档提供了完整的技术方案，供后期参考。

---

> **目标**: 确保 Phase 3-4 的状态管理设计能够无缝支持 Phase 9-10 的 Shell Integration 功能

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    LightSync 主进程                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         SyncStateManager (核心状态管理)                 │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  状态缓存 (HashMap<PathBuf, FileState>)          │  │ │
│  │  │  - 使用 RwLock 保护                              │  │ │
│  │  │  - 支持高并发读取                                │  │ │
│  │  │  - 响应时间 < 100ms                              │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  API:                                                    │ │
│  │  - get_file_state(path) -> FileState                    │ │
│  │  - get_multiple_states(paths) -> Vec<FileState>         │ │
│  │  - set_file_state(path, state)                          │ │
│  │  - subscribe_state_changes(callback)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│           ↓                    ↓                    ↓        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  UI 显示      │    │  数据库持久化 │    │  IPC Server  │  │
│  │  (React)     │    │  (SQLite)    │    │  (Phase 9)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              │ Named Pipe (Windows)
                                              │ Unix Socket (macOS/Linux)
                                              ↓
                              ┌─────────────────────────────┐
                              │  Shell Extension (DLL/SO)   │
                              │  - 查询文件状态              │
                              │  - 显示图标叠加层            │
                              │  - 运行在文件管理器进程中    │
                              └─────────────────────────────┘
                                              ↓
                              ┌─────────────────────────────┐
                              │   文件管理器 (Explorer)      │
                              │   - Windows Explorer         │
                              │   - macOS Finder             │
                              │   - Linux Nautilus/Dolphin   │
                              └─────────────────────────────┘
```

## 2. 核心数据结构

### 2.1 FileState 枚举

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileState {
    /// 已同步 - 本地和远程一致（绿色勾号 ✓）
    Synced,

    /// 同步中 - 正在上传或下载（蓝色箭头 ↻）
    Syncing,

    /// 冲突 - 本地和远程都有修改（红色叉号 ✗）
    Conflict,

    /// 错误 - 同步失败（黄色感叹号 ⚠）
    Error(String),

    /// 待同步 - 检测到变更，等待同步（灰色圆点 ●）
    Pending,

    /// 未知 - 尚未扫描或不在同步范围内
    Unknown,
}

impl FileState {
    /// 状态优先级（用于文件夹状态聚合）
    pub fn priority(&self) -> u8 {
        match self {
            FileState::Error(_) => 5,    // 最高优先级
            FileState::Conflict => 4,
            FileState::Syncing => 3,
            FileState::Pending => 2,
            FileState::Synced => 1,
            FileState::Unknown => 0,     // 最低优先级
        }
    }
}
```

### 2.2 SyncStateManager 结构

```rust
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tokio::sync::broadcast;

pub struct SyncStateManager {
    /// 文件状态缓存（内存）
    state_cache: Arc<RwLock<HashMap<PathBuf, FileState>>>,

    /// 状态变更通知通道
    state_change_tx: broadcast::Sender<StateChangeEvent>,

    /// 数据库连接（用于持久化）
    db: Arc<Database>,
}

#[derive(Debug, Clone)]
pub struct StateChangeEvent {
    pub path: PathBuf,
    pub old_state: FileState,
    pub new_state: FileState,
    pub timestamp: i64,
}

impl SyncStateManager {
    /// 创建新的状态管理器
    pub fn new(db: Arc<Database>) -> Self {
        let (tx, _) = broadcast::channel(1000);
        Self {
            state_cache: Arc::new(RwLock::new(HashMap::new())),
            state_change_tx: tx,
            db,
        }
    }

    /// 获取单个文件状态（< 100ms）
    pub fn get_file_state(&self, path: &Path) -> FileState {
        // 1. 先查内存缓存
        if let Ok(cache) = self.state_cache.read() {
            if let Some(state) = cache.get(path) {
                return *state;
            }
        }

        // 2. 如果是文件夹，计算聚合状态
        if path.is_dir() {
            return self.calculate_folder_state(path);
        }

        // 3. 默认返回 Unknown
        FileState::Unknown
    }

    /// 批量获取文件状态（优化 Shell Extension 性能）
    pub fn get_multiple_states(&self, paths: &[PathBuf]) -> Vec<FileState> {
        let cache = self.state_cache.read().unwrap();
        paths.iter()
            .map(|path| cache.get(path).copied().unwrap_or(FileState::Unknown))
            .collect()
    }

    /// 设置文件状态
    pub fn set_file_state(&self, path: PathBuf, new_state: FileState) {
        let old_state = {
            let mut cache = self.state_cache.write().unwrap();
            cache.insert(path.clone(), new_state)
        };

        // 发送状态变更通知
        let event = StateChangeEvent {
            path: path.clone(),
            old_state: old_state.unwrap_or(FileState::Unknown),
            new_state,
            timestamp: chrono::Utc::now().timestamp(),
        };
        let _ = self.state_change_tx.send(event);

        // 异步持久化到数据库
        let db = self.db.clone();
        tokio::spawn(async move {
            let _ = db.update_file_state(&path, new_state).await;
        });
    }

    /// 订阅状态变更事件
    pub fn subscribe_state_changes(&self) -> broadcast::Receiver<StateChangeEvent> {
        self.state_change_tx.subscribe()
    }

    /// 计算文件夹状态（聚合子文件和子文件夹状态）
    fn calculate_folder_state(&self, folder: &Path) -> FileState {
        let cache = self.state_cache.read().unwrap();

        // 找出所有子文件和子文件夹的状态
        let child_states: Vec<FileState> = cache
            .iter()
            .filter(|(path, _)| path.starts_with(folder) && *path != folder)
            .map(|(_, state)| *state)
            .collect();

        if child_states.is_empty() {
            return FileState::Unknown;
        }

        // 返回优先级最高的状态
        child_states.into_iter()
            .max_by_key(|state| state.priority())
            .unwrap_or(FileState::Unknown)
    }

    /// 从数据库加载状态（应用启动时调用）
    pub async fn load_from_database(&self) -> Result<(), SyncError> {
        let states = self.db.load_all_file_states().await?;

        let mut cache = self.state_cache.write().unwrap();
        for (path, state) in states {
            cache.insert(path, state);
        }

        Ok(())
    }

    /// 清理过期状态（定期调用）
    pub fn cleanup_stale_states(&self, max_age_days: i64) {
        // 实现逻辑：删除超过 max_age_days 天未更新的状态
    }
}
```

## 3. IPC 通信协议设计（Phase 9 实现）

### 3.1 通信方式

- **Windows**: Named Pipe (`\\.\pipe\lightsync_state`)
- **macOS/Linux**: Unix Domain Socket (`/tmp/lightsync_state.sock`)

### 3.2 协议格式（JSON）

**请求格式**:

```json
{
  "type": "get_state",
  "paths": ["C:\\Users\\user\\Documents\\file1.txt", "C:\\Users\\user\\Documents\\folder1"]
}
```

**响应格式**:

```json
{
  "states": [
    {
      "path": "C:\\Users\\user\\Documents\\file1.txt",
      "state": "Synced"
    },
    {
      "path": "C:\\Users\\user\\Documents\\folder1",
      "state": "Syncing"
    }
  ]
}
```

### 3.3 IPC Server 实现（Phase 9）

```rust
pub struct IPCServer {
    state_manager: Arc<SyncStateManager>,
}

impl IPCServer {
    pub async fn start(&self) -> Result<(), SyncError> {
        #[cfg(target_os = "windows")]
        self.start_named_pipe().await?;

        #[cfg(not(target_os = "windows"))]
        self.start_unix_socket().await?;

        Ok(())
    }

    async fn handle_request(&self, request: IPCRequest) -> IPCResponse {
        match request.type_ {
            "get_state" => {
                let states = self.state_manager.get_multiple_states(&request.paths);
                IPCResponse { states }
            }
            _ => IPCResponse { states: vec![] }
        }
    }
}
```

## 4. 数据库持久化

### 4.1 扩展 file_metadata 表

```sql
-- 添加 sync_state 字段
ALTER TABLE file_metadata ADD COLUMN sync_state TEXT DEFAULT 'Unknown';
ALTER TABLE file_metadata ADD COLUMN state_updated_at INTEGER;

-- 创建索引加速查询
CREATE INDEX idx_file_metadata_sync_state ON file_metadata(sync_state);
CREATE INDEX idx_file_metadata_state_updated ON file_metadata(state_updated_at);
```

### 4.2 数据库操作

```rust
impl Database {
    pub async fn update_file_state(&self, path: &Path, state: FileState) -> Result<(), SyncError> {
        let state_str = serde_json::to_string(&state)?;
        let timestamp = chrono::Utc::now().timestamp();

        sqlx::query!(
            "UPDATE file_metadata SET sync_state = ?, state_updated_at = ? WHERE path = ?",
            state_str,
            timestamp,
            path.to_string_lossy()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn load_all_file_states(&self) -> Result<Vec<(PathBuf, FileState)>, SyncError> {
        let rows = sqlx::query!(
            "SELECT path, sync_state FROM file_metadata WHERE sync_state IS NOT NULL"
        )
        .fetch_all(&self.pool)
        .await?;

        let states = rows.into_iter()
            .filter_map(|row| {
                let path = PathBuf::from(row.path);
                let state: FileState = serde_json::from_str(&row.sync_state).ok()?;
                Some((path, state))
            })
            .collect();

        Ok(states)
    }
}
```

## 5. 性能优化策略

### 5.1 内存缓存优化

- 使用 `RwLock` 而非 `Mutex`，支持多个并发读取
- 限制缓存大小（最多 100,000 条记录）
- 使用 LRU 策略淘汰旧记录

### 5.2 批量查询优化

- Shell Extension 一次查询多个文件（最多 100 个）
- 减少 IPC 通信次数
- 使用连接池管理 IPC 连接

### 5.3 文件夹状态缓存

- 缓存文件夹的聚合状态（避免重复计算）
- 子文件状态变更时，使缓存失效
- 使用增量更新而非全量重算

## 6. 测试策略

### 6.1 单元测试

- 测试 `FileState` 优先级计算
- 测试 `SyncStateManager` 的并发读写
- 测试文件夹状态聚合算法

### 6.2 性能测试

- 测试 10,000 个文件的状态查询性能（< 100ms）
- 测试高并发状态更新（1000 次/秒）
- 测试内存占用（< 50MB）

### 6.3 集成测试

- 测试状态持久化和恢复
- 测试状态变更通知机制
- 测试 IPC 通信（Phase 9）

## 7. 实施时间线

### Phase 3 (Week 3)

- ✅ 实现 `FileState` 枚举
- ✅ 实现 `SyncStateManager` 基础结构
- ✅ 实现状态查询接口
- ✅ 实现状态变更通知

### Phase 4 (Week 4)

- ✅ 实现状态持久化到数据库
- ✅ 实现状态恢复机制
- ✅ 优化查询性能（内存缓存）
- ✅ 实现文件夹状态聚合

### Phase 9 (Week 9)

- 🎨 实现 IPC Server
- 🎨 实现 IPC 通信协议
- 🎨 性能测试和优化

### Phase 10 (Week 10)

- 🎨 实现 Windows Shell Extension
- 🎨 实现 macOS Finder Sync Extension（可选）
- 🎨 实现 Linux 文件管理器插件（可选）

## 8. 风险与挑战

### 8.1 性能风险

- **风险**: 文件夹状态聚合可能很慢（深层嵌套）
- **缓解**: 限制递归深度，使用缓存

### 8.2 并发风险

- **风险**: 高并发状态更新可能导致锁竞争
- **缓解**: 使用 `RwLock`，批量更新

### 8.3 平台兼容性

- **风险**: 不同平台的 Shell Extension 实现差异大
- **缓解**: 优先实现 Windows，其他平台可选

## 9. 总结

通过在 Phase 3-4 设计良好的状态管理接口，Phase 9-10 实现 Shell Integration 时：

- ✅ **无需重构核心代码**（只需添加 IPC Server）
- ✅ **性能有保障**（< 100ms 响应时间）
- ✅ **扩展性强**（支持未来的其他集成）
- ✅ **维护成本低**（接口清晰，职责分离）

这是一个**渐进式、可扩展**的设计，完全符合项目的长期发展需求。
