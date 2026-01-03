# WebDAV API 文档

本文档描述了 LightSync WebDAV 功能的完整 API，包括 Rust 后端的 Tauri 命令和 TypeScript 前端的工具函数。

## 目录

- [Tauri 命令 API](#tauri-命令-api)
  - [服务器配置 CRUD](#服务器配置-crud)
  - [连接测试](#连接测试)
- [前端工具函数 API](#前端工具函数-api)
  - [核心函数](#核心函数)
  - [辅助函数](#辅助函数)
- [数据类型](#数据类型)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

---

## Tauri 命令 API

### 服务器配置 CRUD

#### `add_webdav_server`

添加新的 WebDAV 服务器配置。

**命令名称**: `add_webdav_server`

**参数**:

- `input: AddServerInput` - 服务器配置信息（不包含自动生成的字段）
- `password: String` - 服务器密码（将安全存储到系统 Keyring）

**返回值**: `Result<WebDavServerConfig>`

- 成功：返回包含生成 UUID 的完整服务器配置
- 失败：返回错误信息

**示例**:

```typescript
const server = await invoke('add_webdav_server', {
  input: {
    name: 'My Server',
    url: 'https://example.com/webdav',
    username: 'user',
    useHttps: true,
    timeout: 30,
    enabled: true,
    lastTestStatus: 'unknown',
    serverType: 'generic',
  },
  password: 'my-password',
})
```

---

#### `get_webdav_servers`

获取 WebDAV 服务器列表。

**命令名称**: `get_webdav_servers`

**参数**:

- `enabled_only: bool` - `true` 表示只返回启用的服务器，`false` 返回所有服务器

**返回值**: `Result<Vec<WebDavServerConfig>>`

- 成功：返回服务器配置列表
- 失败：返回错误信息

**示例**:

```typescript
// 获取所有服务器
const allServers = await invoke('get_webdav_servers', { enabledOnly: false })

// 只获取启用的服务器
const enabledServers = await invoke('get_webdav_servers', { enabledOnly: true })
```

---

#### `get_webdav_server`

获取单个 WebDAV 服务器配置。

**命令名称**: `get_webdav_server`

**参数**:

- `server_id: String` - 服务器 ID (UUID)

**返回值**: `Result<WebDavServerConfig>`

- 成功：返回服务器配置
- 失败：返回错误信息（如服务器不存在）

**示例**:

```typescript
const server = await invoke('get_webdav_server', {
  serverId: 'uuid-123',
})
```

---

#### `update_webdav_server`

更新 WebDAV 服务器配置。

**命令名称**: `update_webdav_server`

**参数**:

- `server_id: String` - 服务器 ID
- `config: WebDavServerConfig` - 更新后的完整服务器配置
- `password: Option<String>` - 可选的新密码（`None` 表示不更新密码）

**返回值**: `Result<WebDavServerConfig>`

- 成功：返回更新后的服务器配置
- 失败：返回错误信息

**示例**:

```typescript
// 更新配置但不更新密码
const updated = await invoke('update_webdav_server', {
  serverId: 'uuid-123',
  config: updatedConfig,
  password: undefined,
})

// 同时更新配置和密码
const updated = await invoke('update_webdav_server', {
  serverId: 'uuid-123',
  config: updatedConfig,
  password: 'new-password',
})
```

---

#### `delete_webdav_server`

删除 WebDAV 服务器配置。

**命令名称**: `delete_webdav_server`

**参数**:

- `server_id: String` - 服务器 ID

**返回值**: `Result<()>`

- 成功：返回空
- 失败：返回错误信息（如服务器正在被同步文件夹使用）

**删除保护**: 如果服务器正在被任何同步文件夹使用，删除操作将被拒绝并返回错误。

**示例**:

```typescript
try {
  await invoke('delete_webdav_server', { serverId: 'uuid-123' })
  console.log('Server deleted successfully')
} catch (error) {
  if (error.includes('being used')) {
    console.error('Cannot delete: server is in use')
  }
}
```

---

### 连接测试

#### `test_webdav_connection`

测试 WebDAV 服务器连接。

**命令名称**: `test_webdav_connection`

**参数**:

- `server_id: String` - 服务器 ID

**返回值**: `Result<ConnectionTestResult>`

- 成功：返回连接测试结果（包含成功/失败状态）
- 失败：返回错误信息（仅在测试过程本身出错时）

**行为**:

1. 从数据库读取服务器配置
2. 从系统 Keyring 读取密码
3. 创建 WebDAV 客户端并尝试连接
4. 更新数据库中的测试状态（`last_test_at`, `last_test_status`, `last_test_error`, `server_type`）
5. 返回测试结果

**注意**: 连接失败不会抛出错误，而是返回 `success: false` 的结果。

**示例**:

```typescript
const result = await invoke('test_webdav_connection', {
  serverId: 'uuid-123',
})

if (result.success) {
  console.log('Connected to', result.serverInfo.serverType)
} else {
  console.error('Connection failed:', result.message)
}
```

---

## 前端工具函数 API

前端工具函数位于 `src/utils/webdav.ts`，提供了对 Tauri 命令的类型安全封装。

### 核心函数

#### `addWebDavServer`

添加 WebDAV 服务器配置（前端封装）。

**签名**:

```typescript
async function addWebDavServer(serverData: AddServerInput): Promise<WebDavServerConfig>
```

**参数**:

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

**返回值**: `Promise<WebDavServerConfig>` - 包含生成 ID 的完整服务器配置

**示例**:

```typescript
import { addWebDavServer } from '@/utils/webdav'

const server = await addWebDavServer({
  name: 'My Server',
  url: 'https://example.com/webdav',
  username: 'user',
  password: 'pass',
  useHttps: true,
  timeout: 30,
})
console.log('Server ID:', server.id)
```

---

#### `getWebDavServers`

获取 WebDAV 服务器列表（前端封装）。

**签名**:

```typescript
async function getWebDavServers(enabledOnly?: boolean): Promise<WebDavServerConfig[]>
```

**参数**:

- `enabledOnly?: boolean` - 可选，默认 `false`。`true` 表示只返回启用的服务器

**返回值**: `Promise<WebDavServerConfig[]>` - 服务器配置列表

**示例**:

```typescript
import { getWebDavServers } from '@/utils/webdav'

// 获取所有服务器
const allServers = await getWebDavServers()

// 只获取启用的服务器
const enabledServers = await getWebDavServers(true)
```

---

#### `getWebDavServer`

获取单个 WebDAV 服务器配置（前端封装）。

**签名**:

```typescript
async function getWebDavServer(serverId: string): Promise<WebDavServerConfig>
```

**参数**:

- `serverId: string` - 服务器 ID

**返回值**: `Promise<WebDavServerConfig>` - 服务器配置

**示例**:

```typescript
import { getWebDavServer } from '@/utils/webdav'

const server = await getWebDavServer('uuid-123')
console.log('Server name:', server.name)
```

---

#### `updateWebDavServer`

更新 WebDAV 服务器配置（前端封装）。

**签名**:

```typescript
async function updateWebDavServer(serverId: string, updates: UpdateServerInput): Promise<WebDavServerConfig>
```

**参数**:

```typescript
interface UpdateServerInput {
  name?: string // 服务器名称
  url?: string // 服务器 URL
  username?: string // 用户名
  password?: string // 密码（undefined 表示不更新密码）
  useHttps?: boolean // 是否使用 HTTPS
  timeout?: number // 连接超时时间（秒）
  enabled?: boolean // 是否启用
}
```

**返回值**: `Promise<WebDavServerConfig>` - 更新后的服务器配置

**特性**: 只需提供需要更新的字段，未提供的字段保持不变。

**示例**:

```typescript
import { updateWebDavServer } from '@/utils/webdav'

// 只更新名称
await updateWebDavServer('uuid-123', {
  name: 'New Name',
})

// 更新密码
await updateWebDavServer('uuid-123', {
  password: 'new-password',
})

// 更新多个字段
await updateWebDavServer('uuid-123', {
  name: 'New Name',
  timeout: 60,
  enabled: false,
})
```

---

#### `deleteWebDavServer`

删除 WebDAV 服务器配置（前端封装）。

**签名**:

```typescript
async function deleteWebDavServer(serverId: string): Promise<void>
```

**参数**:

- `serverId: string` - 服务器 ID

**返回值**: `Promise<void>`

**示例**:

```typescript
import { deleteWebDavServer } from '@/utils/webdav'

try {
  await deleteWebDavServer('uuid-123')
  console.log('Server deleted successfully')
} catch (error) {
  if (error.message.includes('being used')) {
    console.error('Cannot delete: server is in use')
  }
}
```

---

#### `testWebDavConnection`

测试 WebDAV 服务器连接（前端封装）。

**签名**:

```typescript
async function testWebDavConnection(serverId: string): Promise<ConnectionTestResult>
```

**参数**:

- `serverId: string` - 服务器 ID

**返回值**: `Promise<ConnectionTestResult>` - 连接测试结果

**示例**:

```typescript
import { testWebDavConnection } from '@/utils/webdav'

const result = await testWebDavConnection('uuid-123')
if (result.success) {
  console.log('Connection successful:', result.serverInfo?.serverType)
} else {
  console.error('Connection failed:', result.message)
}
```

---

### 辅助函数

#### `isValidUrl`

验证服务器 URL 格式。

**签名**:

```typescript
function isValidUrl(url: string): boolean
```

**参数**:

- `url: string` - 要验证的 URL

**返回值**: `boolean` - URL 有效返回 `true`，否则返回 `false`

**验证规则**: URL 必须包含 `http://` 或 `https://` 协议

**示例**:

```typescript
import { isValidUrl } from '@/utils/webdav'

if (!isValidUrl('https://example.com/webdav')) {
  console.error('Invalid URL format')
}
```

---

#### `isValidTimeout`

验证超时时间范围。

**签名**:

```typescript
function isValidTimeout(timeout: number): boolean
```

**参数**:

- `timeout: number` - 超时时间（秒）

**返回值**: `boolean` - 超时时间在有效范围内返回 `true`，否则返回 `false`

**有效范围**: 1-300 秒

**示例**:

```typescript
import { isValidTimeout } from '@/utils/webdav'

if (!isValidTimeout(30)) {
  console.error('Timeout must be between 1 and 300 seconds')
}
```

---

#### `formatLastTestTime`

格式化最后测试时间。

**签名**:

```typescript
function formatLastTestTime(timestamp?: number): string
```

**参数**:

- `timestamp?: number` - Unix 时间戳（秒）

**返回值**: `string` - 格式化的时间字符串，如果未提供时间戳则返回 "Never"

**示例**:

```typescript
import { formatLastTestTime } from '@/utils/webdav'

const formatted = formatLastTestTime(1234567890)
console.log(formatted) // "2009-02-13 23:31:30"
```

---

#### `getStatusText`

获取连接状态的显示文本。

**签名**:

```typescript
function getStatusText(status: string): string
```

**参数**:

- `status: string` - 连接状态（`success`, `failed`, `unknown`）

**返回值**: `string` - 状态的显示文本

**映射**:

- `success` → "Connected"
- `failed` → "Failed"
- `unknown` → "Not tested"

**示例**:

```typescript
import { getStatusText } from '@/utils/webdav'

const text = getStatusText('success')
console.log(text) // "Connected"
```

---

#### `getStatusColor`

获取连接状态的颜色。

**签名**:

```typescript
function getStatusColor(status: string): 'success' | 'danger' | 'default'
```

**参数**:

- `status: string` - 连接状态（`success`, `failed`, `unknown`）

**返回值**: `'success' | 'danger' | 'default'` - 状态对应的颜色（用于 NextUI 组件）

**映射**:

- `success` → `'success'`
- `failed` → `'danger'`
- `unknown` → `'default'`

**示例**:

```typescript
import { getStatusColor } from '@/utils/webdav'

const color = getStatusColor('success')
console.log(color) // "success"
```

---

## 数据类型

### WebDavServerConfig

完整的 WebDAV 服务器配置。

```typescript
interface WebDavServerConfig {
  id: string // 服务器 ID (UUID)
  name: string // 服务器名称
  url: string // 服务器 URL
  username: string // 用户名
  useHttps: boolean // 是否使用 HTTPS
  timeout: number // 连接超时时间（秒）
  lastTestAt?: number // 最后连接测试时间（Unix 时间戳，秒）
  lastTestStatus: string // 最后连接测试状态（success/failed/unknown）
  lastTestError?: string // 最后连接测试错误信息
  serverType: string // 服务器类型（nextcloud/owncloud/generic）
  enabled: boolean // 是否启用
  createdAt: number // 创建时间（Unix 时间戳，秒）
  updatedAt: number // 更新时间（Unix 时间戳，秒）
}
```

**注意**: 密码不包含在此结构中，密码安全存储在系统 Keyring 中。

---

### ConnectionTestResult

连接测试结果。

```typescript
interface ConnectionTestResult {
  success: boolean // 测试是否成功
  message: string // 测试消息
  serverInfo?: ServerInfo // 服务器信息（仅在成功时返回）
}
```

---

### ServerInfo

服务器信息。

```typescript
interface ServerInfo {
  serverType: string // 服务器类型（nextcloud/owncloud/generic）
  availableSpace?: number // 可用空间（字节，可选）
}
```

---

## 错误处理

### 错误类型

所有 API 调用可能返回以下类型的错误：

1. **ConfigError**: 配置错误
   - 无效的 URL 格式
   - 无效的超时时间
   - 服务器正在被使用（删除时）

2. **DatabaseError**: 数据库错误
   - 数据库连接失败
   - SQL 执行失败
   - 记录不存在

3. **KeyringError**: Keyring 错误
   - Keyring 不可用
   - 密码保存/读取失败

4. **NetworkError**: 网络错误
   - 连接超时
   - 网络不可达
   - DNS 解析失败

5. **AuthError**: 认证错误
   - 用户名或密码错误
   - 认证方式不支持

6. **WebDavError**: WebDAV 协议错误
   - HTTP 4xx 错误（客户端错误）
   - HTTP 5xx 错误（服务器错误）
   - 协议不兼容

### 错误处理最佳实践

```typescript
import { addWebDavServer } from '@/utils/webdav'

try {
  const server = await addWebDavServer(serverData)
  console.log('Server added:', server.id)
} catch (error) {
  // 根据错误消息判断错误类型
  const errorMessage = error.message || String(error)

  if (errorMessage.includes('Invalid URL')) {
    console.error('URL 格式错误')
  } else if (errorMessage.includes('Database')) {
    console.error('数据库错误')
  } else if (errorMessage.includes('Keyring')) {
    console.error('密码存储失败')
  } else {
    console.error('未知错误:', errorMessage)
  }
}
```

---

## 使用示例

### 完整的服务器管理流程

```typescript
import {
  addWebDavServer,
  getWebDavServers,
  updateWebDavServer,
  testWebDavConnection,
  deleteWebDavServer,
} from '@/utils/webdav'

// 1. 添加服务器
const newServer = await addWebDavServer({
  name: 'My Nextcloud',
  url: 'https://cloud.example.com/remote.php/dav',
  username: 'user@example.com',
  password: 'my-secure-password',
  useHttps: true,
  timeout: 30,
})
console.log('Server added with ID:', newServer.id)

// 2. 测试连接
const testResult = await testWebDavConnection(newServer.id)
if (testResult.success) {
  console.log('Connected to', testResult.serverInfo?.serverType)
} else {
  console.error('Connection failed:', testResult.message)
}

// 3. 获取所有服务器
const allServers = await getWebDavServers()
console.log('Total servers:', allServers.length)

// 4. 更新服务器配置
await updateWebDavServer(newServer.id, {
  name: 'My Nextcloud (Updated)',
  timeout: 60,
})

// 5. 删除服务器
try {
  await deleteWebDavServer(newServer.id)
  console.log('Server deleted')
} catch (error) {
  if (error.message.includes('being used')) {
    console.error('Cannot delete: server is in use by sync folders')
  }
}
```

### 使用 React Hook

```typescript
import { useWebDavServers } from '@/hooks/useWebDavServers'

function ServerManager() {
  const {
    webdavServers,
    addServer,
    updateServer,
    removeServer,
    testConnection,
    loading,
    error,
  } = useWebDavServers()

  const handleAddServer = async () => {
    try {
      const server = await addServer(
        {
          name: 'New Server',
          url: 'https://example.com/webdav',
          username: 'user',
          useHttps: true,
          timeout: 30,
        },
        'password'
      )
      console.log('Server added:', server.id)
    } catch (error) {
      console.error('Failed to add server:', error)
    }
  }

  const handleTestConnection = async (serverId: string) => {
    try {
      const result = await testConnection(serverId)
      if (result.success) {
        alert('Connection successful!')
      } else {
        alert(`Connection failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Test failed:', error)
    }
  }

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}

      <button onClick={handleAddServer}>Add Server</button>

      {webdavServers.map(server => (
        <div key={server.id}>
          <h3>{server.name}</h3>
          <p>{server.url}</p>
          <button onClick={() => handleTestConnection(server.id)}>
            Test Connection
          </button>
          <button onClick={() => removeServer(server.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## 安全注意事项

1. **密码存储**: 密码使用系统 Keyring 安全存储，不会出现在配置文件或数据库中
2. **HTTPS 优先**: 建议使用 HTTPS 连接以保护传输中的数据
3. **超时设置**: 合理设置超时时间以防止长时间挂起
4. **删除保护**: 正在使用的服务器无法删除，防止数据丢失

---

## 相关文档

- [WebDAV 客户端实现](../webdav-client.md)
- [Keyring 密码管理](../password-storage.md)
- [数据库架构](../database-schema.md)
- [错误处理指南](../error-handling.md)
