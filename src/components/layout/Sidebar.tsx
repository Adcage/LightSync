import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Cloud, FolderOpen, FileText, Settings, Info, LayoutDashboard } from 'lucide-react'
import { Button } from '@nextui-org/react'

interface MenuItem {
  key: string
  label: string
  icon: React.ReactNode
}

const Sidebar: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems: MenuItem[] = [
    {
      key: '/',
      label: t('nav.dashboard', '仪表盘'),
      icon: <LayoutDashboard className='h-6 w-6' />,
    },
    {
      key: '/servers',
      label: t('nav.servers', '服务器管理'),
      icon: <Cloud className='h-6 w-6' />,
    },
    {
      key: '/folders',
      label: t('nav.folders', '同步文件夹'),
      icon: <FolderOpen className='h-6 w-6' />,
    },
    {
      key: '/logs',
      label: t('nav.logs', '同步日志'),
      icon: <FileText className='h-6 w-6' />,
    },
    {
      key: '/settings',
      label: t('nav.settings', '应用设置'),
      icon: <Settings className='h-6 w-6' />,
    },
    {
      key: '/about',
      label: t('nav.about', '关于应用'),
      icon: <Info className='h-6 w-6' />,
    },
  ]

  function getVariant(pathname: string) {
    return location.pathname === pathname ? 'flat' : 'light'
  }

  return (
    <div className='mx-[12px] overflow-y-auto'>
      {menuItems.map(item => (
        <Button
          key={item.key}
          fullWidth
          size='lg'
          variant={getVariant(item.key)}
          className='mb-[5px] justify-start'
          onPress={() => navigate(item.key)}
          startContent={item.icon}
        >
          <div className='w-full text-left'>{item.label}</div>
        </Button>
      ))}
    </div>
  )
}

export default Sidebar
