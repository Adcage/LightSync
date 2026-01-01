/**
 * LightSync WebDAV 服务器管理 Hook
 *
 * 提供 React Hook 接口来管理 WebDAV 服务器配置
 * 使用数据库存储，支持完整的 CRUD 操作
 */

import { useCallback, useEffect, useState } from 'react'
import {
  addWebDavServer as addServerApi,
  deleteWebDavServer as deleteServerApi,
  getWebDavServers as getServersApi,
  testWebDavConnection as testConnectionApi,
  updateWebDavServer as updateServerApi,
  type AddServerInput,
  type ConnectionTestResult,
  type UpdateServerInput,
  type WebDavServerConfig,
} from '@/utils/webdav'

/**
 * WebDAV 服务器管理 Hook 返回类型
 */
export interface UseWebDavServersReturn {
  /** 服务器列表 */
  servers: WebDavServerConfig[]

  /** 添加服务器 */
  addServer: (serverData: AddServerInput) => Promise<WebDavServerConfig>

  /** 更新服务器 */
  updateServer: (id: string, updates: UpdateServerInput) => Promise<WebDavServerConfig>

  /** 删除服务器 */
  removeServer: (id: string) => Promise<void>

  /** 测试连接 */
  testConnection: (serverId: string) => Promise<ConnectionTestResult>

  /** 刷新服务器列表 */
  refresh: () => Promise<void>

  /** 加载状态 */
  loading: boolean

  /** 错误信息 */
  error: Error | null
}

/**
 * WebDAV 服务器管理 Hook
 *
 * @param enabledOnly - 是否只加载启用的服务器（默认 false，加载所有服务器）
 * @returns WebDAV 服务器管理接口
 *
 * @example
 * ```typescript
 * function ServersPage() {
 *   const {
 *     servers,
 *     addServer,
 *     updateServer,
 *     removeServer,
 *     testConnection,
 *     refresh,
 *     loading,
 *     error,
 *   } = useWebDavServers()
 *
 *   // 添加服务器
 *   const handleAdd = async () => {
 *     await addServer({
 *       name: 'My Server',
 *       url: 'https://example.com/webdav',
 *       username: 'user',
 *       password: 'pass',
 *       useHttps: true,
 *       timeout: 30,
 *     })
 *   }
 *
 *   // 测试连接
 *   const handleTest = async (serverId: string) => {
 *     const result = await testConnection(serverId)
 *     if (result.success) {
 *       console.log('Connection successful')
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       {loading && <p>Loading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *       {servers.map(server => (
 *         <div key={server.id}>{server.name}</div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useWebDavServers(enabledOnly: boolean = false): UseWebDavServersReturn {
  // 状态管理
  const [servers, setServers] = useState<WebDavServerConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 加载服务器列表
  const loadServers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const serverList = await getServersApi(enabledOnly)
      setServers(serverList)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      console.error('Failed to load WebDAV servers:', error)
    } finally {
      setLoading(false)
    }
  }, [enabledOnly])

  // 初始化时加载数据
  useEffect(() => {
    loadServers()
  }, [loadServers])

  // 添加服务器
  const addServer = useCallback(
    async (serverData: AddServerInput): Promise<WebDavServerConfig> => {
      try {
        setError(null)
        const newServer = await addServerApi(serverData)

        // 立即更新本地状态，实现配置列表同步性（Property 5）
        setServers(prevServers => [...prevServers, newServer])

        return newServer
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        console.error('Failed to add WebDAV server:', error)
        throw error
      }
    },
    []
  )

  // 更新服务器
  const updateServer = useCallback(
    async (id: string, updates: UpdateServerInput): Promise<WebDavServerConfig> => {
      try {
        setError(null)
        const updatedServer = await updateServerApi(id, updates)

        // 立即更新本地状态，实现配置列表同步性（Property 5）
        setServers(prevServers => prevServers.map(server => (server.id === id ? updatedServer : server)))

        return updatedServer
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        console.error(`Failed to update WebDAV server ${id}:`, error)
        throw error
      }
    },
    []
  )

  // 删除服务器
  const removeServer = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await deleteServerApi(id)

      // 立即更新本地状态，实现配置列表同步性（Property 5）
      setServers(prevServers => prevServers.filter(server => server.id !== id))
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      console.error(`Failed to delete WebDAV server ${id}:`, error)
      throw error
    }
  }, [])

  // 测试连接
  const testConnection = useCallback(
    async (serverId: string): Promise<ConnectionTestResult> => {
      try {
        setError(null)
        const result = await testConnectionApi(serverId)

        // 测试完成后刷新服务器列表，以获取更新的测试状态
        await loadServers()

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        console.error(`Failed to test WebDAV connection for ${serverId}:`, error)
        throw error
      }
    },
    [loadServers]
  )

  // 刷新服务器列表
  const refresh = useCallback(async (): Promise<void> => {
    await loadServers()
  }, [loadServers])

  return {
    servers,
    addServer,
    updateServer,
    removeServer,
    testConnection,
    refresh,
    loading,
    error,
  }
}
