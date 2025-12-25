# 布局重新设计 - pot-desktop 风格

## 设计理念

参考 pot-desktop 的布局设计，采用**左侧完整侧边栏 + 右侧主内容区**的布局方式，而不是传统的**顶部横条 + 下方内容**的布局。

## 布局结构对比

### 之前的布局（传统方式）

```
┌─────────────────────────────────────────┐
│  TitleBar (全宽顶部横条)                 │
├──────────┬──────────────────────────────┤
│          │  工具栏 (语言/主题切换)       │
│  侧边栏  ├──────────────────────────────┤
│          │                              │
│          │  主内容区                     │
│          │                              │
└──────────┴──────────────────────────────┘
```

### 现在的布局（pot-desktop 风格）

```
┌──────────┬──────────────────────────────┐
│ 拖拽区域 │ 拖拽区域                      │
├──────────┼──────────────────────────────┤
│          │ 标题 + 工具栏 + 窗口控制按钮  │
│  Logo    ├──────────────────────────────┤
│          │                              │
│  侧边栏  │  主内容区                     │
│  菜单    │                              │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

## 关键实现细节

### 1. 左侧边栏（完整高度）

```tsx
<Card
  shadow="none"
  className={`border-default-100 bg-content1 float-left h-screen w-[230px] rounded-none border-r-1 ${
    osType === 'Linux' && 'rounded-l-[10px] border-1'
  } cursor-default select-none`}
>
  {/* 顶部拖拽区域 - 35px */}
  <div className="h-[35px] p-[5px]">
    <div className="h-full w-full" data-tauri-drag-region="true" />
  </div>

  {/* Logo 区域 - 70px */}
  <div className="p-[5px]">
    <div data-tauri-drag-region="true">
      <div className="mx-auto mb-[30px] flex h-[60px] w-[60px] items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 text-3xl font-bold text-white shadow-lg">
        L
      </div>
    </div>
  </div>

  {/* 侧边栏菜单 - 剩余空间 */}
  <Sidebar />
</Card>
```

**关键点：**

- `float-left`：左浮动，让右侧内容环绕
- `h-screen`：完整屏幕高度
- `w-[230px]`：固定宽度 230px
- 顶部包含 35px 的拖拽区域
- Logo 区域也是拖拽区域

### 2. 右侧主内容区（完整高度）

```tsx
<div
  className={`bg-background ml-[230px] h-screen cursor-default select-none ${
    osType === 'Linux' && 'border-default-100 rounded-r-[10px] border-1 border-l-0'
  }`}
>
  {/* 顶部拖拽区域（固定定位，覆盖在标题栏上方） */}
  <div data-tauri-drag-region="true" className="fixed top-[5px] right-[5px] left-[235px] h-[30px]" />

  {/* 标题栏 - 35px */}
  <div className="flex h-[35px] justify-between">
    <div className="flex items-center">
      <h2 className="ml-[10px] text-base font-semibold">{getPageTitle()}</h2>
    </div>

    {/* 右侧工具栏和窗口控制按钮 */}
    <div className="flex items-center gap-2">
      <div className="mr-2 flex items-center gap-2">
        <LanguageSwitch />
        <ThemeSwitch />
      </div>
      {osType !== 'Darwin' && <WindowControl />}
    </div>
  </div>

  <Divider />

  {/* 内容区域 */}
  <div className={`overflow-y-auto p-[10px] ${osType === 'Linux' ? 'h-[calc(100vh-38px)]' : 'h-[calc(100vh-36px)]'}`}>
    <Outlet />
  </div>
</div>
```

**关键点：**

- `ml-[230px]`：左边距等于侧边栏宽度，为侧边栏腾出空间
- `h-screen`：完整屏幕高度
- 固定定位的拖拽区域覆盖在标题栏上方
- 标题栏包含页面标题、工具栏和窗口控制按钮
- 内容区域高度计算：`100vh - 标题栏高度 - 分隔线高度`

### 3. 拖拽区域设计

pot-desktop 的巧妙之处在于**分散式拖拽区域**：

1. **左侧栏顶部拖拽区域**：35px 高度，覆盖侧边栏顶部
2. **Logo 区域**：也是拖拽区域，用户可以拖拽 Logo
3. **右侧固定拖拽区域**：固定定位，覆盖在标题栏上方，避免遮挡按钮

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

### 4. 侧边栏菜单组件

简化的侧边栏组件，只包含菜单按钮：

```tsx
const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  function getVariant(pathname: string) {
    return location.pathname === pathname ? 'flat' : 'light'
  }

  return (
    <div className="mx-[12px] overflow-y-auto">
      {menuItems.map(item => (
        <Button
          key={item.key}
          fullWidth
          size="lg"
          variant={getVariant(item.key)}
          className="mb-[5px] justify-start"
          onPress={() => navigate(item.key)}
          startContent={item.icon}
        >
          <div className="w-full text-left">{item.label}</div>
        </Button>
      ))}
    </div>
  )
}
```

**关键点：**

- 使用 NextUI 的 `Button` 组件
- `variant='flat'` 表示选中状态
- `variant='light'` 表示未选中状态
- `fullWidth` 和 `size='lg'` 保持与 pot-desktop 一致
- `justify-start` 让内容左对齐

## 跨平台适配

### macOS

- 不显示窗口控制按钮（使用系统原生按钮）
- 拖拽区域正常工作

```tsx
{
  osType !== 'Darwin' && <WindowControl />
}
```

### Linux

- 左侧栏左上角圆角：`rounded-l-[10px]`
- 右侧内容区右上角圆角：`rounded-r-[10px]`
- 添加边框：`border-1`

```tsx
className={`... ${osType === 'Linux' && 'rounded-l-[10px] border-1'}`}
```

### Windows

- 显示窗口控制按钮
- 无特殊圆角处理

## 高度计算

### 左侧栏

- 总高度：`h-screen`（100vh）
- 顶部拖拽区域：35px
- Logo 区域：约 70px（5px padding + 60px logo + 30px margin-bottom）
- 菜单区域：剩余空间（自动滚动）

### 右侧内容区

- 总高度：`h-screen`（100vh）
- 标题栏：35px
- 分隔线：1-2px
- 内容区域：`calc(100vh - 36px)` (Windows) 或 `calc(100vh - 38px)` (Linux)

## 优势

### 相比传统布局的优势

1. **更好的空间利用**：侧边栏从顶到底，不浪费顶部空间
2. **更清晰的视觉层次**：左右分区明确，不是上下分区
3. **更灵活的拖拽区域**：可以在多个位置拖拽窗口
4. **更符合桌面应用习惯**：类似 VS Code、Figma 等专业工具

### 与 pot-desktop 的一致性

1. ✅ 左侧栏宽度：230px
2. ✅ 标题栏高度：35px
3. ✅ 拖拽区域设计：分散式
4. ✅ 窗口控制按钮位置：右上角
5. ✅ macOS 适配：隐藏窗口按钮
6. ✅ Linux 适配：圆角和边框

## 文件结构

```
src/
├── layouts/
│   └── MainLayout.tsx          # 主布局（包含侧边栏和内容区）
├── components/
│   ├── Sidebar.tsx             # 侧边栏菜单组件
│   ├── WindowControl.tsx       # 窗口控制按钮
│   ├── ThemeSwitch.tsx         # 主题切换
│   └── LanguageSwitch.tsx      # 语言切换
└── utils/
    └── system.ts               # 系统信息工具函数
```

## 使用方法

### 在路由中使用

```tsx
import MainLayout from './layouts/MainLayout'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'servers', element: <ServersPage /> },
      { path: 'folders', element: <FoldersPage /> },
      // ...
    ],
  },
])
```

### 添加新菜单项

在 `Sidebar.tsx` 中添加：

```tsx
const menuItems: MenuItem[] = [
  // ...
  {
    key: '/new-page',
    label: t('nav.newPage', '新页面'),
    icon: <NewIcon className="h-6 w-6" />,
  },
]
```

## 总结

新的布局设计完全参考了 pot-desktop 的实现方式，采用**左侧完整侧边栏 + 右侧主内容区**的布局，而不是传统的顶部横条布局。这种设计：

1. ✅ 更符合现代桌面应用的设计习惯
2. ✅ 更好地利用屏幕空间
3. ✅ 提供更灵活的拖拽体验
4. ✅ 支持跨平台适配（Windows/macOS/Linux）
5. ✅ 与 pot-desktop 保持高度一致

所有代码已经过测试，前端构建成功，可以正常使用。
