/**
 * 配置管理系统测试组件
 * 
 * 用于测试配置管理系统的各项功能
 */

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Divider, Spinner } from '@nextui-org/react';
import { useConfig, useLanguage, useTheme, useSyncFolders, useWebDavServers } from '../hooks/useConfig';
import type { SyncFolderConfig, WebDavServerConfig } from '../types/config';
import { invoke } from '@tauri-apps/api/core';

export default function ConfigTest() {
  const { config, loading, error, refresh, reset } = useConfig();
  const [language, setLanguage, langLoading] = useLanguage();
  const [theme, setTheme, themeLoading] = useTheme();
  const { syncFolders, addSyncFolder, removeSyncFolder } = useSyncFolders();
  const { webdavServers, addServer, removeServer } = useWebDavServers();
  
  const [testResult, setTestResult] = useState<string[]>([]);
  const [watcherStarted, setWatcherStarted] = useState(false);

  useEffect(() => {
    // 监听配置变化事件
    const setupListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen('config-changed', (event) => {
        console.log('Config changed:', event);
        addTestResult('✅ 配置文件变化事件接收成功');
      });
      
      return unlisten;
    };

    setupListener();
  }, []);

  const addTestResult = (message: string) => {
    setTestResult((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runTests = async () => {
    setTestResult([]);
    addTestResult('🚀 开始测试配置管理系统...');

    try {
      // 测试 1: 初始化配置
      addTestResult('测试 1: 初始化配置');
      const initResult = await invoke('init_config');
      addTestResult(`✅ 配置初始化成功: ${JSON.stringify(initResult).substring(0, 50)}...`);

      // 测试 2: 获取配置
      addTestResult('测试 2: 获取配置');
      const getResult = await invoke('get_config');
      addTestResult(`✅ 获取配置成功: ${JSON.stringify(getResult).substring(0, 50)}...`);

      // 测试 3: 设置配置项
      addTestResult('测试 3: 设置配置项');
      await invoke('set_config_value', { key: 'language', value: 'en-US' });
      addTestResult('✅ 设置语言为 en-US 成功');

      // 测试 4: 获取配置项
      addTestResult('测试 4: 获取配置项');
      const valueResult = await invoke('get_config_value', { key: 'language' });
      addTestResult(`✅ 获取语言配置成功: ${valueResult}`);

      // 测试 5: 重置配置
      addTestResult('测试 5: 重置配置');
      await invoke('reset_config');
      addTestResult('✅ 重置配置成功');

      // 测试 6: Hook 测试
      addTestResult('测试 6: Hook 功能测试');
      addTestResult(`当前语言: ${language}`);
      addTestResult(`当前主题: ${theme}`);
      addTestResult(`同步文件夹数量: ${syncFolders.length}`);
      addTestResult(`WebDAV服务器数量: ${webdavServers.length}`);

      addTestResult('✅ 所有测试完成！');
    } catch (err) {
      addTestResult(`❌ 测试失败: ${err}`);
    }
  };

  const startWatcher = async () => {
    try {
      await invoke('start_config_watcher');
      setWatcherStarted(true);
      addTestResult('✅ 配置文件监听已启动');
    } catch (err) {
      addTestResult(`❌ 启动配置文件监听失败: ${err}`);
    }
  };

  const stopWatcher = async () => {
    try {
      await invoke('stop_config_watcher');
      setWatcherStarted(false);
      addTestResult('✅ 配置文件监听已停止');
    } catch (err) {
      addTestResult(`❌ 停止配置文件监听失败: ${err}`);
    }
  };

  const testAddSyncFolder = async () => {
    try {
      const newFolder: SyncFolderConfig = {
        id: `folder-${Date.now()}`,
        name: '测试文件夹',
        localPath: '/test/local',
        remotePath: '/test/remote',
        serverId: 'server-1',
        syncDirection: 'bidirectional',
        syncInterval: 30,
        autoSync: true,
        ignorePatterns: ['*.tmp', 'node_modules'],
        conflictResolution: 'newer-wins',
      };
      await addSyncFolder(newFolder);
      addTestResult('✅ 添加同步文件夹成功');
    } catch (err) {
      addTestResult(`❌ 添加同步文件夹失败: ${err}`);
    }
  };

  const testAddWebDavServer = async () => {
    try {
      const newServer: WebDavServerConfig = {
        id: `server-${Date.now()}`,
        name: '测试服务器',
        url: 'https://webdav.example.com',
        username: 'testuser',
        useHttps: true,
        timeout: 30,
      };
      await addServer(newServer);
      addTestResult('✅ 添加 WebDAV 服务器成功');
    } catch (err) {
      addTestResult(`❌ 添加 WebDAV 服务器失败: ${err}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner label="加载配置中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <h2 className="text-red-500">❌ 配置加载失败</h2>
          </CardHeader>
          <CardBody>
            <p>{String(error)}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <h1 className="text-2xl font-bold">配置管理系统测试</h1>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* 当前配置显示 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">当前配置</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-60">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>

            <Divider />

            {/* 配置项控制 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">语言设置</label>
                <Input
                  value={language || ''}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={langLoading}
                  placeholder="zh-CN / en-US"
                />
              </div>
              <div>
                <label className="block mb-2">主题设置</label>
                <Input
                  value={theme || ''}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={themeLoading}
                  placeholder="light / dark / system"
                />
              </div>
            </div>

            <Divider />

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2">
              <Button color="primary" onPress={runTests}>
                运行所有测试
              </Button>
              <Button color="success" onPress={refresh}>
                刷新配置
              </Button>
              <Button color="warning" onPress={reset}>
                重置配置
              </Button>
              <Button color="secondary" onPress={testAddSyncFolder}>
                添加测试同步文件夹
              </Button>
              <Button color="secondary" onPress={testAddWebDavServer}>
                添加测试服务器
              </Button>
              {watcherStarted ? (
                <Button color="danger" onPress={stopWatcher}>
                  停止配置监听
                </Button>
              ) : (
                <Button color="primary" onPress={startWatcher}>
                  启动配置监听
                </Button>
              )}
            </div>

            <Divider />

            {/* 测试结果显示 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">测试结果</h3>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-96">
                {testResult.length === 0 ? (
                  <p>点击"运行所有测试"开始测试...</p>
                ) : (
                  testResult.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))
                )}
              </div>
            </div>

            <Divider />

            {/* 同步文件夹列表 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">
                同步文件夹 ({syncFolders.length})
              </h3>
              {syncFolders.length > 0 ? (
                <div className="space-y-2">
                  {syncFolders.map((folder) => (
                    <Card key={folder.id}>
                      <CardBody className="flex flex-row justify-between items-center">
                        <div>
                          <p className="font-semibold">{folder.name}</p>
                          <p className="text-sm text-gray-600">{folder.localPath}</p>
                        </div>
                        <Button
                          size="sm"
                          color="danger"
                          onPress={() => removeSyncFolder(folder.id)}
                        >
                          删除
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暂无同步文件夹</p>
              )}
            </div>

            <Divider />

            {/* WebDAV 服务器列表 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">
                WebDAV 服务器 ({webdavServers.length})
              </h3>
              {webdavServers.length > 0 ? (
                <div className="space-y-2">
                  {webdavServers.map((server) => (
                    <Card key={server.id}>
                      <CardBody className="flex flex-row justify-between items-center">
                        <div>
                          <p className="font-semibold">{server.name}</p>
                          <p className="text-sm text-gray-600">{server.url}</p>
                        </div>
                        <Button
                          size="sm"
                          color="danger"
                          onPress={() => removeServer(server.id)}
                        >
                          删除
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暂无 WebDAV 服务器配置</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

