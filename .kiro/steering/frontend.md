---
inclusion: fileMatch
fileMatchPattern: 'src/**/*.{tsx,ts,jsx,js,css}'
---

# Frontend Development Rules

你是精通 TypeScript、React、NextUI 的前端专家。编写优化、可维护的代码，遵循最佳实践和 LightSync 规范。

## 核心原则

- **函数式编程**：使用函数组件和 Hooks，避免类组件
- **类型安全**：充分利用 TypeScript 类型推导和检查
- **性能优先**：代码分割、懒加载、优化渲染
- **简洁可测**：最小修改，DRY 原则，完整测试

## 命名规范

**原则**：遵循 React/TypeScript 社区约定，提高代码可读性

```typescript
// 组件: PascalCase（React 标准）
const TitleBar = () => {}
const ThemeSwitch = () => {}

// 函数/变量: camelCase
const getUserConfig = () => {}
const isLoading = true // 布尔值用 is/has/should 前缀
const hasError = false

// 类型/接口: PascalCase
interface AppConfig {}
type SyncFolder = {}

// 常量: SCREAMING_SNAKE_CASE（可选）或 camelCase
const API_BASE_URL = 'https://api.example.com'
const maxRetryCount = 3
```

**文件命名**：

- 组件文件：PascalCase (`TitleBar.tsx`)
- 工具文件：camelCase (`useConfig.ts`, `database.ts`)

## 项目结构

```
src/
├── components/     # 可复用 UI 组件
├── hooks/          # 自定义 Hooks
├── layouts/        # 布局组件
├── pages/          # 页面组件
├── router/         # 路由配置
├── types/          # TypeScript 类型定义
├── utils/          # 工具函数
└── i18n/           # 国际化配置
```

**组件组织**：导入 → 类型 → 组件

```typescript
// 1. 导入（React → 外部库 → 内部模块）
import { useState } from 'react'
import { Button } from '@nextui-org/react'
import type { Props } from './types'

// 2. 类型定义（如果不在单独文件）
interface ComponentProps {
  title: string
  onAction: () => void
}

// 3. 组件
export const MyComponent = ({ title, onAction }: ComponentProps) => {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <h2>{title}</h2>
      <Button onClick={onAction} isLoading={isLoading}>
        Action
      </Button>
    </div>
  )
}
```

## 错误处理

**原则**：

- 优先处理错误和边界情况（提前返回）
- 使用守卫子句避免深层嵌套
- 自定义错误类型提供更多上下文
- 使用错误边界捕获组件错误

```typescript
// ✅ 提前返回和守卫子句
const processData = (data: Data | null) => {
  if (!data) return null  // 提前返回
  if (!data.isValid) throw new Error('Invalid data')  // 守卫子句
  return data.process()
}

// ✅ 自定义错误类型
class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

// ✅ 错误边界（捕获子组件错误）
class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

## 状态管理

**原则**：

- 本地状态用 `useState`
- 副作用用 `useEffect`（最小化使用）
- 复杂逻辑封装为自定义 Hook
- 全局状态考虑 Zustand 或 Context

**自定义 Hook 规范**：

- 必须返回加载状态 `isLoading`
- 必须返回错误状态 `error`
- 使用 `useCallback` 避免函数重新创建

```typescript
// ✅ 完整的状态管理（包含加载和错误状态）
const useConfig = () => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [])

  return { config, isLoading, error }
}

// ✅ 更新操作（使用 useCallback）
const useConfigUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateConfig = useCallback(async (config: AppConfig) => {
    setIsUpdating(true)
    try {
      await invoke('update_config', { config })
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateConfig, isUpdating }
}
```

## 性能优化

**何时优化**：

- 组件频繁重渲染
- 计算开销大
- 列表数据量大
- 路由/组件体积大

**优化手段**：

```typescript
// ✅ useMemo 缓存计算结果（避免重复计算）
import { useMemo, useCallback } from 'react'

const Component = ({ data, onUpdate }) => {
  // 只在 data 变化时重新计算
  const processed = useMemo(() =>
    data.map(item => expensiveOp(item)),
    [data]
  )

  // 避免函数重新创建（依赖项变化时才更新）
  const handleClick = useCallback(() => {
    onUpdate(processed)
  }, [processed, onUpdate])

  return <div onClick={handleClick}>{processed}</div>
}

// ✅ React.memo 避免不必要的重渲染
export const MemoComponent = React.memo(({ value }) => {
  return <div>{value}</div>
})

// ✅ 代码分割（减少初始加载体积）
const LazyPage = lazy(() => import('./pages/Dashboard'))

// 使用时包裹 Suspense
<Suspense fallback={<Loading />}>
  <LazyPage />
</Suspense>
```

**性能检查清单**：

- ❌ 避免在渲染中创建函数/对象（使用 useCallback/useMemo）
- ❌ 避免过度使用 useEffect（考虑派生状态）
- ✅ 列表必须使用稳定的 key（不用 index）
- ✅ 图片使用懒加载和 WebP 格式

## UI 与样式

**原则**：

- 使用 NextUI 组件保持一致性
- 使用 Tailwind 工具类（避免自定义 CSS）
- 支持深色模式（`dark:` 前缀）
- 移动优先响应式设计

```typescript
import { Button, Card } from '@nextui-org/react'

// ✅ NextUI + Tailwind 组合
<Button
  className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-700"
  variant="flat"
>
  Click Me
</Button>

// ✅ 深色模式支持
<Card className="p-4 bg-white dark:bg-zinc-900">
  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
    Title
  </h2>
</Card>

// ✅ 响应式设计（移动优先）
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Item key={item.id} {...item} />)}
</div>
```

## 安全性

**输入验证**：所有用户输入必须验证

```typescript
// ✅ URL 验证
const validateUrl = (url: string) => {
  if (!url.trim()) throw new Error('URL cannot be empty')
  try {
    new URL(url) // 验证格式
  } catch {
    throw new Error('Invalid URL format')
  }
}

// ✅ 防止 XSS（使用 DOMPurify）
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userInput)
```

**安全检查清单**：

- ✅ 验证所有用户输入
- ✅ 使用 DOMPurify 清理 HTML
- ✅ 避免 `dangerouslySetInnerHTML`
- ✅ 使用 HTTPS 调用 API

## 测试

**要求**：

- 每个组件必须有测试
- 测试覆盖：渲染 + 交互 + 边界情况
- 使用 React Testing Library

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { TitleBar } from './TitleBar'

test('renders title', () => {
  render(<TitleBar />)
  expect(screen.getByText('LightSync')).toBeInTheDocument()
})

test('handles click', () => {
  const handleClick = jest.fn()
  render(<Button onClick={handleClick}>Click</Button>)
  fireEvent.click(screen.getByText('Click'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

## 文档注释

**要求**：

- 公开函数必须有 JSDoc
- 复杂逻辑添加注释
- 包含参数、返回值、异常说明

```typescript
/**
 * 获取应用配置
 *
 * @returns 配置对象
 * @throws {ConfigError} 配置加载失败时抛出
 *
 * @example
 * const config = await getConfig()
 */
export const getConfig = async (): Promise<AppConfig> => {
  // 实现
}
```

## 常用模式

### Tauri 集成

**规范**：所有 Tauri 命令调用必须有错误处理

```typescript
import { invoke } from '@tauri-apps/api/core'

// ✅ 带类型和错误处理
const fetchConfig = async () => {
  try {
    return await invoke<AppConfig>('get_config')
  } catch (error) {
    console.error('Config load failed:', error)
    throw new Error('Failed to load configuration')
  }
}
```

### 主题切换

```typescript
import { useTheme } from 'next-themes'

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  )
}
```

### 国际化

```typescript
import { useTranslation } from 'react-i18next'

const LocalizedPage = () => {
  const { t, i18n } = useTranslation()

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button onClick={() => i18n.changeLanguage('en')}>
        English
      </button>
    </div>
  )
}
```

## 开发原则

### 系统化流程

1. 深入分析需求和约束
2. 规划组件结构和状态
3. 逐步实现，遵循最佳实践
4. 审查优化（性能、可访问性）
5. 完善测试和文档

### 最小修改

- 只改必要部分，保持原有风格
- 不重写整个文件
- 优先复用现有组件和逻辑

### 可访问性

- 使用语义化 HTML
- 添加 ARIA 属性
- 支持键盘导航

## LightSync 规范

### 技术栈

- React 19.1.0 + TypeScript 5.8.3
- NextUI 2.4.8 (UI 组件)
- Tailwind CSS 3.4.18 (样式)
- react-i18next 16.2.4 (国际化)
- Tauri 2.0 (桌面集成)

### 命名约定

- 组件: PascalCase (`TitleBar`, `ThemeSwitch`)
- 函数/变量: camelCase (`useConfig`, `getConfig`)
- 类型/接口: PascalCase (`AppConfig`, `SyncFolder`)
- 文件: PascalCase (组件), camelCase (工具)
