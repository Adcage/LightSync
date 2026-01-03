# File Watcher Module

文件系统监控模块，负责实时监控本地同步文件夹的文件变更事件。

## 模块结构

```
file_watcher/
├── mod.rs              # 模块入口
├── types.rs            # 核心数据结构定义
├── README.md           # 本文档
└── (待实现的子模块)
    ├── ignore_filter.rs    # 忽略过滤器
    ├── event_batcher.rs    # 事件批处理器
    ├── sync_state_manager.rs  # 同步状态管理器
    ├── file_watcher.rs     # 文件监控器
    └── manager.rs          # 监控器管理器
```

## 核心数据结构

### FileEvent
表示文件系统中发生的单个事件，包含：
- `event_type`: 事件类型（Create, Modify, Delete, Rename）
- `path`: 文件路径
- `old_path`: 旧路径（仅用于 Rename 事件）
- `timestamp`: 事件时间戳

### WatcherState
监控器状态，包括：
- `Running`: 运行中
- `Stopped`: 已停止
- `Error`: 错误状态（包含错误消息）

### FileState
文件同步状态，用于 UI 显示和未来的 Shell Integration：
- `Synced`: 已同步
- `Syncing`: 同步中
- `Conflict`: 冲突
- `Error`: 错误
- `Pending`: 待同步
- `Unknown`: 未知状态

状态优先级（用于文件夹状态聚合）：
```
Error > Conflict > Syncing > Pending > Synced > Unknown
```

## 依赖项

- `notify`: 文件系统监控（已添加到 Cargo.toml）
- `glob`: Glob 模式匹配（已添加到 Cargo.toml）
- `tokio`: 异步运行时（已存在）
- `proptest`: 属性测试框架（已添加到 dev-dependencies）

## 测试

运行模块测试：
```bash
cargo test file_watcher::types
```

所有核心数据结构都包含完整的单元测试，覆盖：
- 数据结构创建
- 状态检查方法
- 优先级比较
- 序列化/反序列化

## 下一步

根据 tasks.md 的实施计划，接下来需要实现：
1. IgnoreFilter 模块（Task 2）
2. EventBatcher 模块（Task 3）
3. SyncStateManager 模块（Task 4）
4. FileWatcher 模块（Task 5）
5. FileWatcherManager 模块（Task 6）
