# Requirements Document

## Introduction

文件系统监控模块是 LightSync 的核心功能之一，负责实时监控本地同步文件夹的文件变更事件，并触发相应的同步操作。该模块需要高效、准确地检测文件的创建、修改、删除和重命名事件，同时支持灵活的忽略规则配置，避免监控不必要的文件（如临时文件、系统文件等）。前端需要实时显示监控状态和文件变更事件，为用户提供透明的监控体验。

## Glossary

- **FileWatcher**: 文件监控器，负责监控指定目录的文件系统事件
- **FileEvent**: 文件事件，包括创建(Create)、修改(Modify)、删除(Delete)、重命名(Rename)等类型
- **IgnoreFilter**: 忽略过滤器，根据规则过滤不需要监控的文件和目录
- **GlobPattern**: Glob 模式，用于匹配文件路径的通配符模式（如 `*.tmp`, `node_modules/**`）
- **WatcherState**: 监控器状态，包括运行中(Running)、已停止(Stopped)、错误(Error)等
- **EventBatch**: 事件批次，将短时间内的多个事件合并处理，避免频繁触发同步
- **RecursiveWatch**: 递归监控，监控目录及其所有子目录
- **SyncFolder**: 同步文件夹，需要被监控的本地目录
- **FrontendUI**: 前端用户界面，显示监控状态和事件信息
- **FileState**: 文件同步状态，包括已同步(Synced)、同步中(Syncing)、冲突(Conflict)、错误(Error)、待同步(Pending)

## Requirements

### Requirement 1

**User Story:** 作为用户，我希望系统能够自动监控同步文件夹的文件变更，以便在文件发生变化时自动触发同步操作。

#### Acceptance Criteria

1. WHEN 用户启用某个 SyncFolder 的监控功能 THEN THE FileWatcher SHALL 开始监控该目录及其所有子目录的文件系统事件
2. WHEN 监控的目录中有文件被创建 THEN THE FileWatcher SHALL 生成 Create 类型的 FileEvent
3. WHEN 监控的目录中有文件被修改 THEN THE FileWatcher SHALL 生成 Modify 类型的 FileEvent
4. WHEN 监控的目录中有文件被删除 THEN THE FileWatcher SHALL 生成 Delete 类型的 FileEvent
5. WHEN 监控的目录中有文件被重命名 THEN THE FileWatcher SHALL 生成 Rename 类型的 FileEvent，包含旧路径和新路径信息

### Requirement 2

**User Story:** 作为用户，我希望系统能够智能地批处理文件事件，以避免频繁的同步操作影响性能。

#### Acceptance Criteria

1. WHEN FileWatcher 在短时间内（500ms）接收到多个相同文件的事件 THEN THE FileWatcher SHALL 将这些事件合并为一个 EventBatch
2. WHEN EventBatch 的等待时间超过配置的阈值（默认 500ms）THEN THE FileWatcher SHALL 触发批次处理
3. WHEN 批次处理被触发 THEN THE FileWatcher SHALL 将 EventBatch 发送给同步引擎
4. WHEN 同一文件在批次中既有创建又有修改事件 THEN THE FileWatcher SHALL 只保留最终的修改事件
5. WHEN 同一文件在批次中既有创建又有删除事件 THEN THE FileWatcher SHALL 取消这两个事件（无需同步）

### Requirement 3

**User Story:** 作为用户，我希望系统能够自动忽略某些不需要同步的文件，以减少不必要的同步操作和存储空间占用。

#### Acceptance Criteria

1. THE IgnoreFilter SHALL 支持默认忽略规则，包括临时文件（`*.tmp`, `*.temp`）、系统文件（`.DS_Store`, `Thumbs.db`）、版本控制目录（`.git/**`, `.svn/**`）
2. WHEN 用户配置自定义忽略规则 THEN THE IgnoreFilter SHALL 将用户规则与默认规则合并
3. WHEN FileWatcher 接收到 FileEvent THEN THE IgnoreFilter SHALL 检查文件路径是否匹配任何忽略规则
4. WHEN 文件路径匹配忽略规则 THEN THE IgnoreFilter SHALL 丢弃该 FileEvent，不触发同步
5. THE IgnoreFilter SHALL 支持 GlobPattern 语法，包括通配符（`*`, `**`, `?`）和否定模式（`!pattern`）

### Requirement 4

**User Story:** 作为用户，我希望能够灵活配置每个同步文件夹的忽略规则，以满足不同场景的需求。

#### Acceptance Criteria

1. WHEN 用户为 SyncFolder 添加忽略规则 THEN THE System SHALL 将规则保存到配置文件
2. WHEN 用户修改 SyncFolder 的忽略规则 THEN THE System SHALL 立即应用新规则到 FileWatcher
3. WHEN 用户删除 SyncFolder 的忽略规则 THEN THE System SHALL 恢复使用默认忽略规则
4. THE System SHALL 支持为每个 SyncFolder 配置独立的忽略规则列表
5. WHEN 用户查看 SyncFolder 配置 THEN THE FrontendUI SHALL 显示当前生效的所有忽略规则（默认规则 + 自定义规则）

### Requirement 5

**User Story:** 作为用户，我希望在前端界面实时看到文件监控的状态和最近的文件变更事件，以了解系统的工作情况。

#### Acceptance Criteria

1. WHEN FileWatcher 启动或停止 THEN THE System SHALL 通过事件通知 FrontendUI 更新 WatcherState
2. WHEN FileWatcher 检测到 FileEvent THEN THE System SHALL 通过事件通知 FrontendUI 显示事件详情（文件路径、事件类型、时间戳）
3. THE FrontendUI SHALL 显示每个 SyncFolder 的当前 WatcherState（运行中、已停止、错误）
4. THE FrontendUI SHALL 显示最近 50 条 FileEvent 的列表，包括文件路径、事件类型、时间戳
5. WHEN 用户点击某个 SyncFolder THEN THE FrontendUI SHALL 只显示该文件夹的 FileEvent

### Requirement 6

**User Story:** 作为用户，我希望系统能够处理文件监控过程中的各种错误情况，并提供清晰的错误信息。

#### Acceptance Criteria

1. WHEN FileWatcher 无法访问监控目录（权限不足、目录不存在）THEN THE System SHALL 将 WatcherState 设置为 Error，并记录错误信息
2. WHEN FileWatcher 遇到系统资源限制（如文件描述符不足）THEN THE System SHALL 记录警告信息，并尝试继续监控其他目录
3. WHEN FileWatcher 检测到监控目录被删除 THEN THE System SHALL 停止监控该目录，并通知用户
4. WHEN FileWatcher 检测到监控目录被移动 THEN THE System SHALL 尝试重新定位目录，如果失败则停止监控
5. WHEN FileWatcher 发生错误 THEN THE FrontendUI SHALL 显示错误状态和错误消息

### Requirement 7

**User Story:** 作为开发者，我希望文件监控模块具有良好的性能表现，不会占用过多的系统资源。

#### Acceptance Criteria

1. WHEN FileWatcher 监控包含 10,000 个文件的目录 THEN THE System SHALL 在 2 秒内完成初始化
2. WHEN FileWatcher 运行时 THEN THE System SHALL 保持 CPU 使用率低于 5%（空闲状态）
3. WHEN FileWatcher 处理文件事件时 THEN THE System SHALL 保持 CPU 使用率低于 15%（活跃状态）
4. WHEN FileWatcher 监控多个 SyncFolder THEN THE System SHALL 为每个文件夹使用独立的监控线程，避免相互阻塞
5. THE FileWatcher SHALL 使用操作系统原生的文件监控 API（Windows: ReadDirectoryChangesW, macOS: FSEvents, Linux: inotify）以获得最佳性能

### Requirement 8

**User Story:** 作为用户，我希望能够手动控制文件监控的启动和停止，以便在需要时暂停监控。

#### Acceptance Criteria

1. WHEN 用户点击"启动监控"按钮 THEN THE System SHALL 启动对应 SyncFolder 的 FileWatcher
2. WHEN 用户点击"停止监控"按钮 THEN THE System SHALL 停止对应 SyncFolder 的 FileWatcher
3. WHEN FileWatcher 停止后 THEN THE System SHALL 释放所有相关资源（文件句柄、线程等）
4. WHEN 用户重启应用程序 THEN THE System SHALL 根据配置自动恢复之前启用的 FileWatcher
5. THE FrontendUI SHALL 为每个 SyncFolder 提供启动/停止监控的控制按钮

### Requirement 9 (Architecture Design - 为未来扩展预留)

**User Story:** 作为开发者，我希望系统的状态管理架构设计良好，以便未来可以轻松扩展新功能（如文件管理器图标集成），而不需要大量重构代码。

**设计原则**: Phase 3 只需要实现核心的状态管理功能，但架构设计要考虑未来的扩展性。

#### Acceptance Criteria (Phase 3 核心功能)

1. THE System SHALL 维护每个文件的同步状态（Synced, Syncing, Conflict, Error, Pending）
2. THE System SHALL 提供集中式状态管理模块，使用内存缓存存储文件状态
3. THE System SHALL 提供状态查询接口，响应时间 < 100ms
4. WHEN 文件状态变更 THEN THE System SHALL 通知 FrontendUI 更新显示
5. THE System SHALL 使用观察者模式（Observer Pattern）设计状态变更通知机制，便于未来添加新的监听者

**架构扩展性要求**:

- 状态管理模块应该是独立的、可复用的
- 状态查询接口应该是通用的，不依赖特定的调用方
- 状态变更通知应该支持多个监听者（不仅仅是 UI）
