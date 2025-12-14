import React from 'react';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenu, NavbarMenuItem } from '@nextui-org/react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3,
  Cloud,
  FolderOpen,
  FileText,
  Settings,
  Info,
  Home
} from 'lucide-react';

const NavigationMenu: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      label: t('nav.dashboard', '仪表盘'),
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: '/servers',
      label: t('nav.servers', '服务器'),
      icon: <Cloud className="w-4 h-4" />,
    },
    {
      key: '/folders',
      label: t('nav.folders', '文件夹'),
      icon: <FolderOpen className="w-4 h-4" />,
    },
    {
      key: '/logs',
      label: t('nav.logs', '日志'),
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: '/settings',
      label: t('nav.settings', '设置'),
      icon: <Settings className="w-4 h-4" />,
    },
    {
      key: '/about',
      label: t('nav.about', '关于'),
      icon: <Info className="w-4 h-4" />,
    },
  ];

  return (
    <Navbar className="border-b">
      <NavbarBrand>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
            <span className="text-2xl font-bold">LS</span>
          </div>
          <p className="text-sm text-white/80">LightSync</p>
        </div>
      </NavbarBrand>
      
      <NavbarContent className="hidden md:flex">
        <NavbarMenu className="hidden md:flex">
          {menuItems.map((item) => (
            <NavbarMenuItem key={item.key}>
              <NavbarItem
                isActive={location.pathname === item.key}
                as="a"
                href={item.key}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </NavbarItem>
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
        
        {/* 移动端菜单按钮 */}
        <NavbarMenu className="md:hidden">
          <NavbarMenuItem>
            <NavbarItem
              as="a"
              href="/"
              className="flex items-center space-x-2 px-3 py-2"
            >
              <Home className="w-5 h-5" />
              <span>{t('nav.dashboard', '仪表盘')}</span>
            </NavbarItem>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <NavbarItem
              as="a"
              href="/servers"
              className="flex items-center space-x-2 px-3 py-2"
            >
              <Cloud className="w-5 h-5" />
              <span>{t('nav.servers', '服务器')}</span>
            </NavbarItem>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <NavbarItem
              as="a"
              href="/folders"
              className="flex items-center space-x-2 px-3 py-2"
            >
              <FolderOpen className="w-5 h-5" />
              <span>{t('nav.folders', '文件夹')}</span>
            </NavbarItem>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <NavbarItem
              as="a"
              href="/logs"
              className="flex items-center space-x-2 px-3 py-2"
            >
              <FileText className="w-5 h-5" />
              <span>{t('nav.logs', '日志')}</span>
            </NavbarItem>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <NavbarItem
              as="a"
              href="/settings"
              className="flex items-center space-x-2 px-3 py-2"
            >
              <Settings className="w-5 h-5" />
              <span>{t('nav.settings', '设置')}</span>
            </NavbarItem>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <NavbarItem
              as="a"
              href="/about"
              className="flex items-center space-x-2 px-3 py-2"
            >
              <Info className="w-5 h-5" />
              <span>{t('nav.about', '关于')}</span>
            </NavbarItem>
          </NavbarMenuItem>
        </NavbarMenu>
      </NavbarContent>
    </Navbar>
  );
};

export default NavigationMenu;