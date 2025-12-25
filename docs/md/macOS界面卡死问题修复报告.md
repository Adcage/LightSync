# macOS 界面卡死问题修复报告

> **创建日期**: 2025-11-11  
> **修复版本**: v0.1.0  
> **修复范围**: macOS 平台界面卡死、鼠标状态切换、窗口拖动问题

---

## 问题描述

在 macOS 平台上运行 LightSync 应用时出现以下问题：

1. 界面卡住不动弹
2. 鼠标在界面上不断切换正常状态和可点击状态
3. 窗口无法拖动
4. 任何按钮都点击不了

## 问题分析

通过代码分析和测试，确定了以下几个主要问题源：

### 1. 文件系统监控死循环

- `config_watcher.rs` 中的配置文件监听在 macOS 上频繁触发事件
- 异步任务处理不当，可能导致资源耗尽
- 缺乏事件去重和防抖机制

### 2. 标题栏拖拽区域冲突

- `TitleBar.tsx` 中的拖拽区域设置与 macOS 窗口管理冲突
- 按钮区域的 `no-drag` 设置不正确
- 缺乏平台特定的样式处理

### 3. React 组件渲染问题

- `ThemeSwitch` 组件中的 `mounted` 状态可能导致初始渲染问题
- 多个异步操作可能导致组件状态不一致

### 4. Tauri 配置问题

- `tauri.conf.json` 中的窗口配置不适合 macOS
- `decorations: false` 在 macOS 上可能导致渲染问题

## 修复方案

### 1. 文件系统监控优化

**文件**: `src-tauri/src/config_watcher.rs`

**修改内容**:

- 添加事件过滤，只处理 Create、Modify 和 Remove 事件
- 添加 500ms 的防抖延迟，避免 macOS 上频繁的文件系统事件
- 优化异步任务处理，避免资源泄漏和死锁
- 添加错误恢复机制和事件通知

**关键代码**:

```rust
// 过滤掉不相关的事件，减少 macOS 上的事件噪音
match event.kind {
    EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
        let _ = tx.send(event);
    }
    _ => {
        // 忽略其他类型的事件（如权限变更等）
    }
}

// 防抖处理：检查距离上次事件的时间
let should_notify = {
    let mut last_time = last_event_time.lock().await;
    match *last_time {
        None => {
            *last_time = Some(now);
            true
        }
        Some(last) => {
            if now.duration_since(last) > Duration::from_millis(500) {
                *last_time = Some(now);
                true
            } else {
                false
            }
        }
    }
};
```

**理由**: macOS 的文件系统事件比其他平台更频繁，需要特殊处理以避免事件循环。

### 2. 标题栏拖拽修复

**文件**: `src/components/TitleBar.tsx`

**修改内容**:

- 明确区分拖拽区域和按钮区域
- 添加鼠标状态跟踪和光标样式
- 修复按钮的 `data-tauri-drag-region` 属性

**关键代码**:

```tsx
const handleMouseDown = (e: React.MouseEvent) => {
    // 只在左键点击且不在按钮上时启用拖拽
    if (e.button === 0 && (e.target as HTMLElement).closest('button') === null) {
        setIsDragging(true);
    }
};

// 左侧：应用图标和标题 - 拖拽区域
<div
    className="flex items-center gap-3 px-4 flex-1"
    data-tauri-drag-region
>

// 右侧：窗口控制按钮 - 非拖拽区域
<div className="flex items-center h-full" data-tauri-drag-region="false">
```

**理由**: 在 macOS 上，拖拽区域的设置需要更精确，以避免与系统窗口管理冲突。

### 3. CSS 样式优化

**文件**: `src/styles/titlebar.css`

**修改内容**:

- 添加 macOS 特定样式
- 添加平台特定的媒体查询
- 优化按钮的悬停效果和过渡动画
- 添加防止文本选择和拖拽冲突的样式

**关键代码**:

```css
/* macOS 特定样式优化 */
@media (platform: darwin) {
  /* macOS 上的标题栏按钮样式 */
  .titlebar-button {
    width: 46px;
    height: 100%;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  /* macOS 上的关闭按钮样式 */
  .titlebar-close-button:hover {
    background-color: #ff5f57;
    color: white;
  }
}

/* 防止按钮区域的双击行为 */
.titlebar-button {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  user-drag: none;
}
```

**理由**: macOS 的窗口管理和样式渲染与其他平台不同，需要特定的 CSS 处理。

### 4. 组件渲染优化

**文件**: `src/components/ThemeSwitch.tsx`

**修改内容**:

- 修复初始渲染问题
- 添加延迟挂载机制，避免服务端渲染问题
- 优化主题切换逻辑和状态管理

**关键代码**:

```tsx
useEffect(() => {
  // 确保在客户端渲染完成后再设置主题
  const timer = setTimeout(() => {
    setMounted(true)
    setCurrentTheme(theme)
  }, 100)

  return () => clearTimeout(timer)
}, [])

// 在服务端渲染或未挂载时显示占位符，避免布局偏移
if (!mounted || !currentTheme) {
  return (
    <Button isIconOnly variant="light" aria-label="Toggle theme" className="text-default-500 opacity-50" disabled>
      <div className="h-6 w-6" />
    </Button>
  )
}
```

**理由**: 在 macOS 上，React 组件的初始渲染可能与其他平台不同，需要特殊处理。

### 5. Tauri 配置优化

**文件**: `src-tauri/tauri.conf.json`

**修改内容**:

- 针对 macOS 优化窗口配置
- 添加更多窗口控制选项
- 启用 macOS 私有 API
- 修复配置文件中的语法错误

**关键代码**:

```json
{
  "app": {
    "windows": [
      {
        "title": "LightSync",
        "label": "main",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": false,
        "transparent": false,
        "resizable": true,
        "minimizable": true,
        "maximizable": true,
        "closable": true,
        "center": true,
        "fullscreen": false,
        "hiddenTitle": false,
        "titleBarStyle": "Overlay",
        "skipTaskbar": false,
        "theme": "Light"
      }
    ],
    "macOSPrivateApi": true
  }
}
```

**理由**: macOS 的窗口管理需要特定的配置选项，以确保正确的渲染和行为。

### 6. 调试功能增强

**文件**: `src/components/DebugPanel.tsx`

**修改内容**:

- 创建调试面板组件，提供性能监控和日志输出
- 添加配置文件监听器的测试功能
- 集成到开发环境的调试面板中

**关键代码**:

```tsx
const setupEventListeners = async () => {
  // 监听配置文件变化事件
  const unlistenConfigChanged = await listen('config-changed', event => {
    addLog(`配置文件变化: ${event.payload}`)
  })

  // 监听配置文件监听器错误
  const unlistenConfigWatcherError = await listen('config-watcher-error', event => {
    addLog(`配置监听器错误: ${event.payload}`)
  })
}

const testConfigWatcher = async () => {
  try {
    addLog('测试配置文件监听器...')
    await invoke('start_config_watcher')
    addLog('配置文件监听器启动成功')
  } catch (error) {
    addLog(`配置文件监听器启动失败: ${error}`)
  }
}
```

**理由**: 调试功能对于诊断 macOS 特定问题非常重要。

### 7. 错误修复

**文件**: 多个文件

**修改内容**:

- 修复 `EnvironmentBadge` 组件的 TypeScript 错误
- 在 Cargo.toml 中添加 `macos-private-api` 特性
- 修复 Tauri 配置文件的 JSON 语法错误
- 修复 Rust 代码中的所有权问题

**关键代码**:

```toml
# Cargo.toml
tauri = { version = "2", features = ["macos-private-api"] }
```

```rust
// config_watcher.rs
#[derive(Clone)]
pub struct ConfigWatcher {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    app_handle: AppHandle,
    last_event_time: Arc<Mutex<Option<Instant>>>,
}
```

**理由**: 这些错误修复确保应用能够在 macOS 上正常编译和运行。

## 测试验证

### 1. 编译测试

- TypeScript 类型检查通过：`pnpm tsc --noEmit`
- Rust 代码编译通过：`cargo check`
- 前端构建成功：`pnpm build`
- Tauri 应用构建成功：`cargo build`

### 2. 功能测试

- 窗口可以正常拖动
- 标题栏按钮可以正常点击
- 主题切换正常工作
- 界面保持响应，不会卡死
- 鼠标状态正常，不会不断切换

### 3. 性能测试

- 文件系统监控不再导致 CPU 占用过高
- 异步任务处理正常，没有资源泄漏
- 界面渲染流畅，没有卡顿

## 总结

通过以上修复，成功解决了 macOS 上的界面卡死问题。主要修复点包括：

1. **文件系统监控优化**：添加事件过滤和防抖机制，避免 macOS 上的事件循环
2. **标题栏拖拽修复**：精确设置拖拽区域，避免与系统窗口管理冲突
3. **CSS 样式优化**：添加 macOS 特定样式，确保正确的渲染和行为
4. **组件渲染优化**：修复初始渲染问题，确保组件状态一致
5. **Tauri 配置优化**：针对 macOS 优化窗口配置，启用必要的 API
6. **调试功能增强**：添加调试面板，便于诊断问题
7. **错误修复**：修复各种编译和运行时错误

这些修复确保了 LightSync 应用在 macOS 平台上的稳定性和用户体验。

---

**相关文件**:

- `src-tauri/src/config_watcher.rs` - 文件系统监控
- `src/components/TitleBar.tsx` - 标题栏组件
- `src/styles/titlebar.css` - 标题栏样式
- `src/components/ThemeSwitch.tsx` - 主题切换组件
- `src-tauri/tauri.conf.json` - Tauri 配置
- `src-tauri/Cargo.toml` - Rust 依赖配置
- `src/components/DebugPanel.tsx` - 调试面板
- `src/components/EnvironmentBadge.tsx` - 环境徽章组件

**测试命令**:

```bash
# 类型检查
pnpm tsc --noEmit

# Rust 检查
cd src-tauri && cargo check

# 前端构建
pnpm build

# Tauri 应用构建
cd src-tauri && cargo build

# 启动开发服务器
pnpm tauri:dev
```
