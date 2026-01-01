/**
 * LightSync WebDAV 工具模块
 *
 * 封装 WebDAV 服务器配置管理的 Tauri 命令调用
 * 提供类型安全的 API 接口
 */

import { invoke } from '@tauri-apps/api/core'

// ==================== 类型定义 ====================

/**
 * WebDAV 服务器配置
 */
export interface WebDavServerConfig {
  /** 服务器 ID (UUID) */
  id: string
  /** 服务器名称 */
  name: string
  /** 服务器 URL */
  url: string
  /** 用户名 */
  username: string
  /** 是否使用 HTTPS */
  useHttps: boolean
  /** 连接超时时间（秒） */
  timeout: number
  /** 最后连接测试时间（Unix 时间戳，秒） */
  lastTestAt?: number
  /** 最后连接测试状态 */
  lastTestStatus: string
  /** 最后连接测试错误信息 */
  lastTestError?: string
  /** 服务器类型 */
  serverType: string
  /** 是否启用 */
  enabled: boolean
  /** 创建时间（Unix 时间戳，秒） */
  createdAt: number
  /** 更新时间（Unix 时间戳，秒） */
  updatedAt: number
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  /** 测试是否成功 */
  success: boolean
  /** 测试消息 */
  message: string
  /** 服务器信息（仅在成功时返回） */
  serverInfo?: ServerInfo
}

/**
 * 服务器信息
 */
export interface ServerInfo {
  /** 服务器类型（nextcloud, owncloud, generic 等） */
  serverType: string
  /** 可用空间（字节） */
  availableSpace?: number
}

/**
 * 添加服务器时的输入数据（不包含自动生成的字段）
 */
export interface AddServerInput {
  /** 服务器名称 */
  name: string
  /** 服务器 URL */
  url: string
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 是否使用 HTTPS */
  useHttps: boolean
  /** 连接超时时间（秒） */
  timeout: number
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 更新服务器时的输入数据（所有字段可选）
 */
export interface UpdateServerInput {
  /** 服务器名称 */
  name?: string
  /** 服务器 URL */
  url?: string
  /** 用户名 */
  username?: string
  /** 密码（undefined 表示不更新密码） */
  password?: string
  /** 是否使用 HTTPS */
  useHttps?: boolean
  /** 连接超时时间（秒） */
  timeout?: number
  /** 是否启用 */
  enabled?: boolean
}

// ==================== API 函数 ====================

/**
 * 添加 WebDAV 服务器配置
 *
 * @param serverData - 服务器配置数据
 * @returns 返回包含生成 ID 的完整服务器配置
 * @throws 如果添加失败则抛出错误
 *
 * @example
 * ```typescript
 * const server = await addWebDavServer({
 *   name: 'My Server',
 *   url: 'https://example.com/webdav',
 *   username: 'user',
 *   password: 'pass',
 *   useHttps: true,
 *   timeout: 30,
 * })
 * console.log('Server ID:', server.id)
 * ```
 */
export async function addWebDavServer(serverData: AddServerInput): Promise<WebDavServerConfig> {
  try {
    // 构建配置对象（不包含 ID，后端会自动生成）
    const config: Partial<WebDavServerConfig> = {
      name: serverData.name,
      url: serverData.url,
      username: serverData.username,
      useHttps: serverData.useHttps,
      timeout: serverData.timeout,
      enabled: serverData.enabled ?? true,
      // 以下字段由后端自动设置
      lastTestStatus: 'unknown',
      serverType: 'generic',
    }

    const result = await invoke<WebDavServerConfig>('add_webdav_server', {
      config,
      password: serverData.password,
    })

    return result
  } catch (error) {
    console.error('Failed to add WebDAV server:', error)
    throw new Error(`Failed to add WebDAV server: ${error}`)
  }
}

/**
 * 获取 WebDAV 服务器列表
 *
 * @param enabledOnly - true 表示只返回启用的服务器，false 返回所有服务器
 * @returns 返回服务器配置列表
 * @throws 如果获取失败则抛出错误
 *
 * @example
 * ```typescript
 * // 获取所有服务器
 * const allServers = await getWebDavServers(false)
 *
 * // 只获取启用的服务器
 * const enabledServers = await getWebDavServers(true)
 * ```
 */
export async function getWebDavServers(enabledOnly: boolean = false): Promise<WebDavServerConfig[]> {
  try {
    const result = await invoke<WebDavServerConfig[]>('get_webdav_servers', {
      enabledOnly,
    })

    return result
  } catch (error) {
    console.error('Failed to get WebDAV servers:', error)
    throw new Error(`Failed to get WebDAV servers: ${error}`)
  }
}

/**
 * 获取单个 WebDAV 服务器配置
 *
 * @param serverId - 服务器 ID
 * @returns 返回服务器配置
 * @throws 如果服务器不存在或获取失败则抛出错误
 *
 * @example
 * ```typescript
 * const server = await getWebDavServer('server-uuid-123')
 * console.log('Server name:', server.name)
 * ```
 */
export async function getWebDavServer(serverId: string): Promise<WebDavServerConfig> {
  try {
    const result = await invoke<WebDavServerConfig>('get_webdav_server', {
      serverId,
    })

    return result
  } catch (error) {
    console.error(`Failed to get WebDAV server ${serverId}:`, error)
    throw new Error(`Failed to get WebDAV server: ${error}`)
  }
}

/**
 * 更新 WebDAV 服务器配置
 *
 * @param serverId - 服务器 ID
 * @param updates - 要更新的字段（只需提供需要更新的字段）
 * @returns 返回更新后的服务器配置
 * @throws 如果更新失败则抛出错误
 *
 * @example
 * ```typescript
 * // 只更新名称
 * const updated = await updateWebDavServer('server-id', {
 *   name: 'New Name',
 * })
 *
 * // 更新密码
 * await updateWebDavServer('server-id', {
 *   password: 'new-password',
 * })
 *
 * // 更新多个字段
 * await updateWebDavServer('server-id', {
 *   name: 'New Name',
 *   timeout: 60,
 *   enabled: false,
 * })
 * ```
 */
export async function updateWebDavServer(serverId: string, updates: UpdateServerInput): Promise<WebDavServerConfig> {
  try {
    // 首先获取当前配置
    const currentConfig = await getWebDavServer(serverId)

    // 合并更新（保留未更新的字段）
    const updatedConfig: WebDavServerConfig = {
      ...currentConfig,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.url !== undefined && { url: updates.url }),
      ...(updates.username !== undefined && { username: updates.username }),
      ...(updates.useHttps !== undefined && { useHttps: updates.useHttps }),
      ...(updates.timeout !== undefined && { timeout: updates.timeout }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    }

    // 调用后端命令
    const result = await invoke<WebDavServerConfig>('update_webdav_server', {
      serverId,
      config: updatedConfig,
      password: updates.password, // undefined 表示不更新密码
    })

    return result
  } catch (error) {
    console.error(`Failed to update WebDAV server ${serverId}:`, error)
    throw new Error(`Failed to update WebDAV server: ${error}`)
  }
}

/**
 * 删除 WebDAV 服务器配置
 *
 * @param serverId - 服务器 ID
 * @throws 如果服务器正在被使用或删除失败则抛出错误
 *
 * @example
 * ```typescript
 * try {
 *   await deleteWebDavServer('server-id')
 *   console.log('Server deleted successfully')
 * } catch (error) {
 *   if (error.message.includes('being used')) {
 *     console.error('Cannot delete: server is in use')
 *   }
 * }
 * ```
 */
export async function deleteWebDavServer(serverId: string): Promise<void> {
  try {
    await invoke('delete_webdav_server', {
      serverId,
    })
  } catch (error) {
    console.error(`Failed to delete WebDAV server ${serverId}:`, error)
    throw new Error(`Failed to delete WebDAV server: ${error}`)
  }
}

/**
 * 测试 WebDAV 服务器连接
 *
 * @param serverId - 服务器 ID
 * @returns 返回连接测试结果
 * @throws 如果测试过程出错则抛出错误（注意：连接失败不会抛出错误，而是返回 success: false）
 *
 * @example
 * ```typescript
 * const result = await testWebDavConnection('server-id')
 * if (result.success) {
 *   console.log('Connection successful:', result.serverInfo?.serverType)
 * } else {
 *   console.error('Connection failed:', result.message)
 * }
 * ```
 */
export async function testWebDavConnection(serverId: string): Promise<ConnectionTestResult> {
  try {
    const result = await invoke<ConnectionTestResult>('test_webdav_connection', {
      serverId,
    })

    return result
  } catch (error) {
    console.error(`Failed to test WebDAV connection for ${serverId}:`, error)
    throw new Error(`Failed to test WebDAV connection: ${error}`)
  }
}

// ==================== 辅助函数 ====================

/**
 * 验证服务器 URL 格式
 *
 * @param url - 要验证的 URL
 * @returns 如果 URL 有效返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * if (!isValidUrl('https://example.com/webdav')) {
 *   console.error('Invalid URL format')
 * }
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 验证超时时间范围
 *
 * @param timeout - 超时时间（秒）
 * @returns 如果超时时间在有效范围内返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * if (!isValidTimeout(30)) {
 *   console.error('Timeout must be between 1 and 300 seconds')
 * }
 * ```
 */
export function isValidTimeout(timeout: number): boolean {
  return timeout >= 1 && timeout <= 300
}

/**
 * 格式化最后测试时间
 *
 * @param timestamp - Unix 时间戳（秒）
 * @returns 格式化的时间字符串
 *
 * @example
 * ```typescript
 * const formatted = formatLastTestTime(1234567890)
 * console.log(formatted) // "2009-02-13 23:31:30"
 * ```
 */
export function formatLastTestTime(timestamp?: number): string {
  if (!timestamp) {
    return 'Never'
  }

  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

/**
 * 获取连接状态的显示文本
 *
 * @param status - 连接状态
 * @returns 状态的显示文本
 *
 * @example
 * ```typescript
 * const text = getStatusText('success')
 * console.log(text) // "Connected"
 * ```
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'success':
      return 'Connected'
    case 'failed':
      return 'Failed'
    case 'unknown':
    default:
      return 'Not tested'
  }
}

/**
 * 获取连接状态的颜色
 *
 * @param status - 连接状态
 * @returns 状态对应的颜色（用于 UI 显示）
 *
 * @example
 * ```typescript
 * const color = getStatusColor('success')
 * console.log(color) // "success"
 * ```
 */
export function getStatusColor(status: string): 'success' | 'danger' | 'default' {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'danger'
    case 'unknown':
    default:
      return 'default'
  }
}
