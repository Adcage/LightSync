import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Divider, Card } from '@nextui-org/react'
import { ThemeSwitch } from '../components/ThemeSwitch'
import LanguageSwitch from '../components/LanguageSwitch'
import Sidebar from '../components/Sidebar'
import WindowControl from '../components/WindowControl'
import { getOsType } from '../utils/system'
import logoImage from '../assets/logo.png'

const MainLayout: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const [osType, setOsType] = useState<string>('')

  useEffect(() => {
    const initOsType = async () => {
      try {
        const os = await getOsType()
        setOsType(os)
      } catch (error) {
        console.error('获取操作系统类型失败:', error)
      }
    }
    initOsType()
  }, [])

  // 根据路由获取页面标题
  const getPageTitle = () => {
    const path = location.pathname
    const titleMap: Record<string, string> = {
      '/': t('nav.dashboard', '仪表盘'),
      '/servers': t('nav.servers', '服务器管理'),
      '/folders': t('nav.folders', '同步文件夹'),
      '/logs': t('nav.logs', '同步日志'),
      '/settings': t('nav.settings', '应用设置'),
      '/about': t('nav.about', '关于应用'),
    }
    return titleMap[path] || 'LightSync'
  }

  return (
    <>
      {/* 左侧边栏 - 完整高度 */}
      <Card
        shadow='none'
        className={`float-left h-screen w-[230px] rounded-none border-r-1 border-default-100 bg-content1 ${
          osType === 'Linux' && 'rounded-l-[10px] border-1'
        } cursor-default select-none`}
      >
        {/* 顶部拖拽区域 */}
        <div className='h-[35px] p-[5px]'>
          <div className='h-full w-full' data-tauri-drag-region='true' />
        </div>

        {/* Logo 区域 */}
        <div className='p-[5px]'>
          <div data-tauri-drag-region='true'>
            <img
              alt='LightSync logo'
              src={logoImage}
              className='mx-auto mb-[30px] h-[60px] w-[60px]'
              draggable={false}
            />
          </div>
        </div>

        {/* 侧边栏菜单 */}
        <Sidebar />
      </Card>

      {/* 右侧主内容区域 - 完整高度，左边距为侧边栏宽度 */}
      <div
        className={`ml-[230px] h-screen cursor-default select-none bg-background ${
          osType === 'Linux' && 'rounded-r-[10px] border-1 border-l-0 border-default-100'
        }`}
      >
        {/* 顶部拖拽区域（固定定位，覆盖在标题栏上方） */}
        <div data-tauri-drag-region='true' className='fixed left-[235px] right-[5px] top-[5px] h-[30px]' />

        {/* 标题栏 */}
        <div className='flex h-[35px] justify-between'>
          <div className='flex items-center'>
            <h2 className='ml-[10px] text-base font-semibold'>{getPageTitle()}</h2>
          </div>

          {/* 右侧工具栏和窗口控制按钮 */}
          <div className='flex items-center gap-2'>
            <div className='mr-2 flex items-center gap-2'>
              <LanguageSwitch />
              <ThemeSwitch />
            </div>
            {osType !== 'Darwin' && <WindowControl />}
          </div>
        </div>

        <Divider />

        {/* 内容区域 */}
        <div
          className={`overflow-y-auto p-[10px] ${osType === 'Linux' ? 'h-[calc(100vh-38px)]' : 'h-[calc(100vh-36px)]'}`}
        >
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default MainLayout
