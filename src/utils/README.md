# 系统工具函数使用指南

## 功能概述

本模块提供了获取系统信息和环境模式的功能，包括：

- 获取运行环境信息（操作系统、架构、应用版本等）
- 检测当前运行模式（开发环境/生产环境）
- 提供便捷的 Hook 和组件

## API 使用

### 1. 基础函数

```typescript
import { getRuntimeEnvironment, getEnvironmentMode, isDevelopmentMode, isProductionMode } from '../utils/system'

// 获取完整的运行环境信息
const envInfo = await getRuntimeEnvironment()
// 示例输出: "OS: windows, Arch: x86_64, App: 0.1.0"

// 获取环境模式
const mode = await getEnvironmentMode()
// 输出: "development" 或 "production"

// 检查是否为开发环境
const isDev = await isDevelopmentMode()
// 输出: true 或 false

// 检查是否为生产环境
const isProd = await isProductionMode()
// 输出: true 或 false
```

### 2. Hook 使用

```typescript
import { useEnvironment } from '../hooks/useEnvironment';

const MyComponent = () => {
  const { mode, isDev, isProd, loading, error } = useEnvironment();

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <p>当前模式: {mode}</p>
      <p>开发环境: {isDev ? '是' : '否'}</p>
      <p>生产环境: {isProd ? '是' : '否'}</p>
    </div>
  );
};
```

### 3. 组件使用

```typescript
import { SystemInfo } from '../components/SystemInfo';
import { EnvironmentBadge } from '../components/EnvironmentBadge';

// 显示完整的系统信息组件
<SystemInfo />

// 显示简单的环境徽章
<EnvironmentBadge />
```

## 实现原理

### Rust 后端

后端使用 Rust 的 `cfg!` 宏来检测编译时的环境：

```rust
#[tauri::command]
pub fn get_environment_mode() -> crate::Result<String> {
    let mode = if cfg!(debug_assertions) {
        "development".to_string()
    } else {
        "production".to_string()
    };

    Ok(mode)
}
```

### 前端实现

前端通过 Tauri 的 `invoke` API 调用后端命令，并提供了多种封装方式：

1. **基础函数**: 直接调用后端命令
2. **Hook**: 提供响应式的状态管理
3. **组件**: 提供开箱即用的 UI 组件

## 注意事项

1. 环境模式检测基于编译时的 `debug_assertions`，这意味着：
   - 使用 `cargo run` 或 `pnpm tauri dev` 启动时为开发环境
   - 使用 `cargo build --release` 或 `pnpm tauri build` 构建时为生产环境

2. 所有函数都是异步的，需要使用 `await` 或 `.then()` 处理

3. 错误处理已经内置，但建议在关键位置添加额外的错误处理

## 扩展功能

可以根据需要扩展以下功能：

- 添加更多系统信息（如内存使用、CPU 信息等）
- 添加环境切换功能（仅限开发环境）
- 添加性能监控功能
- 添加调试工具集成
