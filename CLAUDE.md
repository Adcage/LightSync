# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

LightSync 是一个基于 Tauri + React + TypeScript 的轻量级 WebDAV 文件同步工具。这是一个跨平台桌面应用程序，使用 Rust 作为后端处理文件同步和系统操作，React 作为前端提供用户界面。

## 开发命令

### 开发环境
```bash
# 启动开发服务器（前端 + Tauri 应用）- 主要开发命令
npm run tauri:dev

# 或者只启动前端开发服务器（用于 UI 开发）
npm run dev
```

### 构建和类型检查
```bash
# 完整构建流程（TypeScript 编译 + Vite 构建）
npm run build

# 启动预览服务器
npm run preview
```

**注意**：配置文件使用 pnpm 作为包管理器（`tauri.conf.json`），但 npm 也可以正常工作。

## 技术栈

### 前端
- **React 19** - 函数式组件和 hooks
- **TypeScript 5.8** - 严格模式类型检查
- **Vite 7** - 构建工具和开发服务器
- **NextUI 2.4** - 现代化 UI 组件库
- **next-themes** - 主题切换功能
- **Tailwind CSS 3.4** - 原子化 CSS 框架
- **Framer Motion** - 动画库

### 后端（Tauri/Rust）
- **Tauri 2.x** - 轻量级桌面应用框架
- **tokio** - 异步运行时（带完整特性）
- **serde/serde_json** - JSON 序列化，使用驼峰命名（`#[serde(rename_all = "camelCase")]`）
- **thiserror** - 统一错误处理系统
- **notify 6** - 文件系统监控
- **chrono** - 时间处理

### Tauri 插件
- **tauri-plugin-sql** - SQLite 数据库支持
- **tauri-plugin-store** - 持久化键值存储（用于配置管理）
- **tauri-plugin-fs** - 文件系统访问
- **tauri-plugin-opener** - 打开外部链接/文件

## 核心架构

### 后端模块结构（src-tauri/src/）

项目采用模块化设计，主要模块包括：

- **error.rs** - 统一错误处理系统
  - 定义 `SyncError` 枚举涵盖所有错误类型（IO、WebDAV、网络、配置、数据库等）
  - 导出自定义 `Result<T>` 类型别名 = `std::result::Result<T, SyncError>`
  - 实现 `Serialize` trait 使错误可序列化到前端
  - 使用 `thiserror` 派生，支持 `#[from]` 自动转换

- **config.rs** - 配置管理系统
  - 使用 `tauri-plugin-store` 进行持久化存储
  - 主配置结构：`AppConfig`（版本、语言、主题、自动启动等）
  - 嵌套配置：`SyncFolderConfig`（同步文件夹）、`WebDavServerConfig`（WebDAV 服务器）
  - **重要**：所有配置结构使用 `#[serde(rename_all = "camelCase")]` 与前端保持一致
  - 提供细粒度配置操作：`get_config_value`、`set_config_value`
  - 存储文件：使用常量 `CONFIG_STORE_FILE` 定义

- **config_watcher.rs** - 配置文件监听
  - 使用 `notify` crate 监控配置文件变化
  - 通过 Tauri 事件系统（`emit`）向前端发送 `config-changed` 事件
  - 异步任务处理文件系统事件
  - 支持启动/停止监听

- **database.rs** - 数据库类型定义
  - 定义数据结构对应 SQLite 表：`FileMetadata`、`SyncLog`、`SyncSession`
  - **注意**：数据库操作在前端通过 `@tauri-apps/plugin-sql` 执行
  - 后端仅提供类型定义和序列化支持

- **constants.rs** - 常量定义（如 APP_VERSION、DEFAULT_LANGUAGE、DEFAULT_THEME）

- **lib.rs** - 主入口点
  - 注册所有 Tauri 命令（配置管理、配置监听、错误测试等）
  - 配置 SQL 插件和数据库迁移
  - 迁移文件位于 `src-tauri/migrations/`

### 数据库架构

使用 SQLite，通过 `tauri-plugin-sql` 自动迁移管理：

- **file_metadata** - 文件元数据表
  - 存储同步文件的路径、哈希、大小、修改时间、同步状态等
  - 状态：synced, pending, conflict, error
  - 唯一约束：(sync_folder_id, path)

- **sync_logs** - 同步日志表
  - 记录所有同步操作（upload、download、delete、conflict）
  - 包含操作状态、错误信息、耗时等

- **sync_sessions** - 同步会话表
  - 记录完整的同步会话信息
  - 统计上传/下载/删除/冲突文件数和总字节数

迁移文件：`src-tauri/migrations/001_initial.sql`

### 前端组件结构（src/）

- **App.tsx** - 主应用入口
  - 集成 NextUIProvider 和 NextThemesProvider
  - 包含 ErrorBoundary、TitleBar、主题切换和测试组件
  - 使用自定义标题栏（无装饰窗口）

- **components/**
  - `ErrorBoundary.tsx` - React 错误边界
  - `TitleBar.tsx` - 自定义窗口标题栏
  - `ThemeSwitch.tsx` - 主题切换组件
  - `ConfigTest.tsx` - 配置系统测试组件
  - `DatabaseTest.tsx` - 数据库测试组件

### Tauri 命令调用模式

前端通过 `@tauri-apps/api` 调用 Rust 命令：

```typescript
import { invoke } from '@tauri-apps/api/core';

// 调用返回 Result<T> 的命令
const config = await invoke<AppConfig>('get_config');

// 错误处理
try {
  await invoke('update_config', { config: newConfig });
} catch (error) {
  // error 是序列化的 SyncError 字符串
}
```

### 配置管理工作流

1. 应用启动时调用 `init_config` 初始化配置
2. 使用 `tauri-plugin-store` 将配置持久化为 JSON
3. 配置变更时调用 `update_config` 保存
4. 可选启动 `config_watcher` 监听外部配置文件变更
5. 前端通过 Tauri 事件监听 `config-changed` 事件

## 窗口配置

- 默认尺寸：1200x800
- 最小尺寸：800x600
- 无系统装饰（decorations: false）- 使用自定义标题栏
- 可调整大小

## 开发规范

### TypeScript/React
- 使用函数式组件和 hooks，避免类组件
- 严格模式 TypeScript（`strict: true`）
- 使用描述性变量名（如 `isLoading`, `hasError`）
- NextUI 组件优先，Tailwind 用于自定义样式
- 支持亮色/暗色主题，使用 `dark:` 前缀

### Rust
- 所有公共函数使用 `/// 文档注释`
- 错误处理：使用 `Result<T>` 类型，返回 `SyncError`
- 异步函数使用 `async fn` 和 `tokio` 运行时
- 配置结构体必须添加 `#[serde(rename_all = "camelCase")]`
- 命名：蛇形命名（snake_case）用于变量/函数，帕斯卡命名（PascalCase）用于类型

### 测试
- Rust 单元测试位于每个模块的 `#[cfg(test)] mod tests`
- 配置和数据库模块已有完整的序列化测试
- 前端使用 ErrorBoundary 捕获运行时错误

## Cursor IDE 规则

项目包含三个 Cursor 规则文件（`.cursor/rules/`）：

1. **rust-rule.mdc** - Rust 开发规范
   - 强调异步编程、tokio 使用、错误处理
   - 模块化设计、清晰的代码组织

2. **react-rule.mdc** - React/TypeScript 开发规范
   - 函数式编程、hooks 优先
   - 最小化 `use client` 和 `useEffect`
   - Tailwind CSS 和 NextUI 组件使用

3. **tauri-rule.mdc** - Tauri 项目整体规范
   - 跨平台兼容性
   - Tauri、Rust 和 Node.js 无缝集成
   - 安全性和性能优化

## 关键约定

1. **配置序列化**：Rust 端使用驼峰命名与前端 TypeScript 保持一致
2. **错误传播**：所有 Tauri 命令返回 `Result<T>`，错误自动序列化到前端
3. **数据库操作**：在前端通过 SQL 插件执行，后端仅提供类型定义
4. **文件监听**：使用 `notify` crate + Tauri 事件系统进行实时通知
5. **模块导出**：在 `lib.rs` 中公开导出核心类型供其他模块使用