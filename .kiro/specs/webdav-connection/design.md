# Design Document

## Overview

本设计文档描述了 LightSync Phase 2: WebDAV 连接与认证功能的技术实现方案。该功能是文件同步系统的核心基础，负责建立与 WebDAV 服务器的安全连接，管理服务器配置，并提供用户友好的配置界面。

### 设计目标

1. **安全性**: 使用系统 Keyring 安全存储密码，支持 HTTPS 连接
2. **可靠性**: 实现完善的错误处理和连接测试机制
3. **易用性**: 提供直观的配置界面和清晰的错误提示
4. **可扩展性**: 设计灵活的架构以支持未来的功能扩展
5. **性能**: 优化网络请求，支持超时控制和连接复用

### 技术栈

- **后端**: Rust + Tauri 2.0
- **HTTP 客户端**: reqwest (已在 Cargo.toml 中配置)
- **密码存储**: keyring crate
- **前端**: React 18 + TypeScript + NextUI 2.6
- **状态管理**: Jotai
- **国际化**: react-i18next

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ServerConfig │  │ ServerList   │  │ Connection   │      │
│  │ Form         │  │ Component    │  │ Test Dialog  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │         useWebDavServers Hook                       │    │
│  │  - 管理服务器配置列表                                │    │
│  │  - 调用 Tauri 命令                                  │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼─────────────────────────────────┘
                          │ Tauri IPC
┌─────────────────────────▼─────────────────────────────────┐
│                    Backend (Rust + Tauri)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Tauri Commands Layer                    │  │
│  │  - test_webdav_connection(server_id)                │  │
│  │  - save_server_password(server_id, password)        │  │
│  │  - get_server_password(server_id)                   │  │
│  │  - delete_server_password(server_id)                │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           配置和密码管理层                           │   │
│  │                                                       │   │
│  │  ┌──────────────┐          ┌──────────────┐        │   │
│  │  │  Tauri Store │  │  SQLite DB   │  │  Keyring     │ │
│  │  │  (config.    │  │  (webdav_    │  │  Manager     │ │
│  │  │   json)      │  │   servers)   │  │              │ │
│  │  │              │  │              │  │              │ │
│  │  │ 存储:        │  │ 存储:        │  │ 存储:        │ │
│  │  │ - enabled    │  │ - id         │  │ - password   │ │
│  │  │   Webdav     │  │ - name       │  │   (加密)     │ │
│  │  │   Servers    │  │ - url        │  │              │ │
│  │  │   (ID数组)   │  │ - username   │  │              │ │
│  │  │              │  │ - timeout    │  │              │ │
│  │  │              │  │ - test_info  │  │              │ │
│  │  │              │  │ - enabled    │  │              │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│  └─────────┼──────────────────┼──────────────────┼─────────┘
│            │                  │                  │
│            └──────────────────┴──────────┬───────┘
│  └─────────┼──────────────────────────┼────────────────┘   │
│            │                          │                     │
│            └──────────┬───────────────┘                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              WebDavClient (临时对象)                 │   │
│  │                                                       │   │
│  │  创建时需要:                                          │   │
│  │  1. WebDavServerConfig (从 Store 读取)              │   │
│  │  2. password (从 Keyring 读取)                      │   │
│  │                                                       │   │
│  │  提供方法:                                            │   │
│  │  - test_connection()                                 │   │
│  │  - list(path)                                        │   │
│  │  - upload(local, remote)                            │   │
│  │  - download(remote, local)                          │   │
│  │  - delete(path)                                      │   │
│  │  - mkdir(path)                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**配置信息分离说明**:

1. **应用配置** (存储在 Tauri Store `config.json`):
   - 启用的服务器 ID 列表 (`enabledWebdavServers: string[]`)
   - 其他应用设置(语言、主题等)

2. **服务器详细配置** (存储在 SQLite 数据库 `webdav_servers` 表):
   - 服务器 ID (UUID)
   - 服务器名称
   - 服务器 URL
   - 用户名
   - 超时时间
   - HTTPS 设置
   - 连接测试历史
   - 服务器类型
   - 启用状态

3. **敏感信息** (存储在系统 Keyring):
   - 密码 (使用服务器 ID 作为 key)

4. **临时运行时对象** (不持久化):
   - WebDavClient 实例
   - HTTP 连接

**混合存储的优势**:

- Store: 快速访问启用的服务器列表,无需数据库查询
- Database: 支持复杂查询、外键关系、事务和约束
- Keyring: 操作系统级加密,保证密码安全
- 三层分离,各司其职,性能和安全兼顾

### 数据流

1. **添加服务器配置流程**:

   ```
   User Input → Form Validation → Frontend Hook → Tauri Command
   → Generate UUID → Insert to DB (webdav_servers table)
   → Save Password to Keyring → Update Frontend State
   → Show Success Message
   ```

2. **连接测试流程**:

   ```
   User Click Test → Frontend Hook → Tauri Command
   → Query DB for Server Config → Get Password from Keyring
   → Create WebDAV Client → Attempt Connection
   → Update DB (last_test_at, last_test_status)
   → Return Result → Show Status
   ```

3. **编辑服务器配置流程**:

   ```
   User Edit → Form Validation → Frontend Hook → Tauri Command
   → Update DB (webdav_servers table)
   → If Password Changed: Update Keyring
   → Update Frontend State → Show Success Message
   ```

4. **启用/禁用服务器流程**:

   ```
   User Toggle → Frontend Hook → Tauri Command
   → Update DB (enabled field)
   → Update Store (enabledWebdavServers array)
   → Update Frontend State → Show Success Message
   ```

5. **删除服务器配置流程**:

   ```
   User Delete → Confirm Dialog → Frontend Hook → Tauri Command
   → Check Foreign Key (sync_folders) → If In Use: Reject
   → Delete from DB → Delete from Keyring
   → Remove from Store (enabledWebdavServers array)
   → Update Frontend State → Show Success Message
   ```

6. **获取启用的服务器流程**:

   ```
   Backend Request → Read Store (enabledWebdavServers array)
   → Query DB for Server Configs (WHERE id IN (...))
   → Return Server List
   ```

7. **文件操作流程** (Phase 4 使用):

   ```
   Backend Request → Query DB for Server Config
   → Get Password from Keyring → Create WebDAV Client
   → Execute Operation → Handle Errors → Return Result
   ```

## Components and Interfaces

### Backend Components

#### 1. WebDavClient 结构体

`WebDavClient` 是 WebDAV 协议的客户端封装,负责与 WebDAV 服务器进行实际的通信。它的作用是:

1. **封装 HTTP 通信**: 将 WebDAV 操作(列表、上传、下载等)转换为标准的 HTTP 请求
2. **管理认证**: 处理 HTTP Basic Authentication,在每个请求中添加认证头
3. **连接复用**: 使用 `reqwest::Client` 的连接池,提高性能
4. **错误处理**: 将 HTTP 错误转换为应用层的 `SyncError`

**设计说明**:

- `WebDavClient` 是一个**临时对象**,每次需要与服务器通信时,从 `WebDavServerConfig` 和 Keyring 中的密码创建
- 它**不持久化**,不存储在全局状态中
- 配置信息存储在 `WebDavServerConfig` 中(通过 Store 持久化),密码存储在系统 Keyring 中
- 创建 `WebDavClient` 时,需要提供 `WebDavServerConfig` 和从 Keyring 读取的密码

```rust
pub struct WebDavClient {
    /// WebDAV 服务器 URL (从 WebDavServerConfig.url 获取)
    url: String,
    /// 用户名 (从 WebDavServerConfig.username 获取)
    username: String,
    /// 密码 (从 Keyring 读取,不持久化在配置中)
    password: String,
    /// 连接超时时间 (从 WebDavServerConfig.timeout 获取)
    timeout: Duration,
    /// HTTP 客户端 (支持连接复用)
    client: reqwest::Client,
}

impl WebDavClient {
    /// 从服务器配置和密码创建客户端实例
    ///
    /// # 参数
    /// - config: 服务器配置(从 Store 读取)
    /// - password: 服务器密码(从 Keyring 读取)
    pub fn new(config: &WebDavServerConfig, password: String) -> Result<Self>;

    /// 测试与服务器的连接
    pub async fn test_connection(&self) -> Result<()>;

    /// 列出指定路径下的文件和文件夹
    pub async fn list(&self, path: &str) -> Result<Vec<FileInfo>>;

    /// 上传本地文件到远程路径
    pub async fn upload(&self, local_path: &Path, remote_path: &str) -> Result<()>;

    /// 从远程路径下载文件到本地
    pub async fn download(&self, remote_path: &str, local_path: &Path) -> Result<()>;

    /// 删除远程路径的文件或文件夹
    pub async fn delete(&self, path: &str) -> Result<()>;

    /// 在远程路径创建文件夹
    pub async fn mkdir(&self, path: &str) -> Result<()>;
}
```

**使用示例**:

```rust
// 1. 从 Store 获取服务器配置
let config = get_server_config(&server_id)?;

// 2. 从 Keyring 获取密码
let password = KeyringManager::get_password(&server_id)?;

// 3. 创建 WebDavClient 实例
let client = WebDavClient::new(&config, password)?;

// 4. 执行操作
client.test_connection().await?;
let files = client.list("/documents").await?;

// 5. client 在作用域结束时自动销毁
```

#### 2. Keyring Manager

```rust
pub struct KeyringManager;

impl KeyringManager {
    pub fn save_password(server_id: &str, password: &str) -> Result<()>;
    pub fn get_password(server_id: &str) -> Result<String>;
    pub fn delete_password(server_id: &str) -> Result<()>;
}
```

#### 3. Tauri Commands

```rust
// ========== 服务器配置 CRUD 操作 ==========

#[tauri::command]
pub async fn add_webdav_server(
    config: WebDavServerConfig,
    password: String,
    app: AppHandle,
) -> Result<WebDavServerConfig>;

#[tauri::command]
pub async fn get_webdav_servers(
    enabled_only: bool,  // true: 只返回启用的服务器
    app: AppHandle,
) -> Result<Vec<WebDavServerConfig>>;

#[tauri::command]
pub async fn get_webdav_server(
    server_id: String,
    app: AppHandle,
) -> Result<WebDavServerConfig>;

#[tauri::command]
pub async fn update_webdav_server(
    server_id: String,
    config: WebDavServerConfig,
    password: Option<String>,  // None 表示不更新密码
    app: AppHandle,
) -> Result<WebDavServerConfig>;

#[tauri::command]
pub async fn delete_webdav_server(
    server_id: String,
    app: AppHandle,
) -> Result<()>;

// ========== 服务器启用/禁用 ==========

#[tauri::command]
pub async fn enable_webdav_server(
    server_id: String,
    app: AppHandle,
) -> Result<()>;

#[tauri::command]
pub async fn disable_webdav_server(
    server_id: String,
    app: AppHandle,
) -> Result<()>;

#[tauri::command]
pub async fn get_enabled_webdav_servers(
    app: AppHandle,
) -> Result<Vec<String>>;  // 返回启用的服务器 ID 列表

// ========== 连接测试 ==========

#[tauri::command]
pub async fn test_webdav_connection(
    server_id: String,
    app: AppHandle,
) -> Result<ConnectionTestResult>;

// ========== 密码管理 (内部使用,不直接暴露) ==========

// 这些函数由上面的命令内部调用,不需要单独暴露给前端
fn save_server_password(server_id: &str, password: &str) -> Result<()>;
fn get_server_password(server_id: &str) -> Result<String>;
fn delete_server_password(server_id: &str) -> Result<()>;
```

### Frontend Components

#### 1. useWebDavServers Hook (需重新实现)

**注意**: 现有的 `useWebDavServers` Hook 使用 Store,需要重新实现以使用数据库。

```typescript
interface UseWebDavServersReturn {
  // 服务器列表
  webdavServers: WebDavServerConfig[]

  // 添加服务器 (自动生成 UUID)
  addServer: (
    serverData: Omit<
      WebDavServerConfig,
      'id' | 'created_at' | 'updated_at' | 'last_test_at' | 'last_test_status' | 'last_test_error' | 'server_type'
    >,
    password: string
  ) => Promise<WebDavServerConfig>

  // 更新服务器 (password 为 undefined 表示不更新密码)
  updateServer: (id: string, updates: Partial<WebDavServerConfig>, password?: string) => Promise<WebDavServerConfig>

  // 删除服务器 (会检查是否被使用)
  removeServer: (id: string) => Promise<void>

  // 测试连接 (会更新数据库中的测试状态)
  testConnection: (serverId: string) => Promise<ConnectionTestResult>

  // 刷新服务器列表
  refresh: () => Promise<void>

  // 加载状态
  loading: boolean

  // 错误信息
  error: Error | null
}
```

#### 2. ServerConfigForm 组件

```typescript
interface ServerConfigFormProps {
  mode: 'add' | 'edit'
  initialData?: WebDavServerConfig
  onSubmit: (config: WebDavServerConfig, password: string) => Promise<void>
  onCancel: () => void
}
```

#### 3. ServerListItem 组件

```typescript
interface ServerListItemProps {
  server: WebDavServerConfig
  onEdit: (server: WebDavServerConfig) => void
  onDelete: (serverId: string) => void
  onTest: (serverId: string) => void
}
```

## Data Models

### 数据存储策略

**混合存储方案**: 采用三层存储架构,各司其职:

#### 1. Tauri Store (config.json) - 应用配置

存储应用级别的配置和启用的服务器列表:

```json
{
  "version": "0.1.0",
  "language": "zh-CN",
  "theme": "system",
  "autoStart": false,
  "minimizeToTray": true,
  "enabledWebdavServers": ["uuid-1", "uuid-2"],  // 启用的服务器 ID 列表
  "syncFolders": [...]
}
```

**用途**:

- 快速访问启用的服务器列表
- 用户偏好设置
- 不需要复杂查询的配置

#### 2. SQLite Database (webdav_servers 表) - 服务器详细配置

存储所有服务器的详细配置信息:

```sql
CREATE TABLE webdav_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    username TEXT NOT NULL,
    use_https INTEGER NOT NULL DEFAULT 1,
    timeout INTEGER NOT NULL DEFAULT 30,
    last_test_at INTEGER,
    last_test_status TEXT DEFAULT 'unknown',
    last_test_error TEXT,
    server_type TEXT DEFAULT 'generic',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**用途**:

- 存储所有服务器配置(包括禁用的)
- 支持复杂查询和筛选
- 记录连接测试历史
- 建立与 sync_folders 的关系

#### 3. System Keyring - 敏感信息

存储密码等敏感信息:

**用途**:

- 安全存储密码
- 使用操作系统级加密
- 不在配置文件或数据库中暴露

#### 数据同步策略

1. **添加服务器**:
   - 插入到数据库 `webdav_servers` 表
   - 如果 `enabled=true`,添加 ID 到 Store 的 `enabledWebdavServers` 数组
   - 保存密码到 Keyring

2. **启用/禁用服务器**:
   - 更新数据库中的 `enabled` 字段
   - 同步更新 Store 中的 `enabledWebdavServers` 数组

3. **删除服务器**:
   - 从数据库删除记录
   - 从 Store 的 `enabledWebdavServers` 数组中移除
   - 从 Keyring 删除密码

4. **查询启用的服务器**:
   - 从 Store 读取 `enabledWebdavServers` 数组(快速)
   - 根据 ID 列表从数据库查询详细配置

**优势**:

- Store 提供快速访问启用的服务器列表
- 数据库提供完整的服务器管理能力
- Keyring 保证密码安全
- 三层分离,各司其职

### Database Schema

#### webdav_servers 表 (新增)

```sql
CREATE TABLE IF NOT EXISTS webdav_servers (
    -- 主键ID (使用 UUID 字符串)
    id TEXT PRIMARY KEY NOT NULL,

    -- 服务器名称
    name TEXT NOT NULL,

    -- WebDAV 服务器 URL
    url TEXT NOT NULL,

    -- 用户名
    username TEXT NOT NULL,

    -- 是否使用 HTTPS (0: HTTP, 1: HTTPS)
    use_https INTEGER NOT NULL DEFAULT 1,

    -- 连接超时时间（秒）
    timeout INTEGER NOT NULL DEFAULT 30,

    -- 最后连接测试时间（Unix 时间戳，秒）
    last_test_at INTEGER,

    -- 最后连接测试状态（success, failed, unknown）
    last_test_status TEXT DEFAULT 'unknown',

    -- 最后连接测试错误信息
    last_test_error TEXT,

    -- 服务器类型（自动检测，如 nextcloud, owncloud, generic）
    server_type TEXT DEFAULT 'generic',

    -- 是否启用（0: 禁用, 1: 启用）
    enabled INTEGER NOT NULL DEFAULT 1,

    -- 记录创建时间（Unix 时间戳，秒）
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),

    -- 记录更新时间（Unix 时间戳，秒）
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_webdav_servers_enabled
    ON webdav_servers(enabled);

CREATE INDEX IF NOT EXISTS idx_webdav_servers_last_test_status
    ON webdav_servers(last_test_status);
```

#### sync_folders 表更新

需要添加外键约束,确保引用的服务器存在:

```sql
-- 在 sync_folders 表中添加外键约束
ALTER TABLE sync_folders
    ADD CONSTRAINT fk_sync_folders_server
    FOREIGN KEY (server_id)
    REFERENCES webdav_servers(id)
    ON DELETE RESTRICT;  -- 防止删除正在使用的服务器
```

### Backend Data Structures

#### AppConfig (更新 - 添加 enabledWebdavServers)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub version: String,
    pub language: String,
    pub theme: String,
    pub auto_start: bool,
    pub minimize_to_tray: bool,
    pub sync_folders: Vec<SyncFolderConfig>,

    /// 启用的 WebDAV 服务器 ID 列表
    /// 注意: 这里只存储 ID,详细配置在数据库中
    pub enabled_webdav_servers: Vec<String>,
}
```

#### WebDavServerConfig (数据库模型)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavServerConfig {
    /// 服务器唯一标识符 (UUID)
    pub id: String,

    /// 服务器名称
    pub name: String,

    /// WebDAV 服务器 URL
    pub url: String,

    /// 用户名
    pub username: String,

    /// 是否使用 HTTPS
    pub use_https: bool,

    /// 连接超时时间（秒）
    pub timeout: u32,

    /// 最后连接测试时间
    pub last_test_at: Option<i64>,

    /// 最后连接测试状态
    pub last_test_status: String,

    /// 最后连接测试错误信息
    pub last_test_error: Option<String>,

    /// 服务器类型
    pub server_type: String,

    /// 是否启用
    pub enabled: bool,

    /// 创建时间
    pub created_at: i64,

    /// 更新时间
    pub updated_at: i64,
}
```

#### FileInfo (新增)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: Option<i64>,
}
```

#### ConnectionTestResult (新增)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub server_info: Option<ServerInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub server_type: String,
    pub available_space: Option<u64>,
}
```

### Frontend Data Structures

#### WebDavServerConfig (TypeScript)

```typescript
interface WebDavServerConfig {
  id: string
  name: string
  url: string
  username: string
  useHttps: boolean
  timeout: number
}
```

#### ConnectionTestResult (TypeScript)

```typescript
interface ConnectionTestResult {
  success: boolean
  message: string
  serverInfo?: {
    serverType: string
    availableSpace?: number
  }
}
```

#### ServerFormData (新增)

```typescript
interface ServerFormData {
  name: string
  url: string
  username: string
  password: string
  useHttps: boolean
  timeout: number
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: URL 格式验证正确性

_For any_ 输入字符串,URL 验证函数应该正确识别有效的 URL(包含协议、主机名)和无效的 URL
**Validates: Requirements 1.1, 9.1, 9.3**

### Property 2: 配置持久化 Round-Trip

_For any_ 有效的服务器配置,保存到 Store 后再读取应该得到相同的配置信息(密码除外)
**Validates: Requirements 1.3, 4.3**

### Property 3: 密码安全存储 Round-Trip

_For any_ 服务器 ID 和密码,保存到 Keyring 后再读取应该得到相同的密码
**Validates: Requirements 1.2, 4.4**

### Property 4: 服务器 ID 唯一性

_For any_ 多次添加服务器配置的操作,生成的服务器 ID 应该都是唯一的,不会重复
**Validates: Requirements 1.4**

### Property 5: 配置列表同步性

_For any_ 添加、更新或删除服务器配置的操作,服务器列表应该立即反映这些变化
**Validates: Requirements 1.5, 3.1, 5.4**

### Property 6: 连接超时机制

_For any_ 设置的超时时间,如果连接操作超过该时间,应该终止连接并返回超时错误
**Validates: Requirements 2.5, 7.5**

### Property 7: 错误信息完整性

_For any_ WebDAV 操作失败的情况,返回的错误应该包含错误类型和详细的错误描述
**Validates: Requirements 2.3, 7.1, 7.3, 7.4**

### Property 8: 敏感信息隐藏

_For any_ 显示服务器配置的 UI 组件,渲染结果不应该包含密码等敏感信息
**Validates: Requirements 3.3**

### Property 9: 服务器列表信息完整性

_For any_ 服务器配置,在列表中显示时应该包含名称、URL 和连接状态等必需信息
**Validates: Requirements 3.2**

### Property 10: 编辑表单预填充正确性

_For any_ 已存在的服务器配置,点击编辑后表单应该正确填充该服务器的所有配置信息
**Validates: Requirements 4.1**

### Property 11: 密码保留逻辑

_For any_ 服务器配置的编辑操作,如果密码字段未修改,Keyring 中的密码应该保持不变
**Validates: Requirements 4.5**

### Property 12: 配置删除完整性

_For any_ 服务器配置的删除操作,应该同时从 Store 和 Keyring 中移除相关数据
**Validates: Requirements 5.2, 5.3**

### Property 13: 删除保护机制

_For any_ 正在被同步文件夹使用的服务器,删除操作应该被阻止并显示警告信息
**Validates: Requirements 5.5**

### Property 14: WebDAV 文件操作 Round-Trip

_For any_ 随机生成的文件内容,上传到 WebDAV 服务器后再下载,应该得到相同的文件内容
**Validates: Requirements 6.2, 6.3**

### Property 15: WebDAV 删除操作正确性

_For any_ 上传到 WebDAV 服务器的文件,删除操作后该文件应该不再存在于服务器上
**Validates: Requirements 6.4**

### Property 16: WebDAV 文件夹创建正确性

_For any_ 指定的远程路径,创建文件夹后该路径应该存在且为目录类型
**Validates: Requirements 6.5**

### Property 17: 国际化文本正确性

_For any_ 支持的语言设置,UI 中的所有文本(标签、错误消息、对话框)应该显示对应语言的翻译
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 18: 表单验证实时性

_For any_ 用户输入,表单验证应该实时反馈验证结果(错误提示或验证通过)
**Validates: Requirements 9.1, 9.2**

### Property 19: 超时时间范围验证

_For any_ 输入的超时时间,如果不在有效范围(1-300 秒)内,应该显示范围错误提示
**Validates: Requirements 9.4**

### Property 20: 表单状态管理

_For any_ 表单状态,当所有验证通过时提交按钮应该启用,否则应该禁用
**Validates: Requirements 9.5**

### Property 21: 异步操作加载状态

_For any_ 正在进行的异步操作,UI 应该显示加载指示器并禁用相关操作按钮
**Validates: Requirements 10.3**

## Error Handling

### 错误类型定义

基于现有的 `SyncError` 枚举(在 `error.rs` 中),WebDAV 相关的错误处理包括:

1. **WebDav(String)**: WebDAV 协议相关错误
2. **Network(String)**: 网络连接错误
3. **AuthError(String)**: 认证失败错误
4. **ConfigError(String)**: 配置错误
5. **Io(std::io::Error)**: 文件 I/O 错误

### 错误处理策略

#### Backend 错误处理

```rust
// 连接测试错误处理示例
pub async fn test_webdav_connection(config: &WebDavServerConfig, password: String) -> Result<ConnectionTestResult> {
    let client = WebDavClient::new(config, password)
        .map_err(|e| SyncError::ConfigError(format!("Invalid config: {}", e)))?;

    match client.test_connection().await {
        Ok(_) => Ok(ConnectionTestResult {
            success: true,
            message: "Connection successful".to_string(),
            server_info: Some(ServerInfo { ... }),
        }),
        Err(SyncError::AuthError(msg)) => Ok(ConnectionTestResult {
            success: false,
            message: format!("Authentication failed: {}", msg),
            server_info: None,
        }),
        Err(SyncError::Network(msg)) => Ok(ConnectionTestResult {
            success: false,
            message: format!("Network error: {}", msg),
            server_info: None,
        }),
        Err(e) => Err(e),
    }
}
```

#### Frontend 错误处理

```typescript
// 错误消息国际化处理
const handleError = (error: Error) => {
  const { t } = useTranslation()

  let errorKey = 'servers.errors.unknown'

  if (error.message.includes('Authentication failed')) {
    errorKey = 'servers.errors.authFailed'
  } else if (error.message.includes('Network error')) {
    errorKey = 'servers.errors.networkError'
  } else if (error.message.includes('timeout')) {
    errorKey = 'servers.errors.timeout'
  }

  toast.error(t(errorKey))
}
```

### 错误恢复机制

1. **连接失败**: 提供重试按钮,允许用户修改配置后重试
2. **超时错误**: 建议用户检查网络连接或增加超时时间
3. **认证失败**: 提示用户检查用户名和密码
4. **配置错误**: 显示具体的验证错误,引导用户修正

## Testing Strategy

### 测试框架选择

- **Property-Based Testing**: 使用 `proptest` crate (Rust) 和 `fast-check` (TypeScript)
- **Unit Testing**: 使用 Rust 内置测试框架和 Vitest (TypeScript)
- **Integration Testing**: 使用 Tauri 测试工具

### Property-Based Testing 配置

每个 property-based test 应该:

- 运行至少 100 次迭代
- 使用明确的注释标记对应的 correctness property
- 格式: `// Feature: webdav-connection, Property X: [property description]`

### 测试策略

#### Backend 测试

1. **WebDavClient 单元测试**
   - 测试 URL 解析和验证
   - 测试 HTTP 请求构建
   - 测试错误处理逻辑

2. **WebDavClient Property Tests**
   - Property 3: 密码存储 round-trip
   - Property 14: 文件上传下载 round-trip
   - Property 15: 删除操作正确性
   - Property 16: 文件夹创建正确性

3. **Keyring Manager 测试**
   - 测试密码保存、读取、删除
   - 测试错误场景(密码不存在等)

4. **Tauri Commands 集成测试**
   - 测试命令调用和参数传递
   - 测试错误序列化

#### Frontend 测试

1. **useWebDavServers Hook 测试**
   - 测试 CRUD 操作
   - 测试状态管理
   - 测试错误处理

2. **ServerConfigForm 组件测试**
   - Property 1: URL 验证
   - Property 18: 实时验证
   - Property 19: 超时范围验证
   - Property 20: 表单状态管理
   - 测试表单提交
   - 测试取消操作

3. **ServerListItem 组件测试**
   - Property 8: 敏感信息隐藏
   - Property 9: 信息完整性
   - 测试操作按钮

4. **国际化测试**
   - Property 17: 多语言文本正确性
   - 测试语言切换

### Mock 策略

对于需要实际 WebDAV 服务器的测试:

1. 使用 `mockito` 或 `wiremock` 创建 mock WebDAV 服务器
2. 模拟各种响应场景(成功、失败、超时)
3. 验证请求格式和认证头

### 测试覆盖率目标

- Backend 代码覆盖率: ≥ 80%
- Frontend 代码覆盖率: ≥ 75%
- Property tests 覆盖所有关键 correctness properties

## Implementation Notes

### 数据库迁移

需要创建新的迁移文件 `src-tauri/migrations/002_webdav_servers.sql`:

```sql
-- WebDAV 服务器配置表
CREATE TABLE IF NOT EXISTS webdav_servers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    username TEXT NOT NULL,
    use_https INTEGER NOT NULL DEFAULT 1,
    timeout INTEGER NOT NULL DEFAULT 30,
    last_test_at INTEGER,
    last_test_status TEXT DEFAULT 'unknown',
    last_test_error TEXT,
    server_type TEXT DEFAULT 'generic',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_webdav_servers_enabled
    ON webdav_servers(enabled);

CREATE INDEX IF NOT EXISTS idx_webdav_servers_last_test_status
    ON webdav_servers(last_test_status);

-- 注意: sync_folders 表的外键约束将在 Phase 5 添加
-- 因为 sync_folders 表本身也是在 Phase 5 创建的
```

在 `lib.rs` 中注册迁移:

```rust
.plugin(
    tauri_plugin_sql::Builder::new()
        .add_migrations(
            "sqlite:lightsync.db",
            vec![
                tauri_plugin_sql::Migration {
                    version: 1,
                    description: "initial database schema",
                    sql: include_str!("../migrations/001_initial.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 2,
                    description: "add webdav_servers table",
                    sql: include_str!("../migrations/002_webdav_servers.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
            ],
        )
        .build(),
)
```

### 依赖添加

需要在 `Cargo.toml` 中添加:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json", "stream"] }
keyring = "2.0"
url = "2.4"

[dev-dependencies]
proptest = "1.0"
mockito = "1.0"
```

需要在 `package.json` 中添加:

```json
{
  "devDependencies": {
    "fast-check": "^3.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 安全考虑

1. **密码存储**: 使用系统 Keyring,不在配置文件中存储明文密码
2. **HTTPS 支持**: 优先使用 HTTPS 连接,对 HTTP 连接显示警告
3. **证书验证**: 默认启用 SSL 证书验证,提供选项禁用(用于自签名证书)
4. **超时设置**: 设置合理的默认超时(30 秒),防止长时间挂起

### 性能优化

1. **连接复用**: 使用 `reqwest::Client` 的连接池功能
2. **并发控制**: 限制同时进行的连接测试数量
3. **缓存策略**: 缓存服务器连接状态,避免频繁测试
4. **懒加载**: 密码仅在需要时从 Keyring 读取

### 国际化支持

需要在翻译文件中添加以下 key:

```json
{
  "servers": {
    "title": "服务器管理",
    "addServer": "添加服务器",
    "editServer": "编辑服务器",
    "deleteServer": "删除服务器",
    "testConnection": "测试连接",
    "serverName": "服务器名称",
    "serverUrl": "服务器 URL",
    "username": "用户名",
    "password": "密码",
    "timeout": "超时时间(秒)",
    "useHttps": "使用 HTTPS",
    "errors": {
      "invalidUrl": "无效的 URL 格式",
      "requiredField": "此字段为必填项",
      "timeoutRange": "超时时间必须在 1-300 秒之间",
      "authFailed": "认证失败,请检查用户名和密码",
      "networkError": "网络连接失败",
      "timeout": "连接超时",
      "serverInUse": "该服务器正在被同步文件夹使用,无法删除",
      "unknown": "未知错误"
    },
    "success": {
      "added": "服务器添加成功",
      "updated": "服务器更新成功",
      "deleted": "服务器删除成功",
      "connectionSuccess": "连接测试成功"
    },
    "confirmDelete": "确定要删除服务器 \"{{name}}\" 吗?",
    "emptyState": "暂无服务器配置",
    "emptyStateHint": "点击上方按钮添加您的第一个 WebDAV 服务器"
  }
}
```

### 文件结构

```
src-tauri/src/
├── webdav.rs           # WebDAV 客户端实现
├── keyring_manager.rs  # Keyring 管理器
└── commands/
    └── webdav.rs       # WebDAV 相关 Tauri 命令

src/
├── hooks/
│   └── useWebDavServers.ts  # WebDAV 服务器管理 Hook
├── components/
│   ├── ServerConfigForm.tsx  # 服务器配置表单
│   ├── ServerListItem.tsx    # 服务器列表项
│   └── ConnectionTestDialog.tsx  # 连接测试对话框
└── utils/
    └── webdav.ts       # WebDAV 相关工具函数
```

## Future Enhancements

1. **服务器模板**: 提供常见 WebDAV 服务商的预配置模板(Nextcloud, ownCloud 等)
2. **批量操作**: 支持批量测试连接、批量删除等
3. **连接池管理**: 实现更高级的连接池管理和复用策略
4. **自动发现**: 支持 WebDAV 服务器自动发现(通过 .well-known)
5. **高级认证**: 支持 OAuth、双因素认证等高级认证方式
6. **性能监控**: 记录和显示连接性能指标(延迟、带宽等)
7. **离线模式**: 支持离线查看服务器配置和历史记录
