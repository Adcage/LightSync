import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card } from '@nextui-org/react'
import { osType as envOsType } from '../utils/env'

/**
 * 临时调试组件：显示操作系统类型
 */
export const OsTypeDebug: React.FC = () => {
  const [osTypeFromRust, setOsTypeFromRust] = useState<string>('loading...')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchOsType = async () => {
      try {
        const result = await invoke<string>('get_os_type')
        setOsTypeFromRust(result)
      } catch (err) {
        setError(String(err))
      }
    }
    fetchOsType()
  }, [])

  return (
    <Card className='fixed bottom-4 right-4 z-50 bg-yellow-100 p-4 dark:bg-yellow-900'>
      <div className='space-y-2 text-sm'>
        <div className='text-lg font-bold'>🔍 调试信息</div>
        <div>
          <strong>env.ts 中的 osType:</strong>{' '}
          <span className='font-mono text-blue-600 dark:text-blue-400'>
            "{envOsType}" {envOsType === '' && '(空字符串!)'}
          </span>
        </div>
        <div>
          <strong>Rust 返回的 osType:</strong>{' '}
          <span className='font-mono text-green-600 dark:text-green-400'>"{osTypeFromRust}"</span>
        </div>
        <div>
          <strong>条件判断:</strong> osType !== 'Darwin' ={' '}
          <span className='font-mono'>{String(envOsType !== 'Darwin')}</span>
        </div>
        <div>
          <strong>是否显示 WindowControl:</strong>{' '}
          <span className='font-mono'>{envOsType !== 'Darwin' ? '是 ✅' : '否 ❌'}</span>
        </div>
        {error && (
          <div className='text-red-500'>
            <strong>错误:</strong> {error}
          </div>
        )}
      </div>
    </Card>
  )
}
