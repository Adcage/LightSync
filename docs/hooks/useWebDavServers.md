# useWebDavServers Hook 使用指南

## 概述

`useWebDavServers` 是一个 React Hook，用于管理 WebDAV 服务器配置。它提供了完整的 CRUD 操作接口，并自动处理状态管理、错误处理和数据同步。

## 特性

- ✅ 自动加载服务器列表
- ✅ 完整的 CRUD 操作（添加、更新、删除）
- ✅ 连接测试功能
- ✅ 自动状态同步（Property 5: 配置列表同步性）
- ✅ 错误处理和恢复
- ✅ 加载状态管理
- ✅ TypeScript 类型安全

## 基本用法

```typescript
import { useWebDavServers } from '@/hooks/useWebDavServers'

function ServersPage() {
  const {
    servers,        // 服务器列表
    addServer,      // 添加服务器
    updateServer,   // 更新服务器
    removeServer,   // 删除服务器
    testConnection, // 测试连接
    refresh,        // 刷新列表
    loading,        // 加载状态
    error,          // 错误信息
  } = useWebDavServers()

  // 显示加载状态
  if (loading) {
    return <div>Loading...</div>
  }

  // 显示错误信息
  if (error) {
    return <div>Error: {error.message}</div>
  }

  // 显示服务器列表
  return (
    <div>
      {servers.map(server => (
        <div key={server.id}>{server.name}</div>
      ))}
    </div>
  )
}
```

## API 参考

### 参数

```typescript
useWebDavServers(enabledOnly?: boolean)
```

- `enabledOnly` (可选): 是否只加载启用的服务器，默认 `false`（加载所有服务器）

### 返回值

#### `servers: WebDavServerConfig[]`

服务器配置列表。

```typescript
interface WebDavServerConfig {
  id: string // 服务器 ID (UUID)
  name: string // 服务器名称
  url: string // 服务器 URL
  username: string // 用户名
  useHttps: boolean // 是否使用 HTTPS
  timeout: number // 连接超时时间（秒）
  lastTestAt?: number // 最后测试时间（Unix 时间戳）
  lastTestStatus: string // 最后测试状态
  lastTestError?: string // 最后测试错误信息
  serverType: string // 服务器类型
  enabled: boolean // 是否启用
  createdAt: number // 创建时间
  updatedAt: number // 更新时间
}
```

#### `addServer(serverData: AddServerInput): Promise<WebDavServerConfig>`

添加新的服务器配置。

```typescript
interface AddServerInput {
  name: string // 服务器名称
  url: string // 服务器 URL
  username: string // 用户名
  password: string // 密码
  useHttps: boolean // 是否使用 HTTPS
  timeout: number // 连接超时时间（秒）
  enabled?: boolean // 是否启用（可选，默认 true）
}
```

**示例：**

```typescript
const newServer = await addServer({
  name: 'My Cloud',
  url: 'https://cloud.example.com/webdav',
  username: 'myuser',
  password: 'mypassword',
  useHttps: true,
  timeout: 30,
})
console.log('Server added:', newServer.id)
```

#### `updateServer(id: string, updates: UpdateServerInput): Promise<WebDavServerConfig>`

更新现有服务器配置。

```typescript
interface UpdateServerInput {
  name?: string // 服务器名称
  url?: string // 服务器 URL
  username?: string // 用户名
  password?: string // 密码（undefined 表示不更新）
  useHttps?: boolean // 是否使用 HTTPS
  timeout?: number // 连接超时时间（秒）
  enabled?: boolean // 是否启用
}
```

**示例：**

```typescript
// 只更新名称
await updateServer('server-id', {
  name: 'New Name',
})

// 更新多个字段
await updateServer('server-id', {
  name: 'New Name',
  timeout: 60,
  enabled: false,
})

// 更新密码
await updateServer('server-id', {
  password: 'new-password',
})
```

#### `removeServer(id: string): Promise<void>`

删除服务器配置。

**注意：** 如果服务器正在被同步文件夹使用，删除操作会失败。

**示例：**

```typescript
try {
  await removeServer('server-id')
  console.log('Server deleted')
} catch (error) {
  if (error.message.includes('being used')) {
    console.error('Cannot delete: server is in use')
  }
}
```

#### `testConnection(serverId: string): Promise<ConnectionTestResult>`

测试服务器连接。

```typescript
interface ConnectionTestResult {
  success: boolean // 测试是否成功
  message: string // 测试消息
  serverInfo?: ServerInfo // 服务器信息（仅在成功时返回）
}

interface ServerInfo {
  serverType: string // 服务器类型
  availableSpace?: number // 可用空间（字节）
}
```

**示例：**

```typescript
const result = await testConnection('server-id')
if (result.success) {
  console.log('Connection successful')
  console.log('Server type:', result.serverInfo?.serverType)
} else {
  console.error('Connection failed:', result.message)
}
```

#### `refresh(): Promise<void>`

刷新服务器列表。

**示例：**

```typescript
await refresh()
console.log('Server list refreshed')
```

#### `loading: boolean`

加载状态。初始加载时为 `true`，加载完成后为 `false`。

#### `error: Error | null`

错误信息。如果操作失败，包含错误对象；否则为 `null`。

## 高级用法

### 只加载启用的服务器

```typescript
const { servers } = useWebDavServers(true)
// servers 只包含 enabled=true 的服务器
```

### 错误处理

```typescript
const { addServer, error } = useWebDavServers()

const handleAdd = async () => {
  try {
    await addServer({
      name: 'My Server',
      url: 'https://example.com/webdav',
      username: 'user',
      password: 'pass',
      useHttps: true,
      timeout: 30,
    })
    toast.success('Server added successfully')
  } catch (err) {
    toast.error(`Failed to add server: ${err.message}`)
  }
}

// 或者使用 error 状态
useEffect(() => {
  if (error) {
    toast.error(error.message)
  }
}, [error])
```

### 连接测试与状态更新

```typescript
const { testConnection, servers } = useWebDavServers()

const handleTest = async (serverId: string) => {
  const result = await testConnection(serverId)

  if (result.success) {
    // 测试成功后，servers 列表会自动更新
    // 包含最新的 lastTestAt 和 lastTestStatus
    const server = servers.find(s => s.id === serverId)
    console.log('Last test:', server?.lastTestAt)
  }
}
```

### 批量操作

```typescript
const { addServer } = useWebDavServers()

const handleBatchAdd = async (serverList: AddServerInput[]) => {
  const results = await Promise.allSettled(serverList.map(server => addServer(server)))

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`Added ${succeeded} servers, ${failed} failed`)
}
```

## 注意事项

1. **密码安全**: 密码通过系统 Keyring 安全存储，不会出现在配置文件中
2. **删除保护**: 正在被同步文件夹使用的服务器无法删除
3. **状态同步**: 所有操作（添加、更新、删除）会立即更新本地状态，无需手动刷新
4. **错误恢复**: 操作失败时，错误信息会保存在 `error` 状态中，可以显示给用户
5. **连接测试**: 测试连接后会自动刷新服务器列表，以获取更新的测试状态

## 相关文档

- [WebDAV 工具函数](../utils/webdav.md)
- [服务器配置表单组件](../components/ServerConfigForm.md)
- [服务器列表组件](../components/ServerListItem.md)

## 测试

Hook 包含完整的单元测试，覆盖以下场景：

- ✅ API 函数调用
- ✅ CRUD 操作
- ✅ 错误处理
- ✅ 连接测试
- ✅ 状态管理
- ✅ 数据一致性

运行测试：

```bash
pnpm test tests/hooks/useWebDavServers.test.ts
```
