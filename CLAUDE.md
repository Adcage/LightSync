# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

LightSync 是一个基于 Tauri + React + TypeScript 的轻量级文件同步工具。这是一个桌面应用程序，使用 Rust 作为后端，React 作为前端界面。

## 开发命令

### 开发环境
```bash
# 启动开发服务器（前端 + Tauri 应用）
npm run tauri:dev
# 或者只启动前端开发服务器
npm run dev
```

### 构建
```bash
# 构建 React 应用
npm run build

# 启动预览服务器
npm run preview
```

## 技术栈

### 前端
- **React 19** - 使用函数式组件和 hooks
- **TypeScript** - 类型安全的 JavaScript
- **NextUI** - 现代化 UI 组件库
- **next-themes** - 主题切换功能
- **Tailwind CSS** - 原子化 CSS 框架
- **Framer Motion** - 动画库

### 后端（Tauri/Rust）
- **Tauri 2.x** - 轻量级桌面应用框架
- **Rust** - 系统编程语言
- **serde** - 序列化/反序列化
- **thiserror** - 错误处理

## 项目结构

```
src/                    # React 前端源码
  components/           # React 组件
    ThemeSwitch.tsx    # 主题切换组件
  App.tsx             # 主应用组件
  main.tsx            # React 入口点
  index.css           # 全局样式
src-tauri/            # Tauri 后端源码
  src/
    main.rs          # Rust 主程序
  Cargo.toml         # Rust 依赖配置
  tauri.conf.json    # Tauri 配置文件
docs/md/              # 项目文档
.cursor/rules/        # Cursor IDE 规则
```

## 开发规范

### React 组件开发
- 使用函数式组件，避免类组件
- 使用 TypeScript 进行类型定义
- 遵循 NextUI 和 Tailwind CSS 的设计模式
- 使用描述性的变量名和组件名
- 使用 JSDoc 注释提高代码可读性

### 状态管理
- 使用 React hooks 进行本地状态管理
- 使用 next-themes 进行主题切换
- 如需复杂状态管理，推荐使用 Zustand

### 样式开发
- 优先使用 Tailwind CSS 类名
- 使用 NextUI 组件保持一致性
- 支持亮色和暗色主题

### 错误处理
- 使用 try-catch 处理异步操作
- 使用 TypeScript 类型系统防止运行时错误
- 实现用户友好的错误提示

## 架构特点

### 前后端通信
- 使用 Tauri 的 IPC 机制进行前后端通信
- Rust 后端提供系统级功能
- React 前端专注于用户界面和交互

### 主题系统
- 支持系统主题、亮色主题、暗色主题
- 主题切换组件位于右上角固定位置
- 使用 next-themes 进行主题管理

### 响应式设计
- 移动优先的设计原则
- 使用 Tailwind 的响应式工具类
- 应用窗口大小为 800x600

## 配置文件

### package.json
- 包含前端依赖和脚本
- 使用 Vite 作为构建工具
- 支持开发、构建、预览命令

### tauri.conf.json
- Tauri 应用配置
- 前端构建命令和输出目录配置
- 应用图标和窗口设置

### Cargo.toml
- Rust 依赖配置
- 基本的 Tauri 和系统库依赖