import React from 'react'
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link } from '@nextui-org/react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Cloud, FolderOpen, FileText, Settings, Info } from 'lucide-react'

const NavigationMenu: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      label: t('nav.dashboard', '仪表盘'),
      icon: <LayoutDashboard className='h-4 w-4' />,
    },
    {
      key: '/servers',
      label: t('nav.servers', '服务器'),
      icon: <Cloud className='h-4 w-4' />,
    },
    {
      key: '/folders',
      label: t('nav.folders', '文件夹'),
      icon: <FolderOpen className='h-4 w-4' />,
    },
    {
      key: '/logs',
      label: t('nav.logs', '日志'),
      icon: <FileText className='h-4 w-4' />,
    },
    {
      key: '/settings',
      label: t('nav.settings', '设置'),
      icon: <Settings className='h-4 w-4' />,
    },
    {
      key: '/about',
      label: t('nav.about', '关于'),
      icon: <Info className='h-4 w-4' />,
    },
  ]

  return (
    <Navbar isBordered maxWidth='full'>
      <NavbarBrand>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600'>
            <span className='text-lg font-bold text-white'>LS</span>
          </div>
          <p className='font-semibold text-foreground'>LightSync</p>
        </div>
      </NavbarBrand>

      <NavbarContent className='hidden gap-4 md:flex' justify='center'>
        {menuItems.map(item => (
          <NavbarItem key={item.key} isActive={location.pathname === item.key}>
            <Link
              color={location.pathname === item.key ? 'primary' : 'foreground'}
              href={item.key}
              className='flex items-center gap-2'
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>
    </Navbar>
  )
}

export default NavigationMenu
