# macOS 窗口按钮支持说明

## 概述

LightSync 已经正确配置了对 macOS 原生窗口按钮（红黄绿三个圆点）的支持。本文档说明实现原理和关键配置。

## macOS 窗口按钮的特点

在 macOS 上，窗口控制按钮（关闭、最小化、最大化）是三个彩色圆点：

- 🔴 红色：关闭窗口
- 🟡 黄色：最小化窗口
- 🟢 绿色：最大化/全屏窗口

这些按钮由系统提供，位置固定在窗口左上角。

## Tauri 配置

### 关键配置项

在 `src-tauri/tauri.conf.json` 中：

```json
{
  "app": {
    "windows": [
      {
        "title": "LightSync",
        "decorations": false, // 禁用默认窗口装饰
        "titleBarStyle": "Overlay", // ⭐ 关键：使用 Overlay 模式
        "transparent": false,
        "hiddenTitle": false
      }
    ],
    "macOSPrivateApi": true // 启用 macOS 私有 API
  }
}
```

### 配置说明

#### `decorations: false`

- 禁用系统默认的窗口装饰（标题栏、边框等）
- 允许我们自定义窗口外观

#### `titleBarStyle: "Overlay"` ⭐ 最重要

- 在 macOS 上启用 Overlay 模式
- 系统窗口按钮会**覆盖**在应用内容上方
- 按钮位置：左上角，距离左边约 20px，距离顶部约 13px
- 应用内容可以延伸到窗口顶部

#### `macOSPrivateApi: true`

- 启用 macOS 私有 API
- 提供更好的系统集成

## 布局设计

### 左侧栏顶部拖拽区域

```tsx
<Card className="float-left h-screen w-[230px] ...">
  {/* 顶部拖拽区域 - 35px 高度 */}
  <div className="h-[35px] p-[5px]">
    <div className="h-full w-full" data-tauri-drag-region="true" />
  </div>

  {/* Logo 区域 */}
  <div className="p-[5px]">
    <div data-tauri-drag-region="true">
      <div className="mx-auto mb-[30px] h-[60px] w-[60px] ...">L</div>
    </div>
  </div>

  {/* 侧边栏菜单 */}
  <Sidebar />
</Card>
```

**关键点：**

- 顶部 35px 的拖拽区域为 macOS 窗口按钮留出空间
- macOS 窗口按钮会自动显示在这个区域的左上角
- Logo 区域也是拖拽区域，不会与窗口按钮冲突

### 右侧内容区

```tsx
<div className="ml-[230px] h-screen ...">
  {/* 顶部拖拽区域 */}
  <div data-tauri-drag-region="true" className="fixed top-[5px] right-[5px] left-[235px] h-[30px]" />

  {/* 标题栏 */}
  <div className="flex h-[35px] justify-between">
    <h2>{pageTitle}</h2>

    {/* macOS 不显示自定义窗口控制按钮 */}
    {osType !== 'Darwin' && <WindowControl />}
  </div>

  {/* 内容区域 */}
  <Outlet />
</div>
```

**关键点：**

- macOS 不显示自定义的 `WindowControl` 组件
- 使用系统原生的窗口按钮
- 拖拽区域从 `left-[235px]` 开始，避开左侧栏

## 视觉效果

### macOS 布局

```
┌──────────┬──────────────────────────────┐
│ 🔴🟡🟢   │                              │  ← macOS 窗口按钮覆盖在这里
├──────────┼──────────────────────────────┤
│          │ 页面标题 + 工具栏             │
│  Logo    ├──────────────────────────────┤
│          │                              │
│  侧边栏  │  主内容区                     │
│  菜单    │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

### Windows/Linux 布局

```
┌──────────┬──────────────────────────────┐
│          │                              │
├──────────┼──────────────────────────────┤
│          │ 页面标题 + 工具栏 + [- □ ×]  │  ← 自定义窗口按钮
│  Logo    ├──────────────────────────────┤
│          │                              │
│  侧边栏  │  主内容区                     │
│  菜单    │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

## 拖拽区域设计

### 为什么需要多个拖拽区域？

1. **左侧栏顶部**：为 macOS 窗口按钮留出空间，同时支持拖拽
2. **Logo 区域**：用户可以拖拽 Logo 来移动窗口
3. **右侧固定区域**：覆盖在标题栏上方，避免遮挡按钮

### 拖拽区域代码

```tsx
{
  /* 左侧栏顶部拖拽区域 */
}
;<div className="h-[35px] p-[5px]">
  <div className="h-full w-full" data-tauri-drag-region="true" />
</div>

{
  /* Logo 区域也是拖拽区域 */
}
;<div data-tauri-drag-region="true">
  <div className="mx-auto mb-[30px] ...">L</div>
</div>

{
  /* 右侧固定拖拽区域 */
}
;<div data-tauri-drag-region="true" className="fixed top-[5px] right-[5px] left-[235px] h-[30px]" />
```

## 与 pot-desktop 的对比

| 特性           | pot-desktop | LightSync | 说明    |
| -------------- | ----------- | --------- | ------- |
| titleBarStyle  | Overlay     | Overlay   | ✅ 一致 |
| decorations    | false       | false     | ✅ 一致 |
| 左侧栏顶部高度 | 35px        | 35px      | ✅ 一致 |
| macOS 窗口按钮 | 系统原生    | 系统原生  | ✅ 一致 |
| 拖拽区域设计   | 分散式      | 分散式    | ✅ 一致 |
| 自定义按钮显示 | 非 macOS    | 非 macOS  | ✅ 一致 |

## 工作原理

### 1. Tauri 配置层

```
titleBarStyle: "Overlay"
         ↓
macOS 系统识别此配置
         ↓
在窗口左上角显示原生按钮
         ↓
按钮覆盖在应用内容上方
```

### 2. 应用布局层

```
左侧栏顶部 35px 拖拽区域
         ↓
为 macOS 窗口按钮留出空间
         ↓
按钮不会遮挡重要内容
         ↓
用户可以正常点击按钮
```

### 3. 条件渲染层

```tsx
{osType !== 'Darwin' && <WindowControl />}
         ↓
macOS: 不显示自定义按钮
         ↓
Windows/Linux: 显示自定义按钮
```

## 测试建议

### macOS 测试

1. **窗口按钮功能**
   - 🔴 点击红色按钮，窗口应该关闭
   - 🟡 点击黄色按钮，窗口应该最小化
   - 🟢 点击绿色按钮，窗口应该最大化/全屏

2. **拖拽功能**
   - 在左侧栏顶部拖拽，窗口应该移动
   - 在 Logo 区域拖拽，窗口应该移动
   - 在右侧标题栏拖拽，窗口应该移动

3. **视觉检查**
   - 窗口按钮应该清晰可见
   - 按钮不应该遮挡重要内容
   - 按钮位置应该符合 macOS 规范

### Windows/Linux 测试

1. **自定义按钮功能**
   - 最小化按钮应该正常工作
   - 最大化/还原按钮应该正常工作
   - 关闭按钮应该正常工作

2. **悬停效果**
   - 按钮悬停应该有视觉反馈
   - 关闭按钮悬停应该变红色

3. **Linux 特殊样式**
   - 右上角应该有圆角
   - 关闭按钮应该有圆角

## 常见问题

### Q: macOS 窗口按钮不显示？

**A:** 检查以下配置：

1. `titleBarStyle: "Overlay"` 是否正确设置
2. `decorations: false` 是否正确设置
3. `macOSPrivateApi: true` 是否启用

### Q: 窗口按钮遮挡了内容？

**A:** 确保左侧栏顶部有足够的空间（至少 35px）：

```tsx
<div className="h-[35px] p-[5px]">
  <div data-tauri-drag-region="true" />
</div>
```

### Q: 无法拖拽窗口？

**A:** 检查拖拽区域是否正确设置：

```tsx
<div data-tauri-drag-region="true">{/* 可拖拽内容 */}</div>
```

### Q: Windows/Linux 显示了 macOS 按钮？

**A:** 检查条件渲染逻辑：

```tsx
{
  osType !== 'Darwin' && <WindowControl />
}
```

## 参考资料

- [Tauri Window Configuration](https://tauri.app/v1/api/config/#windowconfig)
- [Tauri Window API](https://tauri.app/v1/api/js/window)
- [macOS Human Interface Guidelines - Window Management](https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/window-anatomy/)
- [pot-desktop 源码](https://github.com/pot-app/pot-desktop)

## 总结

LightSync 已经正确配置了对 macOS 原生窗口按钮的支持：

1. ✅ 使用 `titleBarStyle: "Overlay"` 配置
2. ✅ 左侧栏顶部预留 35px 空间
3. ✅ macOS 不显示自定义窗口控制按钮
4. ✅ 拖拽区域设计合理，不影响按钮点击
5. ✅ 与 pot-desktop 的实现方式完全一致

无需额外的代码或样式调整，macOS 系统会自动在正确的位置显示窗口按钮。
