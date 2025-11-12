/**
 * LightSync 配置存储工具
 *
 * 封装 Tauri Store 插件，提供配置管理的便捷接口
 */

import { invoke } from '@tauri-apps/api/core'
import { Store } from '@tauri-apps/plugin-store'
import type { AppConfig, ConfigUpdate } from '../types/config'

// 配置存储实例
let storeInstance: Store | null = null

/**
 * 获取 Store 实例
 */
export async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load('config.json')
  }
  return storeInstance
}

/**
 * 初始化配置
 */
export async function initConfig(): Promise<AppConfig> {
  try {
    const config = await invoke<AppConfig>('init_config')
    return config
  } catch (error) {
    console.error('Failed to initialize config:', error)
    throw error
  }
}

/**
 * 获取完整配置
 */
export async function getConfig(): Promise<AppConfig> {
  try {
    const config = await invoke<AppConfig>('get_config')
    return config
  } catch (error) {
    console.error('Failed to get config:', error)
    throw error
  }
}

/**
 * 更新配置
 */
export async function updateConfig(config: AppConfig): Promise<void> {
  try {
    await invoke('update_config', { config })
  } catch (error) {
    console.error('Failed to update config:', error)
    throw error
  }
}

/**
 * 获取指定配置项
 */
export async function getConfigValue<T = unknown>(key: string): Promise<T> {
  try {
    const value = await invoke<T>('get_config_value', { key })
    return value
  } catch (error) {
    console.error(`Failed to get config value for key '${key}':`, error)
    throw error
  }
}

/**
 * 设置指定配置项
 */
export async function setConfigValue(key: string, value: unknown): Promise<void> {
  try {
    await invoke('set_config_value', { key, value })
  } catch (error) {
    console.error(`Failed to set config value for key '${key}':`, error)
    throw error
  }
}

/**
 * 重置配置为默认值
 */
export async function resetConfig(): Promise<AppConfig> {
  try {
    const config = await invoke<AppConfig>('reset_config')
    return config
  } catch (error) {
    console.error('Failed to reset config:', error)
    throw error
  }
}

/**
 * 监听配置变化
 */
export async function watchConfig(callback: (value: AppConfig) => void): Promise<() => void> {
  const store = await getStore()

  // 使用 Store 的 onChange 事件监听
  const unsubscribe = await store.onChange<AppConfig>((key, value) => {
    if (key === 'app_config' && value) {
      callback(value)
    }
  })

  return unsubscribe
}

/**
 * 批量更新配置项
 */
export async function batchUpdateConfig(updates: ConfigUpdate): Promise<void> {
  try {
    const config = await getConfig()
    const updatedConfig: AppConfig = { ...config, ...updates }
    await updateConfig(updatedConfig)
  } catch (error) {
    console.error('Failed to batch update config:', error)
    throw error
  }
}

/**
 * 导出配置到 JSON 字符串
 */
export async function exportConfig(): Promise<string> {
  try {
    const config = await getConfig()
    return JSON.stringify(config, null, 2)
  } catch (error) {
    console.error('Failed to export config:', error)
    throw error
  }
}

/**
 * 从 JSON 字符串导入配置
 */
export async function importConfig(jsonString: string): Promise<void> {
  try {
    const config = JSON.parse(jsonString) as AppConfig
    await updateConfig(config)
  } catch (error) {
    console.error('Failed to import config:', error)
    throw error
  }
}
