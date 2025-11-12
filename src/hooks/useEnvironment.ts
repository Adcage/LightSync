import { useEffect, useState } from 'react'
import { getEnvironmentMode, isDevelopmentMode, isProductionMode } from '../utils/system'

/**
 * 环境模式 Hook
 * 提供当前运行环境的状态信息
 */
export const useEnvironment = () => {
  const [mode, setMode] = useState<string>('')
  const [isDev, setIsDev] = useState<boolean>(false)
  const [isProd, setIsProd] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEnvironment = async () => {
      try {
        setLoading(true)
        setError(null)

        const [envMode, isDevMode, isProdMode] = await Promise.all([
          getEnvironmentMode(),
          isDevelopmentMode(),
          isProductionMode(),
        ])

        setMode(envMode)
        setIsDev(isDevMode)
        setIsProd(isProdMode)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取环境信息失败')
      } finally {
        setLoading(false)
      }
    }

    fetchEnvironment()
  }, [])

  return {
    mode,
    isDev,
    isProd,
    loading,
    error,
  }
}
