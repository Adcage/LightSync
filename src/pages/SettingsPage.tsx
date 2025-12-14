import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Switch, Select, SelectItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { Settings, Globe, Shield, Bell, Monitor, Palette, Info } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    autoStart: true,
    minimizeToTray: true,
    theme: 'system',
    language: 'zh-CN',
    checkUpdate: true,
    logLevel: 'info',
    maxConcurrentSyncs: 3,
    bandwidthLimit: 50, // MB/s
    enableNotifications: true,
    enableTelemetry: false,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    // 这里会调用实际的设置保存API
  };

  const handleResetSettings = () => {
    if (window.confirm(t('settings.confirmReset', '确定要重置所有设置为默认值吗？'))) {
      // 重置为默认设置
      const defaultSettings = {
        autoStart: true,
        minimizeToTray: true,
        theme: 'system',
        language: 'zh-CN',
        checkUpdate: true,
        logLevel: 'info',
        maxConcurrentSyncs: 3,
        bandwidthLimit: 50,
        enableNotifications: true,
        enableTelemetry: false,
      };
      setSettings(defaultSettings);
    }
  };

  const handleExportSettings = () => {
    // 导出设置功能
    const settingsJson = JSON.stringify(settings, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lightsync_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    // 导入设置功能
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedSettings = JSON.parse(e.target?.result as string);
            setSettings({ ...settings, ...importedSettings });
          } catch (error) {
            console.error('Failed to import settings:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t('settings.title', '设置')}
      </h1>

      {/* 通用设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{t('settings.general', '通用设置')}</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-gray-500" />
              <span>{t('settings.autoStart', '开机自启动')}</span>
            </div>
            <Switch
              isSelected={settings.autoStart}
              onValueChange={(value) => handleSettingChange('autoStart', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <span>{t('settings.minimizeToTray', '最小化到托盘')}</span>
            </div>
            <Switch
              isSelected={settings.minimizeToTray}
              onValueChange={(value) => handleSettingChange('minimizeToTray', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <span>{t('settings.enableNotifications', '启用通知')}</span>
            </div>
            <Switch
              isSelected={settings.enableNotifications}
              onValueChange={(value) => handleSettingChange('enableNotifications', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-gray-500" />
              <span>{t('settings.checkUpdate', '检查更新')}</span>
            </div>
            <Switch
              isSelected={settings.checkUpdate}
              onValueChange={(value) => handleSettingChange('checkUpdate', value)}
            />
          </div>
        </CardBody>
      </Card>

      {/* 外观设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{t('settings.appearance', '外观设置')}</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span>{t('settings.language', '语言')}</span>
            </div>
            <Select
              selectedKeys={[settings.language]}
              onSelectionChange={(keys) => handleSettingChange('language', Array.from(keys)[0])}
              className="max-w-xs"
            >
              <SelectItem key="zh-CN" value="zh-CN">简体中文</SelectItem>
              <SelectItem key="zh-TW" value="zh-TW">繁體中文</SelectItem>
              <SelectItem key="en-US" value="en-US">English</SelectItem>
              <SelectItem key="ja-JP" value="ja-JP">日本語</SelectItem>
              <SelectItem key="ko-KR" value="ko-KR">한국어</SelectItem>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-gray-500" />
              <span>{t('settings.theme', '主题')}</span>
            </div>
            <Select
              selectedKeys={[settings.theme]}
              onSelectionChange={(keys) => handleSettingChange('theme', Array.from(keys)[0])}
              className="max-w-xs"
            >
              <SelectItem key="light" value="light">
                <div className="flex items-center space-x-2">
                  <span>☀️</span>
                  <span>{t('settings.lightTheme', '浅色')}</span>
                </div>
              </SelectItem>
              <SelectItem key="dark" value="dark">
                <div className="flex items-center space-x-2">
                  <span>🌙</span>
                  <span>{t('settings.darkTheme', '深色')}</span>
                </div>
              </SelectItem>
              <SelectItem key="system" value="system">
                <div className="flex items-center space-x-2">
                  <span>🖥️</span>
                  <span>{t('settings.systemTheme', '跟随系统')}</span>
                </div>
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* 同步设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{t('settings.sync', '同步设置')}</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.maxConcurrentSyncs', '最大并发同步数')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.maxConcurrentSyncs}
                  onChange={(e) => handleSettingChange('maxConcurrentSyncs', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                  {settings.maxConcurrentSyncs}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.bandwidthLimit', '带宽限制 (MB/s)')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={settings.bandwidthLimit}
                  onChange={(e) => handleSettingChange('bandwidthLimit', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                  {settings.bandwidthLimit} MB/s
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 高级设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{t('settings.advanced', '高级设置')}</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-gray-500" />
              <span>{t('settings.logLevel', '日志级别')}</span>
            </div>
            <Select
              selectedKeys={[settings.logLevel]}
              onSelectionChange={(keys) => handleSettingChange('logLevel', Array.from(keys)[0])}
              className="max-w-xs"
            >
              <SelectItem key="debug" value="debug">Debug</SelectItem>
              <SelectItem key="info" value="info">Info</SelectItem>
              <SelectItem key="warning" value="warning">Warning</SelectItem>
              <SelectItem key="error" value="error">Error</SelectItem>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-gray-500" />
              <span>{t('settings.enableTelemetry', '启用遥测')}</span>
            </div>
            <Switch
              isSelected={settings.enableTelemetry}
              onValueChange={(value) => handleSettingChange('enableTelemetry', value)}
            />
          </div>
        </CardBody>
      </Card>

      {/* 设置管理 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('settings.settingsManagement', '设置管理')}</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-4">
            <Button
              color="success"
              variant="bordered"
              startContent={<Settings className="w-4 h-4" />}
              onPress={handleExportSettings}
            >
              {t('settings.exportSettings', '导出设置')}
            </Button>
            
            <Button
              color="primary"
              variant="bordered"
              startContent={<Settings className="w-4 h-4" />}
              onPress={handleImportSettings}
            >
              {t('settings.importSettings', '导入设置')}
            </Button>
            
            <Button
              color="danger"
              variant="bordered"
              startContent={<Settings className="w-4 h-4" />}
              onPress={handleResetSettings}
            >
              {t('settings.resetSettings', '重置设置')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsPage;