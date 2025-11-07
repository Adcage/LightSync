/**
 * LightSync 配置存储工具
 * 
 * 封装 Tauri Store 插件，提供配置管理的便捷接口
 */

import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';

// 配置存储实例
let storeInstance = null;

/**
 * 获取 Store 实例
 * @returns {Promise<Store>}
 */
export async function getStore() {
  if (!storeInstance) {
    storeInstance = await Store.load('config.json');
  }
  return storeInstance;
}

/**
 * 初始化配置
 * @returns {Promise<Object>} 配置对象
 */
export async function initConfig() {
  try {
    const config = await invoke('init_config');
    return config;
  } catch (error) {
    console.error('Failed to initialize config:', error);
    throw error;
  }
}

/**
 * 获取完整配置
 * @returns {Promise<Object>} 配置对象
 */
export async function getConfig() {
  try {
    const config = await invoke('get_config');
    return config;
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}

/**
 * 更新配置
 * @param {Object} config - 配置对象
 * @returns {Promise<void>}
 */
export async function updateConfig(config) {
  try {
    await invoke('update_config', { config });
  } catch (error) {
    console.error('Failed to update config:', error);
    throw error;
  }
}

/**
 * 获取指定配置项
 * @param {string} key - 配置键
 * @returns {Promise<any>} 配置值
 */
export async function getConfigValue(key) {
  try {
    const value = await invoke('get_config_value', { key });
    return value;
  } catch (error) {
    console.error(`Failed to get config value for key '${key}':`, error);
    throw error;
  }
}

/**
 * 设置指定配置项
 * @param {string} key - 配置键
 * @param {any} value - 配置值
 * @returns {Promise<void>}
 */
export async function setConfigValue(key, value) {
  try {
    await invoke('set_config_value', { key, value });
  } catch (error) {
    console.error(`Failed to set config value for key '${key}':`, error);
    throw error;
  }
}

/**
 * 重置配置为默认值
 * @returns {Promise<Object>} 默认配置对象
 */
export async function resetConfig() {
  try {
    const config = await invoke('reset_config');
    return config;
  } catch (error) {
    console.error('Failed to reset config:', error);
    throw error;
  }
}

/**
 * 监听配置变化
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消监听函数
 */
export async function watchConfig(callback) {
  const store = await getStore();
  
  // 使用 Store 的 onChange 事件监听
  const unsubscribe = await store.onChange((key, value) => {
    if (key === 'app_config') {
      callback(value);
    }
  });

  return unsubscribe;
}

/**
 * 批量更新配置项
 * @param {Object} updates - 要更新的配置项对象
 * @returns {Promise<void>}
 */
export async function batchUpdateConfig(updates) {
  try {
    const config = await getConfig();
    const updatedConfig = { ...config, ...updates };
    await updateConfig(updatedConfig);
  } catch (error) {
    console.error('Failed to batch update config:', error);
    throw error;
  }
}

/**
 * 导出配置到 JSON 字符串
 * @returns {Promise<string>} JSON 字符串
 */
export async function exportConfig() {
  try {
    const config = await getConfig();
    return JSON.stringify(config, null, 2);
  } catch (error) {
    console.error('Failed to export config:', error);
    throw error;
  }
}

/**
 * 从 JSON 字符串导入配置
 * @param {string} jsonString - JSON 字符串
 * @returns {Promise<void>}
 */
export async function importConfig(jsonString) {
  try {
    const config = JSON.parse(jsonString);
    await updateConfig(config);
  } catch (error) {
    console.error('Failed to import config:', error);
    throw error;
  }
}

