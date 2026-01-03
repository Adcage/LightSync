import React, { useEffect, useState } from 'react'
import { Button, Card, CardBody, CardHeader, Chip, Snippet } from '@nextui-org/react'
import { getEnvironmentMode, getRuntimeEnvironment, isDevelopmentMode } from '@/utils/system.ts'

/**
 * 系统信息组件
 * 显示当前运行环境信息
 */
export const SystemInfo: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<string>('')
  const [envMode, setEnvMode] = useState<string>('')
  const [isDev, setIsDev] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSystemInfo()
  }, [])

  const fetchSystemInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const [info, mode, isDevMode] = await Promise.all([
        getRuntimeEnvironment(),
        getEnvironmentMode(),
        isDevelopmentMode(),
      ])

      setEnvInfo(info)
      setEnvMode(mode)
      setIsDev(isDevMode)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取系统信息失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className='mx-auto w-full max-w-2xl'>
      <CardHeader className='flex gap-3'>
        <div className='flex flex-col'>
          <h1 className='text-lg font-bold'>系统信息</h1>
          <p className='text-small text-default-500'>当前运行环境信息</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className='flex flex-col gap-4'>
          <Button color='primary' variant='flat' onClick={fetchSystemInfo} isLoading={loading}>
            刷新系统信息
          </Button>

          {error && <div className='text-sm text-danger'>错误: {error}</div>}

          {envMode && !loading && (
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>运行模式:</p>
              <Chip color={isDev ? 'warning' : 'success'} variant='flat' className='w-fit'>
                {isDev ? '开发环境' : '生产环境'}
              </Chip>
            </div>
          )}

          {envInfo && !loading && (
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>系统信息:</p>
              <Snippet symbol='' variant='bordered' className='w-full'>
                {envInfo}
              </Snippet>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
