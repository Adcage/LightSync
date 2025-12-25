# UI 改进文档 - 从 pot-desktop 移植

## 概述

本文档记录了从 pot-desktop 项目移植到 LightSync 的界面布局样式和操作系统相关的窗口控制功能。

## 主要改进

### 1. 操作系统类型检测

#### 后端实现 (Rust)

在 `src-tauri/src/system.rs` 中添加了新的 Tauri 命令：

```rust
/// 获取操作系统类型（用于 UI 适配）
/// 返回值: "Windows", "Darwin", "Linux" 等
#[tauri::command]
pub fn get_os_type() -> crate::Result<String> {
    let os = match std::env::consts::OS {
        "windows" => "Windows",
        "macos" => "Darwin",
        "linux" => "Linux",
        other => other,
    };

    Ok(os.to_string())
}
```

#### 前端实现 (TypeScript)

在 `src/utils/system.ts` 中添加了对应的前端函数：

```typescript
/**
 * 获取操作系统类型
 * @returns Promise<string> 返回操作系统类型: "Windows", "Darwin", "Linux" 等
 */
export async function getOsType(): Promise<string> {
  try {
    const osType = await invoke<string>('get_os_type')
    return osType
  } catch (error) {
    console.error('获取操作系统类型失败:', error)
    throw error
  }
}
```

### 2. WindowControl 组件优化

参考 pot-desktop 的实现，改进了窗口控制按钮组件：

**主要特性：**

- 使用 `react-icons/vsc` 提供的 VS Code 风格图标
- 监听窗口最大化状态变化，动态切换最大化/还原图标
- 根据操作系统类型调整样式（Linux 系统右上角圆角）
- 简洁的悬停效果和关闭按钮特殊样式

**关键代码：**

```typescript
// 监听窗口最大化状态变化
const unlisten = listen('tauri://resize', async () => {
    if (await appWindow.isMaximized()) {
        setIsMax(true);
    } else {
        setIsMax(false);
    }
});

// Linux 系统特殊样式
className={`w-[35px] h-[35px] rounded-none close-button hover:bg-red-600 hover:text-white ${
    osType === 'Linux' ? 'rounded-tr-[10px]' : ''
}`}
```

### 3. TitleBar 组件优化

参考 pot-desktop 的布局风格，简化了标题栏组件：

**主要改进：**

- 减小标题栏高度（从 48px 到 35px），更加紧凑
- macOS 系统不显示窗口控制按钮（使用系统原生按钮）
- 简化拖拽逻辑，使用 `data-tauri-drag-region` 属性
- 优化图标和文字大小，更加精致

**关键代码：**

```typescript
// macOS 不显示窗口控制按钮
{osType !== 'Darwin' && (
    <div className='flex h-full items-center'>
        <WindowControl />
    </div>
)}
```

### 4. 样式优化

参考 pot-desktop 的 `style.css`，简化了 `titlebar.css`：

**主要改进：**

- 移除了复杂的平台特定样式
- 使用更简洁的关闭按钮悬停效果（`#c42b1c` 红色）
- 保留必要的拖拽区域样式
- 移除了不必要的 CSS 规则

**关键样式：**

```css
/* 关闭按钮特殊样式 - 参考 pot-desktop */
.close-button:hover {
  background-color: #c42b1c !important;
  color: white !important;
}

.close-button:active {
  background-color: #a02318 !important;
}
```

## 与 pot-desktop 的对比

### 相似之处

1. **窗口控制按钮布局**：使用相同的图标和尺寸（35x35px）
2. **操作系统适配**：macOS 隐藏窗口控制按钮，Linux 添加圆角
3. **关闭按钮样式**：使用相同的红色悬停效果
4. **拖拽区域处理**：使用 `data-tauri-drag-region` 属性

### 差异之处

1. **UI 框架**：pot-desktop 使用 NextUI，LightSync 也使用 NextUI（一致）
2. **标题栏布局**：LightSync 保持了更简洁的单行布局
3. **主题系统**：LightSync 使用 next-themes，与 pot-desktop 类似
4. **代码风格**：LightSync 使用 TypeScript，pot-desktop 使用 JavaScript

## 使用示例

### 在组件中获取操作系统类型

```typescript
import { getOsType } from '../utils/system'

const MyComponent = () => {
    const [osType, setOsType] = useState<string>('')

    useEffect(() => {
        const initOsType = async () => {
            try {
                const os = await getOsType()
                setOsType(os)
                console.log('当前操作系统:', os)
            } catch (error) {
                console.error('获取操作系统类型失败:', error)
            }
        }
        initOsType()
    }, [])

    return (
        <div>
            {osType === 'Darwin' && <div>macOS 特定内容</div>}
            {osType === 'Windows' && <div>Windows 特定内容</div>}
            {osType === 'Linux' && <div>Linux 特定内容</div>}
        </div>
    )
}
```

## 测试建议

1. **跨平台测试**：在 Windows、macOS 和 Linux 上测试窗口控制按钮
2. **窗口状态测试**：测试最小化、最大化、还原和关闭功能
3. **主题切换测试**：测试亮色和暗色主题下的按钮样式
4. **拖拽测试**：确保标题栏拖拽功能正常工作

## 未来改进

1. 考虑添加更多操作系统特定的 UI 优化
2. 可以参考 pot-desktop 的侧边栏布局（如果需要）
3. 考虑添加窗口透明度设置（pot-desktop 有此功能）
4. 可以添加更多窗口控制选项（如置顶、全屏等）

## 参考资料

- [pot-desktop GitHub](https://github.com/pot-app/pot-desktop)
- [Tauri Window API](https://tauri.app/v1/api/js/window)
- [NextUI Components](https://nextui.org/)
