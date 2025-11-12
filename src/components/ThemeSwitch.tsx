import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@nextui-org/react'

export const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // 确保在客户端渲染完成后再设置主题
    const timer = setTimeout(() => {
      setMounted(true)
      setCurrentTheme(theme)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (mounted) {
      setCurrentTheme(theme)
    }
  }, [theme, mounted])

  const handleThemeToggle = () => {
    if (currentTheme) {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
      setTheme(newTheme)
      setCurrentTheme(newTheme)
    }
  }

  // 在服务端渲染或未挂载时显示占位符，避免布局偏移
  if (!mounted || !currentTheme) {
    return (
      <Button
        isIconOnly
        variant='light'
        aria-label='Toggle theme'
        className='text-default-500 opacity-50'
        disabled
      >
        <div className='h-6 w-6' />
      </Button>
    )
  }

  return (
    <Button
      isIconOnly
      variant='light'
      aria-label='Toggle theme'
      onClick={handleThemeToggle}
      className='text-default-500 transition-colors hover:bg-default-100 active:bg-default-200'
    >
      {currentTheme === 'dark' ? (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
          className='h-6 w-6'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591-1.591m5.868 4.227-1.592 1.591M5.25 12H3m4.227-4.773 1.591-1.591m-1.591 5.868-1.591 1.592M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591-1.591m5.868 4.227-1.592 1.591M5.25 12H3m4.227-4.773 1.591-1.591m-1.591 5.868-1.591 1.592'
          />
        </svg>
      ) : (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
          className='h-6 w-6'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'
          />
        </svg>
      )}
    </Button>
  )
}
