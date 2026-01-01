/**
 * WebDAV 工具函数测试
 *
 * 测试 WebDAV 相关的工具函数和验证逻辑
 */

import { describe, it, expect } from 'vitest'
import { isValidUrl, isValidTimeout, formatLastTestTime, getStatusText, getStatusColor } from '@/utils/webdav'

describe('WebDAV 工具函数测试', () => {
  describe('isValidUrl - URL 格式验证', () => {
    it('应该接受有效的 HTTPS URL', () => {
      expect(isValidUrl('https://example.com/webdav')).toBe(true)
      expect(isValidUrl('https://cloud.example.com:8080/dav')).toBe(true)
      expect(isValidUrl('https://192.168.1.100/webdav')).toBe(true)
    })

    it('应该接受有效的 HTTP URL', () => {
      expect(isValidUrl('http://localhost:8080/webdav')).toBe(true)
      expect(isValidUrl('http://example.com/dav')).toBe(true)
    })

    it('应该拒绝无效的 URL 格式', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('   ')).toBe(false)
    })

    it('应该拒绝不包含协议的 URL', () => {
      expect(isValidUrl('example.com/webdav')).toBe(false)
      expect(isValidUrl('www.example.com')).toBe(false)
    })

    it('应该处理包含特殊字符的 URL', () => {
      expect(isValidUrl('https://example.com/webdav/path%20with%20spaces')).toBe(true)
      expect(isValidUrl('https://user:pass@example.com/webdav')).toBe(true)
    })
  })

  describe('isValidTimeout - 超时时间验证', () => {
    it('应该接受有效范围内的超时时间', () => {
      expect(isValidTimeout(1)).toBe(true) // 最小值
      expect(isValidTimeout(30)).toBe(true) // 常用值
      expect(isValidTimeout(300)).toBe(true) // 最大值
      expect(isValidTimeout(150)).toBe(true) // 中间值
    })

    it('应该拒绝小于最小值的超时时间', () => {
      expect(isValidTimeout(0)).toBe(false)
      expect(isValidTimeout(-1)).toBe(false)
      expect(isValidTimeout(-100)).toBe(false)
    })

    it('应该拒绝大于最大值的超时时间', () => {
      expect(isValidTimeout(301)).toBe(false)
      expect(isValidTimeout(500)).toBe(false)
      expect(isValidTimeout(1000)).toBe(false)
    })

    it('应该处理边界值', () => {
      expect(isValidTimeout(0.9)).toBe(false) // 小于 1
      expect(isValidTimeout(1)).toBe(true) // 正好 1
      expect(isValidTimeout(300)).toBe(true) // 正好 300
      expect(isValidTimeout(300.1)).toBe(false) // 大于 300
    })
  })

  describe('formatLastTestTime - 时间格式化', () => {
    it('应该格式化有效的时间戳', () => {
      const timestamp = 1234567890 // 2009-02-13 23:31:30 UTC
      const formatted = formatLastTestTime(timestamp)
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
      expect(formatted).not.toBe('Never')
    })

    it('应该处理 undefined 时间戳', () => {
      expect(formatLastTestTime(undefined)).toBe('Never')
    })

    it('应该处理 0 时间戳', () => {
      expect(formatLastTestTime(0)).toBe('Never')
    })

    it('应该处理当前时间戳', () => {
      const now = Math.floor(Date.now() / 1000)
      const formatted = formatLastTestTime(now)
      expect(formatted).toBeTruthy()
      expect(formatted).not.toBe('Never')
    })
  })

  describe('getStatusText - 状态文本获取', () => {
    it('应该返回正确的成功状态文本', () => {
      expect(getStatusText('success')).toBe('Connected')
    })

    it('应该返回正确的失败状态文本', () => {
      expect(getStatusText('failed')).toBe('Failed')
    })

    it('应该返回正确的未知状态文本', () => {
      expect(getStatusText('unknown')).toBe('Not tested')
    })

    it('应该处理空字符串', () => {
      expect(getStatusText('')).toBe('Not tested')
    })

    it('应该处理未识别的状态', () => {
      expect(getStatusText('invalid-status')).toBe('Not tested')
    })
  })

  describe('getStatusColor - 状态颜色获取', () => {
    it('应该返回正确的成功状态颜色', () => {
      expect(getStatusColor('success')).toBe('success')
    })

    it('应该返回正确的失败状态颜色', () => {
      expect(getStatusColor('failed')).toBe('danger')
    })

    it('应该返回正确的未知状态颜色', () => {
      expect(getStatusColor('unknown')).toBe('default')
    })

    it('应该处理空字符串', () => {
      expect(getStatusColor('')).toBe('default')
    })

    it('应该处理未识别的状态', () => {
      expect(getStatusColor('invalid-status')).toBe('default')
    })
  })

  describe('URL 验证边界情况', () => {
    it('应该处理各种端口号', () => {
      expect(isValidUrl('https://example.com:443/webdav')).toBe(true)
      expect(isValidUrl('http://example.com:80/webdav')).toBe(true)
      expect(isValidUrl('https://example.com:8443/webdav')).toBe(true)
      expect(isValidUrl('http://example.com:8080/webdav')).toBe(true)
    })

    it('应该处理 IPv6 地址', () => {
      expect(isValidUrl('http://[::1]/webdav')).toBe(true)
      expect(isValidUrl('https://[2001:db8::1]/webdav')).toBe(true)
    })

    it('应该处理包含查询参数的 URL', () => {
      expect(isValidUrl('https://example.com/webdav?param=value')).toBe(true)
      expect(isValidUrl('https://example.com/webdav?a=1&b=2')).toBe(true)
    })

    it('应该处理包含锚点的 URL', () => {
      expect(isValidUrl('https://example.com/webdav#section')).toBe(true)
    })
  })

  describe('超时时间验证边界情况', () => {
    it('应该处理浮点数', () => {
      expect(isValidTimeout(1.5)).toBe(true)
      expect(isValidTimeout(30.7)).toBe(true)
      expect(isValidTimeout(299.9)).toBe(true)
    })

    it('应该处理非常大的数字', () => {
      expect(isValidTimeout(999999)).toBe(false)
      expect(isValidTimeout(Number.MAX_SAFE_INTEGER)).toBe(false)
    })

    it('应该处理 NaN 和 Infinity', () => {
      expect(isValidTimeout(NaN)).toBe(false)
      expect(isValidTimeout(Infinity)).toBe(false)
      expect(isValidTimeout(-Infinity)).toBe(false)
    })
  })

  describe('时间格式化边界情况', () => {
    it('应该处理负数时间戳', () => {
      const formatted = formatLastTestTime(-1)
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })

    it('应该处理非常大的时间戳', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 // 一年后
      const formatted = formatLastTestTime(futureTimestamp)
      expect(formatted).toBeTruthy()
      expect(formatted).not.toBe('Never')
    })

    it('应该处理 Unix 纪元时间', () => {
      const formatted = formatLastTestTime(0)
      expect(formatted).toBe('Never')
    })
  })
})
