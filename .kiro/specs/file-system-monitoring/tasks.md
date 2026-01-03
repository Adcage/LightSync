# Implementation Plan - File System Monitoring

## Task List

- [x] 1. 设置项目依赖和基础结构
  - 添加 `notify`, `glob`, `tokio`, `proptest` 等依赖到 Cargo.toml
  - 创建 `src-tauri/src/file_watcher/` 模块目录结构
  - 定义核心数据结构（FileEvent, WatcherState, FileState）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. 实现 IgnoreFilter 模块
  - 创建 `ignore_filter.rs` 文件
  - 实现默认忽略规则（临时文件、系统文件、版本控制目录）
  - 实现 Glob 模式匹配功能
  - 实现自定义规则添加/删除/查询接口
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.1 编写 IgnoreFilter 属性测试
  - **Property 7: Default ignore rules effectiveness** - **Validates: Requirements 3.1**
  - **Property 8: Custom and default rules merge** - **Validates: Requirements 3.2**
  - **Property 9: Ignore filter application** - **Validates: Requirements 3.3, 3.4**
  - **Property 10: Glob pattern support** - **Validates: Requirements 3.5**
  - **Property 11: Ignore rules persistence** - **Validates: Requirements 4.1**
  - **Property 13: Ignore rules reset** - **Validates: Requirements 4.3**
  - **Property 14: Per-folder rule isolation** - **Validates: Requirements 4.4**
  - **Property 15: Effective rules query** - **Validates: Requirements 4.5**

- [ ] 3. 实现 EventBatcher 模块
  - 创建 `event_batcher.rs` 文件
  - 实现事件缓存（HashMap<PathBuf, Vec<FileEvent>>）
  - 实现批处理定时器（500ms 间隔）
  - 实现事件合并规则（Create+Modify, Create+Delete, Modify+Modify）
  - 实现批次发送机制
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.1 编写 EventBatcher 属性测试
  - **Property 3: Event batching within time window** - **Validates: Requirements 2.1, 2.2**
  - **Property 4: Event merge rule - Create + Modify** - **Validates: Requirements 2.4**
  - **Property 5: Event merge rule - Create + Delete** - **Validates: Requirements 2.5**
  - **Property 6: Batch delivery after timeout** - **Validates: Requirements 2.3**

- [ ] 4. 实现 SyncStateManager 模块
  - 创建 `sync_state_manager.rs` 文件
  - 实现状态缓存（Arc<RwLock<HashMap<PathBuf, FileState>>>）
  - 实现状态查询接口（get_file_state, get_multiple_states）
  - 实现状态设置接口（set_file_state）
  - 实现状态变更通知（broadcast channel）
  - 实现文件夹状态聚合算法
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 4.1 扩展数据库 schema
  - 创建数据库迁移文件 `003_file_state.sql`
  - 添加 `sync_state` 和 `state_updated_at` 字段到 file_metadata 表
  - 创建索引（idx_file_metadata_sync_state, idx_file_metadata_state_updated）
  - _Requirements: 9.1_

- [ ] 4.2 实现状态持久化
  - 实现 `update_file_state` 数据库操作
  - 实现 `load_all_file_states` 数据库操作
  - 实现应用启动时的状态恢复逻辑
  - _Requirements: 9.1_

- [ ] 4.3 编写 SyncStateManager 属性测试
  - **Property 28: File state maintenance** - **Validates: Requirements 9.1**
  - **Property 29: State query performance** - **Validates: Requirements 9.3**
  - **Property 30: State change notification** - **Validates: Requirements 9.4**

- [ ] 5. 实现 FileWatcher 模块
  - 创建 `file_watcher.rs` 文件
  - 使用 `notify` crate 创建文件监控器
  - 实现递归监控功能
  - 实现事件处理循环（接收 notify 事件 → 转换为 FileEvent）
  - 集成 IgnoreFilter（过滤事件）
  - 集成 EventBatcher（批处理事件）
  - 实现启动/停止接口
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5.1 实现错误处理
  - 处理权限不足错误
  - 处理目录不存在错误
  - 处理目录被删除/移动事件
  - 实现错误状态设置和通知
  - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [ ] 5.2 编写 FileWatcher 属性测试
  - **Property 1: File event detection completeness** - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
  - **Property 2: Recursive monitoring coverage** - **Validates: Requirements 1.1**
  - **Property 21: Directory deletion handling** - **Validates: Requirements 6.3**
  - **Property 22: Directory move handling** - **Validates: Requirements 6.4**
  - **Property 23: Error state propagation** - **Validates: Requirements 6.5**

- [ ] 6. 实现 FileWatcherManager 模块
  - 创建 `file_watcher_manager.rs` 文件
  - 实现监控器实例管理（HashMap<String, FileWatcher>）
  - 实现 start_watching 接口
  - 实现 stop_watching 接口
  - 实现状态查询接口
  - 实现 Tauri 事件发送（watcher-state-changed, file-event）
  - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.2_

- [ ] 6.1 实现监控状态持久化和恢复
  - 保存监控状态到配置文件
  - 应用启动时自动恢复监控器
  - _Requirements: 8.4_

- [ ] 6.2 编写 FileWatcherManager 属性测试
  - **Property 24: Concurrent folder monitoring** - **Validates: Requirements 7.4**
  - **Property 25: Start monitoring command** - **Validates: Requirements 8.1**
  - **Property 26: Stop monitoring command** - **Validates: Requirements 8.2**
  - **Property 27: Monitoring state persistence** - **Validates: Requirements 8.4**

- [ ] 7. 创建 Tauri 命令接口
  - 创建 `start_file_watching` 命令
  - 创建 `stop_file_watching` 命令
  - 创建 `get_watcher_state` 命令
  - 创建 `get_recent_file_events` 命令
  - 创建 `add_ignore_rule` 命令
  - 创建 `remove_ignore_rule` 命令
  - 创建 `get_effective_ignore_rules` 命令
  - 在 `lib.rs` 中注册所有命令
  - _Requirements: 4.1, 4.2, 4.5, 5.5, 8.1, 8.2_

- [ ] 7.1 编写 Tauri 命令集成测试
  - 测试启动/停止监控命令
  - 测试忽略规则管理命令
  - 测试状态查询命令
  - 测试事件查询命令

- [ ] 8. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 9. 实现前端 UI 组件
  - 创建 `FileWatcherStatus.tsx` 组件（显示监控状态）
  - 创建 `FileEventList.tsx` 组件（显示最近 50 条事件）
  - 创建 `IgnoreRulesConfig.tsx` 组件（配置忽略规则）
  - 实现 Tauri 事件监听（watcher-state-changed, file-event）
  - 集成到 SyncFolder 配置页面
  - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9.1 创建前端工具函数
  - 创建 `src/utils/fileWatcher.ts`（封装 Tauri 命令调用）
  - 创建 `useFileWatcher` Hook（管理监控状态）
  - 创建 `useFileEvents` Hook（管理事件列表）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9.2 编写前端组件测试
  - 测试 FileWatcherStatus 组件渲染
  - 测试 FileEventList 组件渲染和过滤
  - 测试 IgnoreRulesConfig 组件交互
  - 测试 useFileWatcher Hook 状态管理

- [ ] 10. 实现忽略规则热更新
  - 监听配置变更事件
  - 动态更新 IgnoreFilter 规则
  - 通知所有 FileWatcher 实例重新加载规则
  - _Requirements: 4.2_

- [ ] 10.1 编写忽略规则热更新属性测试
  - **Property 12: Ignore rules hot reload** - **Validates: Requirements 4.2**

- [ ] 11. 实现状态通知机制
  - 实现状态变更事件发送到前端
  - 实现文件事件发送到前端
  - 实现错误通知发送到前端
  - 优化事件发送频率（避免过于频繁）
  - _Requirements: 5.1, 5.2, 6.5_

- [ ] 11.1 编写状态通知属性测试
  - **Property 16: Watcher state notification** - **Validates: Requirements 5.1**
  - **Property 17: File event notification** - **Validates: Requirements 5.2**
  - **Property 18: Watcher state query** - **Validates: Requirements 5.3**
  - **Property 19: Event list size limit** - **Validates: Requirements 5.4**
  - **Property 20: Per-folder event filtering** - **Validates: Requirements 5.5**

- [ ] 12. 性能优化
  - 优化状态查询性能（确保 < 100ms）
  - 优化事件批处理性能
  - 优化内存使用（限制缓存大小）
  - 添加性能监控日志
  - _Requirements: 7.1, 7.2, 7.3, 9.3_

- [ ] 12.1 编写性能测试
  - 测试初始化时间（10,000 个文件 < 2s）
  - 测试状态查询性能（< 100ms）
  - 测试内存使用（< 50MB）
  - 测试 CPU 使用率（空闲 < 5%, 活跃 < 15%）

- [ ] 13. 最终 Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 14. 文档和示例
  - 编写 API 文档（Rust 文档注释）
  - 编写用户使用指南
  - 创建示例配置文件
  - 更新 README

## 任务执行说明

### 开发顺序

1. **Phase 1 (Tasks 1-4)**: 核心模块实现（IgnoreFilter, EventBatcher, SyncStateManager）
2. **Phase 2 (Tasks 5-7)**: 文件监控实现（FileWatcher, FileWatcherManager, Tauri 命令）
3. **Phase 3 (Tasks 9-11)**: 前端集成和通知机制
4. **Phase 4 (Tasks 12-14)**: 性能优化和文档

### 测试策略

- 所有测试任务都是必须实现的，确保全面的测试覆盖
- 属性测试使用 `proptest` 框架，每个属性运行至少 100 次迭代
- 每个属性测试必须包含注释：`// **Feature: file-system-monitoring, Property X: [property name]**`
- Checkpoint 任务用于确保阶段性测试通过

### 依赖关系

- Task 2 (IgnoreFilter) 独立，可以先实现
- Task 3 (EventBatcher) 独立，可以先实现
- Task 4 (SyncStateManager) 依赖 Task 4.1 (数据库扩展)
- Task 5 (FileWatcher) 依赖 Task 2, 3
- Task 6 (FileWatcherManager) 依赖 Task 4, 5
- Task 7 (Tauri 命令) 依赖 Task 6
- Task 9 (前端 UI) 依赖 Task 7
- Task 10, 11 (热更新和通知) 依赖 Task 6, 9

### 性能目标

- 初始化时间: < 2s (10,000 个文件)
- CPU 使用率: < 5% (空闲), < 15% (活跃)
- 内存使用: < 50MB (监控 10 个文件夹)
- 状态查询: < 100ms

### 注意事项

1. 所有文件路径使用 `PathBuf`，确保跨平台兼容
2. 使用 `Arc<RwLock<T>>` 实现线程安全的共享状态
3. 使用 `tokio::spawn` 处理异步任务，避免阻塞主线程
4. 错误处理使用统一的 `SyncError` 类型
5. 所有 Tauri 事件使用 `app_handle.emit_all()` 发送
6. 状态持久化使用异步操作，不阻塞主流程
