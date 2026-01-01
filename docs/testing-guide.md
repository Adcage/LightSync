# LightSync 测试指南

本文档介绍如何在 LightSync 项目中运行和编写测试。

## 📋 目录

- [快速开始](#快速开始)
- [测试命令](#测试命令)
- [测试结构](#测试结构)
- [编写测试](#编写测试)
- [调试测试](#调试测试)
- [最佳实践](#最佳实践)

## 🚀 快速开始

### 1. 运行所有测试

```bash
cd LightSync
pnpm test
```

**输出示例**：

```
✓ tests/utils/webdav.test.ts (33 tests) 20ms
  ✓ WebDAV 工具函数测试 (33)
    ✓ isValidUrl - URL 格式验证 (5)
    ✓ isValidTimeout - 超时时间验证 (4)
    ...

Test Files  1 passed (1)
     Tests  33 passed (33)
  Duration  841ms
```

### 2. 监听模式（推荐开发时使用）

```bash
pnpm test:watch
```

这会启动监听模式，当你修改代码或测试文件时，相关测试会自动重新运行。

### 3. 可视化界面（最直观）

```bash
pnpm test:ui
```

这会在浏览器中打开一个可视化界面，你可以：

- 查看所有测试的状态
- 点击运行单个测试
- 查看测试覆盖率
- 查看测试执行时间

## 📝 测试命令

### 基础命令

| 命令                 | 说明                   | 使用场景          |
| -------------------- | ---------------------- | ----------------- |
| `pnpm test`          | 运行所有测试（一次性） | CI/CD、提交前检查 |
| `pnpm test:watch`    | 监听模式               | 开发时实时测试    |
| `pnpm test:ui`       | 可视化界面             | 调试、查看详情    |
| `pnpm test:coverage` | 生成覆盖率报告         | 检查测试覆盖率    |

### 高级用法

```bash
# 只运行特定文件的测试
pnpm test tests/utils/webdav.test.ts

# 只运行匹配特定名称的测试
pnpm test -t "URL 格式验证"

# 运行测试并显示详细输出
pnpm test --reporter=verbose

# 运行测试并在第一个失败时停止
pnpm test --bail

# 更新快照（如果使用快照测试）
pnpm test -u
```

## 🏗️ 测试结构

### 文件组织

```
LightSync/
├── src/                    # 源代码
│   └── utils/
│       └── webdav.ts       # 被测试的代码
├── tests/                  # 测试文件
│   ├── utils/
│   │   └── webdav.test.ts  # 对应的测试
│   └── README.md
└── vitest.config.ts        # 测试配置
```

### 测试文件结构

```typescript
// tests/utils/webdav.test.ts
import { describe, it, expect } from 'vitest'
import { functionToTest } from '../../src/utils/webdav'

describe('模块名称', () => {
  describe('功能分组', () => {
    it('应该做某事', () => {
      // 1. 准备（Arrange）
      const input = 'test-input'

      // 2. 执行（Act）
      const result = functionToTest(input)

      // 3. 断言（Assert）
      expect(result).toBe('expected-output')
    })
  })
})
```

## ✍️ 编写测试

### 基本测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { isValidUrl } from '../../src/utils/webdav'

describe('URL 验证', () => {
  it('应该接受有效的 HTTPS URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('应该拒绝无效的 URL', () => {
    expect(isValidUrl('not-a-url')).toBe(false)
  })
})
```

### 常用断言

```typescript
// 相等性
expect(value).toBe(expected) // 严格相等 (===)
expect(value).toEqual(expected) // 深度相等（对象、数组）
expect(value).not.toBe(expected) // 不相等

// 真值
expect(value).toBeTruthy() // 真值
expect(value).toBeFalsy() // 假值
expect(value).toBeNull() // null
expect(value).toBeUndefined() // undefined
expect(value).toBeDefined() // 已定义

// 数字
expect(value).toBeGreaterThan(3) // > 3
expect(value).toBeGreaterThanOrEqual(3) // >= 3
expect(value).toBeLessThan(5) // < 5
expect(value).toBeCloseTo(0.3) // 浮点数近似

// 字符串
expect(string).toMatch(/pattern/) // 正则匹配
expect(string).toContain('substring') // 包含子串

// 数组
expect(array).toContain(item) // 包含元素
expect(array).toHaveLength(3) // 长度为 3

// 对象
expect(object).toHaveProperty('key') // 有属性
expect(object).toMatchObject({
  // 部分匹配
  key: 'value',
})

// 异常
expect(() => fn()).toThrow() // 抛出异常
expect(() => fn()).toThrow('error') // 抛出特定异常
```

### 异步测试

```typescript
import { describe, it, expect } from 'vitest'
import { fetchData } from '../../src/utils/api'

describe('异步操作', () => {
  it('应该获取数据', async () => {
    const data = await fetchData()
    expect(data).toBeDefined()
  })

  it('应该处理错误', async () => {
    await expect(fetchData('invalid')).rejects.toThrow()
  })
})
```

### Mock 测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'

// Mock Tauri 命令
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('API 调用', () => {
  it('应该调用 Tauri 命令', async () => {
    const mockInvoke = vi.mocked(invoke)
    mockInvoke.mockResolvedValue({ success: true })

    const result = await someFunction()

    expect(mockInvoke).toHaveBeenCalledWith('command_name', {
      param: 'value',
    })
    expect(result.success).toBe(true)
  })
})
```

## 🐛 调试测试

### 1. 使用 console.log

```typescript
it('调试测试', () => {
  const result = functionToTest()
  console.log('Result:', result) // 会在测试输出中显示
  expect(result).toBe(expected)
})
```

### 2. 使用 test.only

```typescript
// 只运行这一个测试
it.only('这个测试会运行', () => {
  expect(true).toBe(true)
})

it('这个测试会被跳过', () => {
  expect(true).toBe(true)
})
```

### 3. 跳过测试

```typescript
// 跳过这个测试
it.skip('暂时跳过', () => {
  expect(true).toBe(true)
})

// 或者使用 todo
it.todo('待实现的测试')
```

### 4. 使用 VS Code 调试

1. 在测试文件中设置断点
2. 按 F5 或点击"运行和调试"
3. 选择"JavaScript Debug Terminal"
4. 运行 `pnpm test`

### 5. 使用 Vitest UI

```bash
pnpm test:ui
```

在浏览器中可以：

- 查看每个测试的详细信息
- 查看失败的断言
- 查看控制台输出
- 重新运行单个测试

## 📊 查看测试覆盖率

```bash
pnpm test:coverage
```

这会生成一个覆盖率报告，显示：

- 哪些代码被测试覆盖了
- 哪些代码没有被测试
- 覆盖率百分比

报告会保存在 `coverage/` 文件夹中，可以在浏览器中打开 `coverage/index.html` 查看详细报告。

## ✅ 最佳实践

### 1. 测试命名

```typescript
// ✅ 好的命名 - 清晰描述测试内容
it('应该在 URL 无效时返回 false', () => {})

// ❌ 不好的命名 - 不清楚测试什么
it('测试 URL', () => {})
```

### 2. 测试独立性

```typescript
// ✅ 每个测试独立
describe('计数器', () => {
  it('应该从 0 开始', () => {
    const counter = new Counter()
    expect(counter.value).toBe(0)
  })

  it('应该能够增加', () => {
    const counter = new Counter() // 新实例
    counter.increment()
    expect(counter.value).toBe(1)
  })
})

// ❌ 测试相互依赖
let counter // 共享状态
it('初始化', () => {
  counter = new Counter()
})
it('增加', () => {
  counter.increment() // 依赖上一个测试
})
```

### 3. 测试覆盖

每个功能应该测试：

- ✅ **正常情况** - 功能按预期工作
- ✅ **边界情况** - 最小值、最大值、空值
- ✅ **错误情况** - 无效输入、异常情况
- ✅ **特殊情况** - null、undefined、空字符串

### 4. 保持测试简单

```typescript
// ✅ 简单明了
it('应该验证 URL', () => {
  expect(isValidUrl('https://example.com')).toBe(true)
})

// ❌ 过于复杂
it('应该验证各种情况', () => {
  const urls = ['url1', 'url2', 'url3']
  const results = urls.map(url => isValidUrl(url))
  const allValid = results.every(r => r === true)
  expect(allValid).toBe(true)
})
```

### 5. 使用描述性的分组

```typescript
describe('WebDAV 工具函数', () => {
  describe('URL 验证', () => {
    describe('有效的 URL', () => {
      it('应该接受 HTTPS URL', () => {})
      it('应该接受 HTTP URL', () => {})
    })

    describe('无效的 URL', () => {
      it('应该拒绝空字符串', () => {})
      it('应该拒绝无协议的 URL', () => {})
    })
  })
})
```

## 🔗 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [测试最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [项目测试文件夹](../tests/)
- [测试配置文件](../vitest.config.ts)

## 💡 常见问题

### Q: 测试运行很慢怎么办？

A: 使用 `test:watch` 监听模式，只运行改变的测试。

### Q: 如何只运行一个测试文件？

A: `pnpm test tests/utils/webdav.test.ts`

### Q: 如何调试失败的测试？

A: 使用 `pnpm test:ui` 打开可视化界面，或使用 `it.only` 只运行特定测试。

### Q: 测试覆盖率多少合适？

A: 工具函数建议 80% 以上，UI 组件建议 60% 以上。重点是覆盖关键逻辑。

### Q: 需要测试所有边界情况吗？

A: 是的！边界情况往往是 bug 的来源，应该重点测试。

---

**提示**: 在提交代码前，请确保运行 `pnpm test` 并且所有测试都通过！✅
