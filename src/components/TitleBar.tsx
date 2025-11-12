import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

export const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const appWindow = getCurrentWindow()

  useEffect(() => {
    let unlisten: (() => void) | null = null

    // 监听窗口最大化状态变化
    const setupListener = async () => {
      try {
        unlisten = await appWindow.onResized(async () => {
          try {
            const maximized = await appWindow.isMaximized()
            setIsMaximized(maximized)
          } catch (err) {
            console.error('Error checking maximized state:', err)
          }
        })

        // 初始化状态
        const maximized = await appWindow.isMaximized()
        setIsMaximized(maximized)
      } catch (err) {
        console.error('Error setting up window listener:', err)
      }
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  const handleMinimize = async () => {
    try {
      await appWindow.minimize()
    } catch (err) {
      console.error('Error minimizing window:', err)
    }
  }

  const handleMaximize = async () => {
    try {
      await appWindow.toggleMaximize()
    } catch (err) {
      console.error('Error toggling maximize:', err)
    }
  }

  const handleClose = async () => {
    try {
      await appWindow.close()
    } catch (err) {
      console.error('Error closing window:', err)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // 只在左键点击且不在按钮上时启用拖拽
    if (e.button === 0 && (e.target as HTMLElement).closest('button') === null) {
      setIsDragging(true)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className={`flex h-12 select-none items-center justify-between border-b border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 左侧：应用图标和标题 - 拖拽区域 */}
      <div className='flex flex-1 items-center gap-3 px-4' data-tauri-drag-region>
        <div className='flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 text-sm font-bold text-white shadow-md'>
          L
        </div>
        <span className='text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-200'>
          LightSync
        </span>
      </div>

      {/* 右侧：窗口控制按钮 - 非拖拽区域 */}
      <div className='flex h-full items-center' data-tauri-drag-region='false'>
        <button
          onClick={handleMinimize}
          className='group flex h-full items-center justify-center px-5 transition-all hover:bg-gray-100 focus:outline-none active:bg-gray-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700'
          aria-label='最小化'
          type='button'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100'
          >
            <line x1='6' y1='12' x2='18' y2='12' />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className='group flex h-full items-center justify-center px-5 transition-all hover:bg-gray-100 focus:outline-none active:bg-gray-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700'
          aria-label={isMaximized ? '还原' : '最大化'}
          type='button'
        >
          {isMaximized ? (
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100'
            >
              <rect x='4' y='8' width='12' height='12' rx='2' ry='2' />
              <path d='M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2' />
            </svg>
          ) : (
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100'
            >
              <rect x='6' y='4' width='14' height='14' rx='2' ry='2' />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          className='group flex h-full items-center justify-center px-5 transition-all hover:bg-red-600 focus:outline-none active:bg-red-700'
          aria-label='关闭'
          type='button'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-gray-600 group-hover:text-white dark:text-gray-400'
          >
            <line x1='6' y1='6' x2='18' y2='18' />
            <line x1='6' y1='18' x2='18' y2='6' />
          </svg>
        </button>
      </div>
    </div>
  )
}
