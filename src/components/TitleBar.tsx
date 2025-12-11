import { useState } from 'react'
import WindowControl from './WindowControl'

export const TitleBar = () => {
  const [isDragging, setIsDragging] = useState(false)

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
        <span className='text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-200'>LightSync</span>
      </div>

      {/* 右侧：窗口控制按钮 - 非拖拽区域 */}
      <div className='flex h-full items-center' data-tauri-drag-region='false'>
        <WindowControl />
      </div>
    </div>
  )
}
