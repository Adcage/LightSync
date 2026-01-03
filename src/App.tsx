import { useEffect } from 'react'
import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { AppRouter } from './router'
import Database from '@tauri-apps/plugin-sql'

function App() {
  // 初始化数据库（触发迁移执行）
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const db = await Database.load('sqlite:lightsync.db')
        // 执行一个简单的查询来触发迁移
        await db.select('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1')
        console.log('数据库初始化成功')
      } catch (error) {
        console.error('数据库初始化失败:', error)
      }
    }

    initDatabase()
  }, [])

  return (
    <ErrorBoundary>
      <NextUIProvider>
        <NextThemesProvider attribute='class' defaultTheme='light'>
          <AppRouter />
        </NextThemesProvider>
      </NextUIProvider>
    </ErrorBoundary>
  )
}

export default App
