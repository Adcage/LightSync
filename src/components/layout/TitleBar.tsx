import { useEffect, useState } from 'react'
import { getOsType } from '@/utils/system'
import WindowControl from './WindowControl'

export const TitleBar = () => {
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

  return (
    <div
      className='flex h-[52px] select-none items-center justify-between border-b border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      // @ts-ignore - Tauri 自定义属性
      data-tauri-drag-region
    >
      {/* 左侧：应用图标和标题 - 可拖拽区域 */}
      <div className='flex flex-1 items-center gap-2 px-3'>
        {/* macOS 红绿灯按钮会自动显示在左上角，这里只需要预留空间 */}
        {osType === 'Darwin' && <div className='w-[70px]' />}

        <div className='flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm'>
          L
        </div>
        <span className='text-sm font-medium tracking-wide text-gray-800 dark:text-gray-200'>LightSync</span>
      </div>

      {/* 右侧：窗口控制按钮 - macOS 不显示 */}
      {osType !== 'Darwin' && (
        <div className='flex h-full items-center'>
          <WindowControl />
        </div>
      )}
    </div>
  )
}
