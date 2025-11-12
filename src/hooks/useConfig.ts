/**
 * LightSync 配置管理 Hook
 *
 * 提供 React Hook 接口来管理应用配置
 */

import { useCallback, useEffect, useState } from 'react'
import {
  batchUpdateConfig,
  getConfig,
  getConfigValue,
  initConfig,
  resetConfig,
  setConfigValue,
  updateConfig,
  watchConfig,
} from '../utils/store'
import type {
  AppConfig,
  ConfigUpdate,
  SyncFolderConfig,
  SyncFolderUpdate,
  WebDavServerConfig,
  WebDavServerUpdate,
} from '../types/config'

/**
 * 配置管理 Hook 返回类型
 */
interface UseConfigReturn {
  config: AppConfig | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  update: (newConfig: AppConfig) => Promise<void>
  getValue: <T = unknown>(key: string) => Promise<T>
  setValue: (key: string, value: unknown) => Promise<void>
  batchUpdate: (updates: ConfigUpdate) => Promise<void>
  reset: () => Promise<void>
}

/**
 * 配置管理 Hook
 */
export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 初始化配置
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)
        const initialConfig = await initConfig()
        setConfig(initialConfig)
        setError(null)
      } catch (err) {
        setError(err as Error)
        console.error('Failed to initialize config:', err)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  // 监听配置变化
  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const setupWatcher = async () => {
      try {
        unsubscribe = await watchConfig(newConfig => {
          setConfig(newConfig)
        })
      } catch (err) {
        console.error('Failed to setup config watcher:', err)
      }
    }

    if (config) {
      setupWatcher()
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [config])

  // 刷新配置
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const latestConfig = await getConfig()
      setConfig(latestConfig)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to refresh config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 更新完整配置
  const update = useCallback(async (newConfig: AppConfig) => {
    try {
      await updateConfig(newConfig)
      setConfig(newConfig)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to update config:', err)
      throw err
    }
  }, [])

  // 获取配置项
  const getValue = useCallback(async <T = unknown>(key: string): Promise<T> => {
    try {
      const value = await getConfigValue<T>(key)
      return value
    } catch (err) {
      console.error(`Failed to get config value for key '${key}':`, err)
      throw err
    }
  }, [])

  // 设置配置项
  const setValue = useCallback(
    async (key: string, value: unknown) => {
      try {
        await setConfigValue(key, value)
        // 刷新配置以保持同步
        await refresh()
        setError(null)
      } catch (err) {
        setError(err as Error)
        console.error(`Failed to set config value for key '${key}':`, err)
        throw err
      }
    },
    [refresh]
  )

  // 批量更新
  const batchUpdate = useCallback(
    async (updates: ConfigUpdate) => {
      try {
        await batchUpdateConfig(updates)
        // 刷新配置以保持同步
        await refresh()
        setError(null)
      } catch (err) {
        setError(err as Error)
        console.error('Failed to batch update config:', err)
        throw err
      }
    },
    [refresh]
  )

  // 重置配置
  const reset = useCallback(async () => {
    try {
      const defaultConfig = await resetConfig()
      setConfig(defaultConfig)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to reset config:', err)
      throw err
    }
  }, [])

  return {
    config,
    loading,
    error,
    refresh,
    update,
    getValue,
    setValue,
    batchUpdate,
    reset,
  }
}

/**
 * 配置项 Hook 返回类型
 */
type UseConfigValueReturn<T> = [T, (newValue: T) => Promise<void>, boolean]

/**
 * 配置项 Hook
 */
export function useConfigValue<T = unknown>(key: string, defaultValue: T): UseConfigValueReturn<T> {
  const [value, setValueState] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)

  // 获取初始值
  useEffect(() => {
    const fetchValue = async () => {
      try {
        setLoading(true)
        const fetchedValue = await getConfigValue<T>(key)
        setValueState(fetchedValue)
      } catch (err) {
        console.error(`Failed to fetch config value for key '${key}':`, err)
        setValueState(defaultValue)
      } finally {
        setLoading(false)
      }
    }

    fetchValue()
  }, [key, defaultValue])

  // 设置值
  const setValue = useCallback(
    async (newValue: T) => {
      try {
        await setConfigValue(key, newValue)
        setValueState(newValue)
      } catch (err) {
        console.error(`Failed to set config value for key '${key}':`, err)
        throw err
      }
    },
    [key]
  )

  return [value, setValue, loading]
}

/**
 * 语言配置 Hook
 */
export function useLanguage(): UseConfigValueReturn<string> {
  return useConfigValue<string>('language', 'zh-CN')
}

/**
 * 主题配置 Hook
 */
export function useTheme(): UseConfigValueReturn<string> {
  return useConfigValue<string>('theme', 'system')
}

/**
 * 自动启动配置 Hook
 */
export function useAutoStart(): UseConfigValueReturn<boolean> {
  return useConfigValue<boolean>('autoStart', false)
}

/**
 * 同步文件夹 Hook 返回类型
 */
interface UseSyncFoldersReturn {
  syncFolders: SyncFolderConfig[]
  addSyncFolder: (folderConfig: SyncFolderConfig) => Promise<void>
  updateSyncFolder: (id: string, updates: SyncFolderUpdate) => Promise<void>
  removeSyncFolder: (id: string) => Promise<void>
  loading: boolean
}

/**
 * 同步文件夹配置 Hook
 */
export function useSyncFolders(): UseSyncFoldersReturn {
  const { config, update, loading } = useConfig()
  const syncFolders = config?.syncFolders || []

  // 添加同步文件夹
  const addSyncFolder = useCallback(
    async (folderConfig: SyncFolderConfig) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        syncFolders: [...config.syncFolders, folderConfig],
      }
      await update(newConfig)
    },
    [config, update]
  )

  // 更新同步文件夹
  const updateSyncFolder = useCallback(
    async (id: string, updates: SyncFolderUpdate) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        syncFolders: config.syncFolders.map(folder => (folder.id === id ? { ...folder, ...updates } : folder)),
      }
      await update(newConfig)
    },
    [config, update]
  )

  // 删除同步文件夹
  const removeSyncFolder = useCallback(
    async (id: string) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        syncFolders: config.syncFolders.filter(folder => folder.id !== id),
      }
      await update(newConfig)
    },
    [config, update]
  )

  return {
    syncFolders,
    addSyncFolder,
    updateSyncFolder,
    removeSyncFolder,
    loading,
  }
}

/**
 * WebDAV 服务器 Hook 返回类型
 */
interface UseWebDavServersReturn {
  webdavServers: WebDavServerConfig[]
  addServer: (serverConfig: WebDavServerConfig) => Promise<void>
  updateServer: (id: string, updates: WebDavServerUpdate) => Promise<void>
  removeServer: (id: string) => Promise<void>
  loading: boolean
}

/**
 * WebDAV 服务器配置 Hook
 */
export function useWebDavServers(): UseWebDavServersReturn {
  const { config, update, loading } = useConfig()
  const webdavServers = config?.webdavServers || []

  // 添加服务器
  const addServer = useCallback(
    async (serverConfig: WebDavServerConfig) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        webdavServers: [...config.webdavServers, serverConfig],
      }
      await update(newConfig)
    },
    [config, update]
  )

  // 更新服务器
  const updateServer = useCallback(
    async (id: string, updates: WebDavServerUpdate) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        webdavServers: config.webdavServers.map(server => (server.id === id ? { ...server, ...updates } : server)),
      }
      await update(newConfig)
    },
    [config, update]
  )

  // 删除服务器
  const removeServer = useCallback(
    async (id: string) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        webdavServers: config.webdavServers.filter(server => server.id !== id),
      }
      await update(newConfig)
    },
    [config, update]
  )

  return {
    webdavServers,
    addServer,
    updateServer,
    removeServer,
    loading,
  }
}
