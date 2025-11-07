/**
 * LightSync 配置管理 Hook
 * 
 * 提供 React Hook 接口来管理应用配置
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initConfig,
  getConfig,
  updateConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  watchConfig,
  batchUpdateConfig,
} from '../utils/store';

/**
 * 配置管理 Hook
 * @returns {Object} 配置状态和操作方法
 */
export function useConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始化配置
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const initialConfig = await initConfig();
        setConfig(initialConfig);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Failed to initialize config:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // 监听配置变化
  useEffect(() => {
    let unsubscribe = null;

    const setupWatcher = async () => {
      try {
        unsubscribe = await watchConfig((newConfig) => {
          setConfig(newConfig);
        });
      } catch (err) {
        console.error('Failed to setup config watcher:', err);
      }
    };

    if (config) {
      setupWatcher();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [config]);

  // 刷新配置
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const latestConfig = await getConfig();
      setConfig(latestConfig);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to refresh config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新完整配置
  const update = useCallback(async (newConfig) => {
    try {
      await updateConfig(newConfig);
      setConfig(newConfig);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to update config:', err);
      throw err;
    }
  }, []);

  // 获取配置项
  const getValue = useCallback(async (key) => {
    try {
      const value = await getConfigValue(key);
      return value;
    } catch (err) {
      console.error(`Failed to get config value for key '${key}':`, err);
      throw err;
    }
  }, []);

  // 设置配置项
  const setValue = useCallback(async (key, value) => {
    try {
      await setConfigValue(key, value);
      // 刷新配置以保持同步
      await refresh();
      setError(null);
    } catch (err) {
      setError(err);
      console.error(`Failed to set config value for key '${key}':`, err);
      throw err;
    }
  }, [refresh]);

  // 批量更新
  const batchUpdate = useCallback(async (updates) => {
    try {
      await batchUpdateConfig(updates);
      // 刷新配置以保持同步
      await refresh();
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to batch update config:', err);
      throw err;
    }
  }, [refresh]);

  // 重置配置
  const reset = useCallback(async () => {
    try {
      const defaultConfig = await resetConfig();
      setConfig(defaultConfig);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to reset config:', err);
      throw err;
    }
  }, []);

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
  };
}

/**
 * 配置项 Hook
 * @param {string} key - 配置键
 * @param {any} defaultValue - 默认值
 * @returns {[any, Function]} [值, 设置函数]
 */
export function useConfigValue(key, defaultValue = null) {
  const [value, setValueState] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  // 获取初始值
  useEffect(() => {
    const fetchValue = async () => {
      try {
        setLoading(true);
        const fetchedValue = await getConfigValue(key);
        setValueState(fetchedValue);
      } catch (err) {
        console.error(`Failed to fetch config value for key '${key}':`, err);
        setValueState(defaultValue);
      } finally {
        setLoading(false);
      }
    };

    fetchValue();
  }, [key, defaultValue]);

  // 设置值
  const setValue = useCallback(
    async (newValue) => {
      try {
        await setConfigValue(key, newValue);
        setValueState(newValue);
      } catch (err) {
        console.error(`Failed to set config value for key '${key}':`, err);
        throw err;
      }
    },
    [key]
  );

  return [value, setValue, loading];
}

/**
 * 语言配置 Hook
 * @returns {[string, Function]} [语言, 设置语言函数]
 */
export function useLanguage() {
  const [language, setLanguage, loading] = useConfigValue('language', 'zh-CN');
  return [language, setLanguage, loading];
}

/**
 * 主题配置 Hook
 * @returns {[string, Function]} [主题, 设置主题函数]
 */
export function useTheme() {
  const [theme, setTheme, loading] = useConfigValue('theme', 'system');
  return [theme, setTheme, loading];
}

/**
 * 自动启动配置 Hook
 * @returns {[boolean, Function]} [是否自动启动, 设置函数]
 */
export function useAutoStart() {
  const [autoStart, setAutoStart, loading] = useConfigValue('autoStart', false);
  return [autoStart, setAutoStart, loading];
}

/**
 * 同步文件夹配置 Hook
 * @returns {Object} 同步文件夹状态和操作方法
 */
export function useSyncFolders() {
  const { config, update, loading } = useConfig();
  const syncFolders = config?.syncFolders || [];

  // 添加同步文件夹
  const addSyncFolder = useCallback(
    async (folderConfig) => {
      if (!config) return;
      
      const newConfig = {
        ...config,
        syncFolders: [...config.syncFolders, folderConfig],
      };
      await update(newConfig);
    },
    [config, update]
  );

  // 更新同步文件夹
  const updateSyncFolder = useCallback(
    async (id, updates) => {
      if (!config) return;

      const newConfig = {
        ...config,
        syncFolders: config.syncFolders.map((folder) =>
          folder.id === id ? { ...folder, ...updates } : folder
        ),
      };
      await update(newConfig);
    },
    [config, update]
  );

  // 删除同步文件夹
  const removeSyncFolder = useCallback(
    async (id) => {
      if (!config) return;

      const newConfig = {
        ...config,
        syncFolders: config.syncFolders.filter((folder) => folder.id !== id),
      };
      await update(newConfig);
    },
    [config, update]
  );

  return {
    syncFolders,
    addSyncFolder,
    updateSyncFolder,
    removeSyncFolder,
    loading,
  };
}

/**
 * WebDAV 服务器配置 Hook
 * @returns {Object} 服务器配置状态和操作方法
 */
export function useWebDavServers() {
  const { config, update, loading } = useConfig();
  const webdavServers = config?.webdavServers || [];

  // 添加服务器
  const addServer = useCallback(
    async (serverConfig) => {
      if (!config) return;

      const newConfig = {
        ...config,
        webdavServers: [...config.webdavServers, serverConfig],
      };
      await update(newConfig);
    },
    [config, update]
  );

  // 更新服务器
  const updateServer = useCallback(
    async (id, updates) => {
      if (!config) return;

      const newConfig = {
        ...config,
        webdavServers: config.webdavServers.map((server) =>
          server.id === id ? { ...server, ...updates } : server
        ),
      };
      await update(newConfig);
    },
    [config, update]
  );

  // 删除服务器
  const removeServer = useCallback(
    async (id) => {
      if (!config) return;

      const newConfig = {
        ...config,
        webdavServers: config.webdavServers.filter((server) => server.id !== id),
      };
      await update(newConfig);
    },
    [config, update]
  );

  return {
    webdavServers,
    addServer,
    updateServer,
    removeServer,
    loading,
  };
}

