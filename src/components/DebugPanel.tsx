import React, { useEffect, useState } from 'react'
import { Button, Card, CardBody, CardHeader, Chip, Divider, Switch } from '@nextui-org/react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { isDevelopmentMode } from '../utils/system'

/**
 * 调试面板组件
 * 仅在开发环境显示，用于监控应用性能和调试信息
 */
export const DebugPanel: React.FC = () => {
  const [isDev, setIsDev] = useState<boolean>(false)
  const [logs, setLogs] = useState<string[]>([])
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false)
  const [performanceData, setPerformanceData] = useState<{
    memoryUsage: number
    cpuUsage: number
    renderTime: number
  }>({
    memoryUsage: 0,
    cpuUsage: 0,
    renderTime: 0,
  })

  useEffect(() => {
    checkDevelopmentMode()
    setupEventListeners()
  }, [])

  const checkDevelopmentMode = async () => {
    const devMode = await isDevelopmentMode()
    setIsDev(devMode)
  }

  const setupEventListeners = async () => {
    // 监听配置文件变化事件
    const unlistenConfigChanged = await listen('config-changed', event => {
      addLog(`配置文件变化: ${event.payload}`)
    })

    // 监听配置文件监听器错误
    const unlistenConfigWatcherError = await listen('config-watcher-error', event => {
      addLog(`配置监听器错误: ${event.payload}`)
    })

    // 监听配置文件监听器停止
    const unlistenConfigWatcherStopped = await listen('config-watcher-stopped', event => {
      addLog(`配置监听器停止: ${event.payload}`)
    })

    return () => {
      unlistenConfigChanged()
      unlistenConfigWatcherError()
      unlistenConfigWatcherStopped()
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)])
  }

  const startMonitoring = async () => {
    setIsMonitoring(true)
    addLog('开始性能监控')

    // 定期更新性能数据
    const interval = setInterval(async () => {
      try {
        // 获取内存使用情况（简化版）
        const memoryUsage = Math.random() * 100 // 实际应用中应使用真实API
        const cpuUsage = Math.random() * 50 // 实际应用中应使用真实API
        const renderTime = Math.random() * 16 // 实际应用中应使用真实API

        setPerformanceData({
          memoryUsage: Math.round(memoryUsage),
          cpuUsage: Math.round(cpuUsage),
          renderTime: Math.round(renderTime * 100) / 100,
        })
      } catch (error) {
        addLog(`性能监控错误: ${error}`)
      }
    }, 1000)

    // 保存interval ID以便清理
    ;(window as any).__debugInterval = interval
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    addLog('停止性能监控')

    if ((window as any).__debugInterval) {
      clearInterval((window as any).__debugInterval)
      delete (window as any).__debugInterval
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog('日志已清除')
  }

  const testConfigWatcher = async () => {
    try {
      addLog('测试配置文件监听器...')
      await invoke('start_config_watcher')
      addLog('配置文件监听器启动成功')
    } catch (error) {
      addLog(`配置文件监听器启动失败: ${error}`)
    }
  }

  const stopConfigWatcher = async () => {
    try {
      addLog('停止配置文件监听器...')
      await invoke('stop_config_watcher')
      addLog('配置文件监听器停止成功')
    } catch (error) {
      addLog(`配置文件监听器停止失败: ${error}`)
    }
  }

  if (!isDev) {
    return null
  }

  return (
    <Card className='mx-auto w-full max-w-4xl'>
      <CardHeader className='flex gap-3'>
        <div className='flex flex-col'>
          <h1 className='text-lg font-bold'>调试面板</h1>
          <p className='text-small text-default-500'>应用性能监控和调试信息</p>
        </div>
        <Chip color='warning' variant='flat' size='sm'>
          开发模式
        </Chip>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className='flex flex-col gap-6'>
          {/* 性能监控控制 */}
          <div className='flex items-center gap-4'>
            <Switch
              isSelected={isMonitoring}
              onValueChange={value => {
                if (value) {
                  startMonitoring()
                } else {
                  stopMonitoring()
                }
              }}
            >
              性能监控
            </Switch>
            <Button color='primary' variant='flat' size='sm' onClick={clearLogs}>
              清除日志
            </Button>
          </div>

          {/* 性能数据 */}
          {isMonitoring && (
            <div className='grid grid-cols-3 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-blue-500'>{performanceData.memoryUsage}MB</div>
                <div className='text-sm text-default-500'>内存使用</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-500'>{performanceData.cpuUsage}%</div>
                <div className='text-sm text-default-500'>CPU使用</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-orange-500'>{performanceData.renderTime}ms</div>
                <div className='text-sm text-default-500'>渲染时间</div>
              </div>
            </div>
          )}

          {/* 测试按钮 */}
          <div className='flex gap-2'>
            <Button color='success' variant='flat' size='sm' onClick={testConfigWatcher}>
              测试配置监听器
            </Button>
            <Button color='danger' variant='flat' size='sm' onClick={stopConfigWatcher}>
              停止配置监听器
            </Button>
          </div>

          {/* 日志输出 */}
          <div className='flex flex-col gap-2'>
            <h3 className='text-sm font-medium'>日志输出</h3>
            <div className='h-64 overflow-auto rounded-lg bg-default-100 p-3 dark:bg-default-50'>
              {logs.length === 0 ? (
                <div className='text-sm text-default-400'>暂无日志</div>
              ) : (
                <div className='space-y-1'>
                  {logs.map((log, index) => (
                    <div key={index} className='font-mono text-xs text-default-700 dark:text-default-300'>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
