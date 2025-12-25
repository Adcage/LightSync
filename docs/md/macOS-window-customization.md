# macOS 自定义窗口实现指南

本文档记录了 LightSync 项目在 macOS 上实现自定义标题栏、窗口拖拽和红绿灯按钮的关键配置。

## 目标效果

- ✅ 显示 macOS 原生红绿灯按钮（关闭、最小化、最大化）
- ✅ 隐藏系统标题栏文字
- ✅ 自定义标题栏区域可拖拽移动窗口
- ✅ 窗口保持圆角
- ✅ 无启动白屏

---

## 一、Tauri 配置差异（Tauri 1.x vs Tauri 2.0）

### pot-desktop（Tauri 1.x）

pot 项目使用 Tauri 1.x，窗口配置在 **Rust 代码** 中动态设置：

```rust
// pot-desktop/src-tauri/src/window.rs
#[cfg(target_os = "macos")]
{
    builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)  // 显示红绿灯
        .hidden_title(true);                              // 隐藏标题文字
}
#[cfg(not(target_os = "macos"))]
{
    builder = builder.transparent(true).decorations(false);  // Windows/Linux 无边框
}
```

**特点**：

- 使用 `WindowBuilder` 动态创建窗口
- `data-tauri-drag-region='true'` 属性直接生效
- 不需要额外的权限配置

### LightSync（Tauri 2.0）

LightSync 使用 Tauri 2.0，配置方式有显著变化：

#### 1. tauri.conf.json 配置

```json
{
  "app": {
    "windows": [
      {
        "title": "LightSync",
        "label": "main",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "minimizable": true,
        "maximizable": true,
        "closable": true,
        "center": true
        // 注意：不设置 decorations、transparent、titleBarStyle
        // 这些在 Rust 代码中动态设置
      }
    ],
    "macOSPrivateApi": true // 启用 macOS 私有 API
  }
}
```

#### 2. Rust setup 钩子配置

```rust
// LightSync/src-tauri/src/lib.rs
.setup(|app| {
    use tauri::Manager;

    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "macos")]
        {
            use tauri::TitleBarStyle;
            // 设置标题栏样式为 Overlay，显示红绿灯按钮
            let _ = window.set_title_bar_style(TitleBarStyle::Overlay);
            // 隐藏标题文字
            let _ = window.set_title("");
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Windows/Linux 移除系统装饰
            let _ = window.set_decorations(false);
        }
    }
    Ok(())
})
```

#### 3. Cargo.toml 依赖配置

```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api", "unstable"] }
```

**关键特性说明**：

- `macos-private-api`: 启用 macOS 私有 API，支持 `TitleBarStyle::Overlay`
- `unstable`: 启用不稳定特性（某些窗口 API 需要）

---

## 二、窗口拖拽实现

### pot-desktop（Tauri 1.x）方式

使用 HTML 属性 `data-tauri-drag-region='true'`：

```jsx
<div className="fixed left-[5px] right-[5px] top-[5px] h-[30px]" data-tauri-drag-region="true" />
```

**特点**：直接在 HTML 元素上添加属性即可，无需 JavaScript 代码。

### LightSync（Tauri 2.0）方式

使用 JavaScript API `getCurrentWindow().startDragging()`：

```tsx
import { getCurrentWindow } from '@tauri-apps/api/window'

// 窗口拖拽处理函数
const handleDrag = async (e: React.MouseEvent) => {
  if (e.button === 0) {
    // 只响应左键
    e.preventDefault()
    await getCurrentWindow().startDragging()
  }
}

// 在可拖拽区域使用
;<div onMouseDown={handleDrag}>{/* 拖拽区域内容 */}</div>
```

**为什么不用 `data-tauri-drag-region`？**

在 Tauri 2.0 + `TitleBarStyle::Overlay` 模式下，`data-tauri-drag-region` 属性不生效。必须使用 JavaScript API 方式。

### 权限配置（Tauri 2.0 特有）

在 `src-tauri/capabilities/default.json` 中添加权限：

```json
{
  "permissions": [
    "core:window:allow-start-dragging", // 允许窗口拖拽
    "core:window:allow-set-decorations" // 允许设置窗口装饰
    // ... 其他权限
  ]
}
```

---

## 三、关键属性说明

### TitleBarStyle 枚举值

| 值            | 说明                   | macOS 效果                           |
| ------------- | ---------------------- | ------------------------------------ |
| `Visible`     | 默认值，显示完整标题栏 | 标准 macOS 窗口                      |
| `Transparent` | 透明标题栏             | 红绿灯按钮显示，标题栏透明           |
| `Overlay`     | 覆盖模式               | 红绿灯按钮显示，内容延伸到标题栏区域 |

**LightSync 使用 `Overlay`**：内容可以延伸到标题栏区域，同时保留红绿灯按钮。

### decorations 属性

| 值      | 说明                             |
| ------- | -------------------------------- |
| `true`  | 显示系统窗口装饰（标题栏、边框） |
| `false` | 移除系统窗口装饰，完全自定义     |

**注意**：在 macOS 上使用 `TitleBarStyle::Overlay` 时，不需要设置 `decorations: false`。

### transparent 属性

| 值      | 说明                   |
| ------- | ---------------------- |
| `true`  | 窗口背景透明，支持圆角 |
| `false` | 窗口背景不透明         |

**注意**：在 macOS 上使用 `TitleBarStyle::Overlay` 时，窗口自动保持圆角，不需要设置 `transparent: true`。

### macOSPrivateApi

在 `tauri.conf.json` 中设置：

```json
{
  "app": {
    "macOSPrivateApi": true
  }
}
```

**作用**：启用 macOS 私有 API，支持以下功能：

- `TitleBarStyle::Overlay` 和 `TitleBarStyle::Transparent`
- 窗口透明度控制
- 其他高级窗口特性

---

## 四、与 pot-desktop 的主要差异

| 特性             | pot-desktop (Tauri 1.x)       | LightSync (Tauri 2.0)                    |
| ---------------- | ----------------------------- | ---------------------------------------- |
| **框架版本**     | Tauri 1.x                     | Tauri 2.0                                |
| **窗口配置位置** | Rust `WindowBuilder`          | `setup` 钩子 + `tauri.conf.json`         |
| **拖拽实现**     | `data-tauri-drag-region` 属性 | `getCurrentWindow().startDragging()` API |
| **权限系统**     | 无（allowlist 模式）          | capabilities 权限文件                    |
| **API 导入**     | `@tauri-apps/api/window` (v1) | `@tauri-apps/api/window` (v2)            |
| **窗口获取**     | `appWindow`                   | `getCurrentWindow()`                     |

### 代码对比

**pot-desktop 拖拽区域**：

```jsx
<div data-tauri-drag-region="true" className="h-[30px]" />
```

**LightSync 拖拽区域**：

```tsx
const handleDrag = async (e: React.MouseEvent) => {
  if (e.button === 0) {
    e.preventDefault()
    await getCurrentWindow().startDragging()
  }
}

;<div onMouseDown={handleDrag} className="h-[35px]" />
```

---

## 五、完整配置清单

### 1. tauri.conf.json

```json
{
  "app": {
    "windows": [{ "label": "main", ... }],
    "macOSPrivateApi": true
  }
}
```

### 2. Cargo.toml

```toml
tauri = { version = "2", features = ["macos-private-api", "unstable"] }
```

### 3. lib.rs setup 钩子

```rust
.setup(|app| {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "macos")]
        {
            use tauri::TitleBarStyle;
            let _ = window.set_title_bar_style(TitleBarStyle::Overlay);
            let _ = window.set_title("");
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = window.set_decorations(false);
        }
    }
    Ok(())
})
```

### 4. capabilities/default.json

```json
{
  "permissions": [
    "core:window:allow-start-dragging",
    "core:window:allow-set-decorations",
    ...
  ]
}
```

### 5. React 组件

```tsx
import { getCurrentWindow } from '@tauri-apps/api/window'

const handleDrag = async (e: React.MouseEvent) => {
  if (e.button === 0) {
    e.preventDefault()
    await getCurrentWindow().startDragging()
  }
}

// 在标题栏区域使用
;<div onMouseDown={handleDrag}>...</div>
```

---

## 六、常见问题

### Q: 红绿灯按钮不显示？

A: 检查以下配置：

1. `tauri.conf.json` 中 `macOSPrivateApi: true`
2. `Cargo.toml` 中 `features = ["macos-private-api"]`
3. Rust 代码中调用 `set_title_bar_style(TitleBarStyle::Overlay)`

### Q: 窗口无法拖拽？

A: 检查以下配置：

1. `capabilities/default.json` 中添加 `core:window:allow-start-dragging`
2. 使用 `getCurrentWindow().startDragging()` API 而非 `data-tauri-drag-region`

### Q: 窗口是直角而非圆角？

A: 在 macOS 上使用 `TitleBarStyle::Overlay` 时，窗口自动保持圆角。如果是直角，检查是否错误设置了 `decorations: false`。

### Q: 启动时白屏？

A: 在 `index.html` 中添加：

```html
<style>
  html,
  body {
    background-color: transparent;
  }
</style>
```
