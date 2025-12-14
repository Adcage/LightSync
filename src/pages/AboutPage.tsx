import React from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { 
  Cloud, 
  Github, 
  Globe, 
  Shield, 
  Zap, 
  Users, 
  Package,
  ExternalLink,
  Settings
} from 'lucide-react';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  const appInfo = {
    name: 'LightSync',
    version: '1.0.0',
    buildNumber: '20240115',
    description: '轻量级跨设备文件同步工具',
    website: 'https://github.com/Adcage/LightSync',
    repository: 'https://github.com/Adcage/LightSync',
    license: 'MIT',
    author: 'LightSync Team',
    releaseDate: '2024-01-15',
  };

  const techStack = [
    {
      name: 'React',
      version: '19.1.0',
      description: '用户界面框架',
      icon: <Zap className="w-5 h-5 text-blue-500" />,
    },
    {
      name: 'Tauri',
      version: '2.0',
      description: '跨平台桌面应用框架',
      icon: <Package className="w-5 h-5 text-orange-500" />,
    },
    {
      name: 'Rust',
      version: 'Edition 2021',
      description: '系统编程语言',
      icon: <Shield className="w-5 h-5 text-red-500" />,
    },
    {
      name: 'NextUI',
      version: '2.4.8',
      description: 'React UI 组件库',
      icon: <Github className="w-5 h-5 text-purple-500" />,
    },
    {
      name: 'TailwindCSS',
      version: '3.4.18',
      description: 'CSS 框架',
      icon: <div className="w-5 h-5 flex items-center justify-center text-cyan-500">
        <span className="text-lg font-bold">TW</span>
      </div>,
    },
    {
      name: 'SQLite',
      version: '3.x',
      description: '嵌入式数据库',
      icon: <div className="w-5 h-5 flex items-center justify-center text-green-500">
        <span className="text-lg font-bold">DB</span>
      </div>,
    },
    {
      name: 'WebDAV',
      version: 'RFC 4918',
      description: '文件同步协议',
      icon: <Cloud className="w-5 h-5 text-blue-500" />,
    },
  ];

  const features = [
    {
      title: t('about.features.lightweight', '轻量高效'),
      description: t('about.features.lightweightDesc', '内存占用小于50MB，启动时间小于3秒'),
      icon: <Zap className="w-6 h-6 text-green-500" />,
    },
    {
      title: t('about.features.crossPlatform', '跨平台支持'),
      description: t('about.features.crossPlatformDesc', '支持Windows、macOS和Linux'),
      icon: <Globe className="w-6 h-6 text-blue-500" />,
    },
    {
      title: t('about.features.webdav', 'WebDAV协议'),
      description: t('about.features.webdavDesc', '兼容主流WebDAV服务商'),
      icon: <Cloud className="w-6 h-6 text-blue-500" />,
    },
    {
      title: t('about.features.security', '安全可靠'),
      description: t('about.features.securityDesc', '密码加密存储，支持HTTPS'),
      icon: <Shield className="w-6 h-6 text-red-500" />,
    },
    {
      title: t('about.features.customizable', '高度可定制'),
      description: t('about.features.customizableDesc', '灵活的同步策略和冲突处理'),
      icon: <Settings className="w-6 h-6 text-purple-500" />,
    },
  ];

  const handleCheckUpdate = () => {
    // 检查更新功能
    window.open('https://github.com/Adcage/LightSync/releases', '_blank');
  };

  const handleReportIssue = () => {
    // 报告问题功能
    window.open('https://github.com/Adcage/LightSync/issues', '_blank');
  };

  const handleViewSource = () => {
    // 查看源代码功能
    window.open('https://github.com/Adcage/LightSync', '_blank');
  };

  const handleViewDocumentation = () => {
    // 查看文档功能
    window.open('https://github.com/Adcage/LightSync/blob/main/docs/README.md', '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t('about.title', '关于')}
      </h1>

      {/* 应用信息 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              <span className="text-2xl font-bold">LS</span>
            </div>
            <h2 className="text-xl font-semibold">{appInfo.name}</h2>
          </div>
        </CardHeader>
        <CardBody className="text-center">
          <div className="mb-4">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {appInfo.version}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('about.buildNumber', '构建号')}: {appInfo.buildNumber}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {appInfo.description}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('about.license', '许可证')}
              </p>
              <p className="font-medium">{appInfo.license}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('about.author', '作者')}
              </p>
              <p className="font-medium">{appInfo.author}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('about.releaseDate', '发布日期')}
              </p>
              <p className="font-medium">{appInfo.releaseDate}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 技术栈 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('about.techStack', '技术栈')}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techStack.map((tech, index) => (
              <div 
                key={index}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-shrink-0">
                  {tech.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {tech.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tech.version}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tech.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 主要特性 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('about.features', '主要特性')}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 链接和操作 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('about.links', '链接和操作')}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              color="primary"
              variant="bordered"
              startContent={<Github className="w-4 h-4" />}
              onPress={handleViewSource}
            >
              {t('about.viewSource', '查看源代码')}
            </Button>
            
            <Button
              color="secondary"
              variant="bordered"
              startContent={<Package className="w-4 h-4" />}
              onPress={handleViewDocumentation}
            >
              {t('about.viewDocumentation', '查看文档')}
            </Button>
            
            <Button
              color="success"
              variant="bordered"
              startContent={<ExternalLink className="w-4 h-4" />}
              onPress={handleCheckUpdate}
            >
              {t('about.checkUpdate', '检查更新')}
            </Button>
            
            <Button
              color="warning"
              variant="bordered"
              startContent={<Users className="w-4 h-4" />}
              onPress={handleReportIssue}
            >
              {t('about.reportIssue', '报告问题')}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 版权信息 */}
      <Card>
        <CardBody className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('about.copyright', '版权所有')} © 2024 {appInfo.author}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('about.madeWith', '使用')} {t('about.heart', '❤️')} {t('about.and', '和')} {t('about.coffee', '☕')} {t('about.in', '在')}
          </p>
          <div className="flex justify-center mt-4">
            <Chip color="primary" variant="flat">
              {appInfo.license}
            </Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AboutPage;