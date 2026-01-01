import { VscChromeClose, VscChromeMinimize, VscChromeMaximize, VscChromeRestore } from 'react-icons/vsc'
import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { Button } from '@nextui-org/react'
import { getOsType } from '@/utils/system'

export default function WindowControl() {
  const [isMax, setIsMax] = useState(false)
  const [osType, setOsType] = useState<string>('')

  useEffect(() => {
    const appWindow = getCurrentWindow()

    // 获取操作系统类型
    const initOsType = async () => {
      try {
        const os = await getOsType()
        setOsType(os)
      } catch (error) {
        console.error('获取操作系统类型失败:', error)
        setOsType('unknown')
      }
    }

    initOsType()

    // 监听窗口最大化状态变化
    const unlisten = listen('tauri://resize', async () => {
      if (await appWindow.isMaximized()) {
        setIsMax(true)
      } else {
        setIsMax(false)
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  const appWindow = getCurrentWindow()

  return (
    <div className='flex h-full'>
      <Button
        isIconOnly
        variant='light'
        className='h-[35px] w-[35px] rounded-none hover:bg-gray-200 dark:hover:bg-zinc-700'
        onPress={() => appWindow.minimize()}
      >
        <VscChromeMinimize className='text-[16px]' />
      </Button>
      <Button
        isIconOnly
        variant='light'
        className='h-[35px] w-[35px] rounded-none hover:bg-gray-200 dark:hover:bg-zinc-700'
        onPress={() => {
          if (isMax) {
            appWindow.unmaximize()
          } else {
            appWindow.maximize()
          }
        }}
      >
        {isMax ? <VscChromeRestore className='text-[16px]' /> : <VscChromeMaximize className='text-[16px]' />}
      </Button>
      <Button
        isIconOnly
        variant='light'
        className={`close-button h-[35px] w-[35px] rounded-none hover:bg-red-600 hover:text-white ${
          osType === 'Linux' ? 'rounded-tr-[10px]' : ''
        }`}
        onPress={() => appWindow.close()}
      >
        <VscChromeClose className='text-[16px]' />
      </Button>
    </div>
  )
}
