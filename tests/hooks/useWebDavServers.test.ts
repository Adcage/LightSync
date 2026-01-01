/**
 * useWebDavServers Hook 测试
 *
 * 测试 WebDAV 服务器管理 Hook 的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as webdavUtils from '@/utils/webdav'
import type { WebDavServerConfig, AddServerInput, ConnectionTestResult } from '@/utils/webdav'

// Mock webdav utils
vi.mock('@/utils/webdav', () => ({
  addWebDavServer: vi.fn(),
  getWebDavServers: vi.fn(),
  updateWebDavServer: vi.fn(),
  deleteWebDavServer: vi.fn(),
  testWebDavConnection: vi.fn(),
}))

describe('useWebDavServers Hook 测试', () => {
  // 测试数据
  const mockServer: WebDavServerConfig = {
    id: 'test-server-1',
    name: 'Test Server',
    url: 'https://example.com/webdav',
    username: 'testuser',
    useHttps: true,
    timeout: 30,
    lastTestStatus: 'unknown',
    serverType: 'generic',
    enabled: true,
    createdAt: Date.now() / 1000,
    updatedAt: Date.now() / 1000,
  }

  const mockServerInput: AddServerInput = {
    name: 'New Server',
    url: 'https://new.example.com/webdav',
    username: 'newuser',
    password: 'password123',
    useHttps: true,
    timeout: 30,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API 函数调用测试', () => {
    it('应该正确调用 getWebDavServers API', async () => {
      const mockServers = [mockServer]
      vi.mocked(webdavUtils.getWebDavServers).mockResolvedValue(mockServers)

      const result = await webdavUtils.getWebDavServers(false)

      expect(webdavUtils.getWebDavServers).toHaveBeenCalledWith(false)
      expect(result).toEqual(mockServers)
    })

    it('应该正确调用 addWebDavServer API', async () => {
      const newServer = { ...mockServer, id: 'new-server-id' }
      vi.mocked(webdavUtils.addWebDavServer).mockResolvedValue(newServer)

      const result = await webdavUtils.addWebDavServer(mockServerInput)

      expect(webdavUtils.addWebDavServer).toHaveBeenCalledWith(mockServerInput)
      expect(result).toEqual(newServer)
    })

    it('应该正确调用 updateWebDavServer API', async () => {
      const updates = { name: 'Updated Name' }
      const updatedServer = { ...mockServer, ...updates }
      vi.mocked(webdavUtils.updateWebDavServer).mockResolvedValue(updatedServer)

      const result = await webdavUtils.updateWebDavServer(mockServer.id, updates)

      expect(webdavUtils.updateWebDavServer).toHaveBeenCalledWith(mockServer.id, updates)
      expect(result).toEqual(updatedServer)
    })

    it('应该正确调用 deleteWebDavServer API', async () => {
      vi.mocked(webdavUtils.deleteWebDavServer).mockResolvedValue()

      await webdavUtils.deleteWebDavServer(mockServer.id)

      expect(webdavUtils.deleteWebDavServer).toHaveBeenCalledWith(mockServer.id)
    })

    it('应该正确调用 testWebDavConnection API', async () => {
      const mockResult: ConnectionTestResult = {
        success: true,
        message: 'Connection successful',
        serverInfo: {
          serverType: 'nextcloud',
          availableSpace: 1000000,
        },
      }
      vi.mocked(webdavUtils.testWebDavConnection).mockResolvedValue(mockResult)

      const result = await webdavUtils.testWebDavConnection(mockServer.id)

      expect(webdavUtils.testWebDavConnection).toHaveBeenCalledWith(mockServer.id)
      expect(result).toEqual(mockResult)
    })
  })

  describe('错误处理测试', () => {
    it('应该处理 getWebDavServers 错误', async () => {
      const error = new Error('Failed to fetch servers')
      vi.mocked(webdavUtils.getWebDavServers).mockRejectedValue(error)

      await expect(webdavUtils.getWebDavServers(false)).rejects.toThrow('Failed to fetch servers')
    })

    it('应该处理 addWebDavServer 错误', async () => {
      const error = new Error('Failed to add server')
      vi.mocked(webdavUtils.addWebDavServer).mockRejectedValue(error)

      await expect(webdavUtils.addWebDavServer(mockServerInput)).rejects.toThrow('Failed to add server')
    })

    it('应该处理 updateWebDavServer 错误', async () => {
      const error = new Error('Failed to update server')
      vi.mocked(webdavUtils.updateWebDavServer).mockRejectedValue(error)

      await expect(webdavUtils.updateWebDavServer(mockServer.id, { name: 'New Name' })).rejects.toThrow(
        'Failed to update server'
      )
    })

    it('应该处理 deleteWebDavServer 错误', async () => {
      const error = new Error('Server is in use')
      vi.mocked(webdavUtils.deleteWebDavServer).mockRejectedValue(error)

      await expect(webdavUtils.deleteWebDavServer(mockServer.id)).rejects.toThrow('Server is in use')
    })

    it('应该处理 testWebDavConnection 错误', async () => {
      const error = new Error('Connection test failed')
      vi.mocked(webdavUtils.testWebDavConnection).mockRejectedValue(error)

      await expect(webdavUtils.testWebDavConnection(mockServer.id)).rejects.toThrow('Connection test failed')
    })
  })

  describe('CRUD 操作测试', () => {
    it('应该支持添加多个服务器', async () => {
      const server1 = { ...mockServer, id: 'server-1', name: 'Server 1' }
      const server2 = { ...mockServer, id: 'server-2', name: 'Server 2' }

      vi.mocked(webdavUtils.addWebDavServer).mockResolvedValueOnce(server1).mockResolvedValueOnce(server2)

      const result1 = await webdavUtils.addWebDavServer({ ...mockServerInput, name: 'Server 1' })
      const result2 = await webdavUtils.addWebDavServer({ ...mockServerInput, name: 'Server 2' })

      expect(result1.id).toBe('server-1')
      expect(result2.id).toBe('server-2')
      expect(webdavUtils.addWebDavServer).toHaveBeenCalledTimes(2)
    })

    it('应该支持更新服务器的多个字段', async () => {
      const updates = {
        name: 'Updated Name',
        url: 'https://updated.example.com/webdav',
        timeout: 60,
      }
      const updatedServer = { ...mockServer, ...updates }
      vi.mocked(webdavUtils.updateWebDavServer).mockResolvedValue(updatedServer)

      const result = await webdavUtils.updateWebDavServer(mockServer.id, updates)

      expect(result.name).toBe(updates.name)
      expect(result.url).toBe(updates.url)
      expect(result.timeout).toBe(updates.timeout)
    })

    it('应该支持只更新密码', async () => {
      const updates = { password: 'new-password' }
      vi.mocked(webdavUtils.updateWebDavServer).mockResolvedValue(mockServer)

      await webdavUtils.updateWebDavServer(mockServer.id, updates)

      expect(webdavUtils.updateWebDavServer).toHaveBeenCalledWith(mockServer.id, updates)
    })

    it('应该支持筛选启用的服务器', async () => {
      const enabledServers = [mockServer]
      vi.mocked(webdavUtils.getWebDavServers).mockResolvedValue(enabledServers)

      const result = await webdavUtils.getWebDavServers(true)

      expect(webdavUtils.getWebDavServers).toHaveBeenCalledWith(true)
      expect(result).toEqual(enabledServers)
    })
  })

  describe('连接测试功能测试', () => {
    it('应该返回成功的连接测试结果', async () => {
      const successResult: ConnectionTestResult = {
        success: true,
        message: 'Connection successful',
        serverInfo: {
          serverType: 'nextcloud',
          availableSpace: 5000000000,
        },
      }
      vi.mocked(webdavUtils.testWebDavConnection).mockResolvedValue(successResult)

      const result = await webdavUtils.testWebDavConnection(mockServer.id)

      expect(result.success).toBe(true)
      expect(result.serverInfo).toBeDefined()
      expect(result.serverInfo?.serverType).toBe('nextcloud')
    })

    it('应该返回失败的连接测试结果', async () => {
      const failureResult: ConnectionTestResult = {
        success: false,
        message: 'Authentication failed',
      }
      vi.mocked(webdavUtils.testWebDavConnection).mockResolvedValue(failureResult)

      const result = await webdavUtils.testWebDavConnection(mockServer.id)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Authentication failed')
      expect(result.serverInfo).toBeUndefined()
    })

    it('应该处理网络超时错误', async () => {
      const timeoutResult: ConnectionTestResult = {
        success: false,
        message: 'Connection timeout',
      }
      vi.mocked(webdavUtils.testWebDavConnection).mockResolvedValue(timeoutResult)

      const result = await webdavUtils.testWebDavConnection(mockServer.id)

      expect(result.success).toBe(false)
      expect(result.message).toContain('timeout')
    })
  })

  describe('状态管理测试', () => {
    it('应该正确处理空服务器列表', async () => {
      vi.mocked(webdavUtils.getWebDavServers).mockResolvedValue([])

      const result = await webdavUtils.getWebDavServers(false)

      expect(result).toEqual([])
      expect(result.length).toBe(0)
    })

    it('应该正确处理多个服务器', async () => {
      const servers = [
        { ...mockServer, id: 'server-1', name: 'Server 1' },
        { ...mockServer, id: 'server-2', name: 'Server 2' },
        { ...mockServer, id: 'server-3', name: 'Server 3' },
      ]
      vi.mocked(webdavUtils.getWebDavServers).mockResolvedValue(servers)

      const result = await webdavUtils.getWebDavServers(false)

      expect(result.length).toBe(3)
      expect(result[0].id).toBe('server-1')
      expect(result[1].id).toBe('server-2')
      expect(result[2].id).toBe('server-3')
    })
  })

  describe('数据一致性测试', () => {
    it('添加服务器后应该包含所有必需字段', async () => {
      const newServer = {
        ...mockServer,
        id: 'new-id',
        name: mockServerInput.name,
        url: mockServerInput.url,
        username: mockServerInput.username,
      }
      vi.mocked(webdavUtils.addWebDavServer).mockResolvedValue(newServer)

      const result = await webdavUtils.addWebDavServer(mockServerInput)

      expect(result.id).toBeDefined()
      expect(result.name).toBe(mockServerInput.name)
      expect(result.url).toBe(mockServerInput.url)
      expect(result.username).toBe(mockServerInput.username)
      expect(result.useHttps).toBe(mockServerInput.useHttps)
      expect(result.timeout).toBe(mockServerInput.timeout)
      expect(result.lastTestStatus).toBeDefined()
      expect(result.serverType).toBeDefined()
      expect(result.enabled).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
    })

    it('更新服务器后应该保留未更新的字段', async () => {
      const updates = { name: 'Updated Name' }
      const updatedServer = { ...mockServer, ...updates }
      vi.mocked(webdavUtils.updateWebDavServer).mockResolvedValue(updatedServer)

      const result = await webdavUtils.updateWebDavServer(mockServer.id, updates)

      expect(result.name).toBe(updates.name)
      expect(result.url).toBe(mockServer.url) // 未更新的字段应该保留
      expect(result.username).toBe(mockServer.username)
      expect(result.timeout).toBe(mockServer.timeout)
    })
  })
})
