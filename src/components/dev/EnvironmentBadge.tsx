import React from 'react'
import { Chip } from '@nextui-org/react'
import { useEnvironment } from '@/hooks/useEnvironment.ts'

/**
 * 环境徽章组件
 * 显示当前运行环境的徽章
 */
export const EnvironmentBadge: React.FC = () => {
  const { isDev, loading } = useEnvironment()

  if (loading) {
    return (
      <div className='flex items-center gap-2'>
        <div className='h-2 w-2 animate-pulse rounded-full bg-default-300' />
        <span className='text-sm text-default-500'>加载中...</span>
      </div>
    )
  }

  return (
    <Chip color={isDev ? 'warning' : 'success'} variant='flat' size='sm'>
      {isDev ? '开发环境' : '生产环境'}
    </Chip>
  )
}
