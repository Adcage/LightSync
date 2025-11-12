import React from 'react'
import { Outlet } from 'react-router-dom'
import { TitleBar } from '../components/TitleBar'
import { ThemeSwitch } from '../components/ThemeSwitch'
import LanguageSwitch from '../components/LanguageSwitch'

const MainLayout: React.FC = () => {
  return (
    <div className='flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-gray-100'>
      <TitleBar />
      <div className='fixed right-4 top-14 z-50'>
        <ThemeSwitch />
      </div>
      <div className='fixed right-20 top-14 z-50'>
        <LanguageSwitch />
      </div>
      <main className='flex-1 overflow-auto p-8'>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
