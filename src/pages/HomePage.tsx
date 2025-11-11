import React, {useEffect, useState} from 'react';
import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { Cloud, FolderOpen, Settings, Activity } from 'lucide-react';
import ConfigTest from '../components/ConfigTest';
import DatabaseTest from '../components/DatabaseTest';
import LanguageTest from '../components/LanguageTest';
import { SystemInfo } from '../components/SystemInfo';
import { DebugPanel } from '../components/DebugPanel';
import {isDevelopmentMode} from "../utils/system.ts";

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [isDev, setIsDev] = useState<boolean>(false);

  useEffect(() => {
    fetchSystemInfo();
  }, []);
  const fetchSystemInfo = async () => {
    // 获取系统信息
    const [isDevMode] = await Promise.all([isDevelopmentMode()]);

    setIsDev(isDevMode)
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 欢迎区域 */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t('home.title', 'LightSync')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t('home.subtitle', '轻量级跨设备文件同步工具，基于 WebDAV 协议实现高效、安全、可定制的文件同步')}
        </p>
      </div>

      {/* 快速操作卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardBody className="text-center p-6">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="font-semibold mb-2">{t('home.quickActions.syncFolders', '同步文件夹')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('home.quickActions.syncFoldersDesc', '配置和管理同步文件夹')}
            </p>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardBody className="text-center p-6">
            <Cloud className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="font-semibold mb-2">{t('home.quickActions.webdavServers', 'WebDAV 服务器')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('home.quickActions.webdavServersDesc', '配置云端服务器连接')}
            </p>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardBody className="text-center p-6">
            <Activity className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            <h3 className="font-semibold mb-2">{t('home.quickActions.syncStatus', '同步状态')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('home.quickActions.syncStatusDesc', '查看同步进度和历史记录')}
            </p>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardBody className="text-center p-6">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="font-semibold mb-2">{t('home.quickActions.settings', '设置')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('home.quickActions.settingsDesc', '应用配置和偏好设置')}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* 系统状态概览 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('home.systemStatus.title', '系统状态')}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">0</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('home.systemStatus.activeSyncs', '活跃同步')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">0</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('home.systemStatus.syncedFiles', '已同步文件')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">0 MB</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('home.systemStatus.transferred', '已传输数据')}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 开发者测试区域 - 仅在开发环境显示 */}
      {isDev && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">{t('home.devTests.title', '开发者测试')}</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <LanguageTest />
              <DatabaseTest />
              <ConfigTest />
              <SystemInfo />
            </CardBody>
          </Card>
          
          <DebugPanel />
        </div>
      )}
    </div>
  );
};

export default HomePage;
