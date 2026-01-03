/**
 * i18n 国际化测试
 *
 * 测试语言切换功能和翻译文本的正确性
 * Property 17: 国际化文本正确性
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import i18n from '@/i18n'

describe('i18n 国际化', () => {
  beforeEach(async () => {
    // 重置为默认语言
    await i18n.changeLanguage('zh_cn')
  })

  describe('语言切换', () => {
    it('应该能够切换到英文', async () => {
      await i18n.changeLanguage('en')
      expect(i18n.language).toBe('en')
    })

    it('应该能够切换到中文', async () => {
      await i18n.changeLanguage('zh_cn')
      expect(i18n.language).toBe('zh_cn')
    })

    it('应该能够在中英文之间切换', async () => {
      await i18n.changeLanguage('en')
      expect(i18n.language).toBe('en')

      await i18n.changeLanguage('zh_cn')
      expect(i18n.language).toBe('zh_cn')
    })
  })

  describe('服务器管理翻译 - 中文', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('zh_cn')
    })

    it('应该正确翻译服务器管理标题', () => {
      expect(i18n.t('servers.title')).toBe('服务器管理')
    })

    it('应该正确翻译添加服务器按钮', () => {
      expect(i18n.t('servers.addServer')).toBe('添加服务器')
    })

    it('应该正确翻译编辑服务器按钮', () => {
      expect(i18n.t('servers.editServer')).toBe('编辑服务器')
    })

    it('应该正确翻译删除服务器按钮', () => {
      expect(i18n.t('servers.deleteServer')).toBe('删除服务器')
    })

    it('应该正确翻译表单字段标签', () => {
      expect(i18n.t('servers.serverName')).toBe('服务器名称')
      expect(i18n.t('servers.webdavUrl')).toBe('WebDAV URL')
      expect(i18n.t('servers.username')).toBe('用户名')
      expect(i18n.t('servers.password')).toBe('密码')
      expect(i18n.t('servers.timeout')).toBe('连接超时（秒）')
      expect(i18n.t('servers.useHttps')).toBe('使用 HTTPS')
    })

    it('应该正确翻译连接状态', () => {
      expect(i18n.t('servers.connected')).toBe('已连接')
      expect(i18n.t('servers.disconnected')).toBe('未连接')
      expect(i18n.t('servers.unknown')).toBe('未知')
    })

    it('应该正确翻译错误消息', () => {
      expect(i18n.t('servers.errors.requiredField')).toBe('此字段为必填项')
      expect(i18n.t('servers.errors.invalidUrl')).toBe('无效的 URL 格式，必须包含 http:// 或 https://')
      expect(i18n.t('servers.errors.timeoutRange')).toBe('超时时间必须在 1-300 秒之间')
      expect(i18n.t('servers.errors.authFailed')).toBe('认证失败，请检查用户名和密码')
      expect(i18n.t('servers.errors.networkError')).toBe('网络连接失败')
      expect(i18n.t('servers.errors.timeout')).toBe('连接超时')
      expect(i18n.t('servers.errors.serverInUse')).toBe('该服务器正在被同步文件夹使用，无法删除')
      expect(i18n.t('servers.errors.unknown')).toBe('未知错误')
    })

    it('应该正确翻译成功消息', () => {
      expect(i18n.t('servers.success.added')).toBe('服务器添加成功')
      expect(i18n.t('servers.success.updated')).toBe('服务器更新成功')
      expect(i18n.t('servers.success.deleted')).toBe('服务器删除成功')
      expect(i18n.t('servers.success.connectionSuccess')).toBe('连接测试成功')
    })

    it('应该正确翻译确认删除对话框（带插值）', () => {
      const result = i18n.t('servers.confirmDelete', { name: '测试服务器' })
      expect(result).toBe('确定要删除服务器 "测试服务器" 吗？')
    })
  })

  describe('服务器管理翻译 - 英文', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en')
    })

    it('应该正确翻译服务器管理标题', () => {
      expect(i18n.t('servers.title')).toBe('Server Management')
    })

    it('应该正确翻译添加服务器按钮', () => {
      expect(i18n.t('servers.addServer')).toBe('Add Server')
    })

    it('应该正确翻译编辑服务器按钮', () => {
      expect(i18n.t('servers.editServer')).toBe('Edit Server')
    })

    it('应该正确翻译删除服务器按钮', () => {
      expect(i18n.t('servers.deleteServer')).toBe('Delete Server')
    })

    it('应该正确翻译表单字段标签', () => {
      expect(i18n.t('servers.serverName')).toBe('Server Name')
      expect(i18n.t('servers.webdavUrl')).toBe('WebDAV URL')
      expect(i18n.t('servers.username')).toBe('Username')
      expect(i18n.t('servers.password')).toBe('Password')
      expect(i18n.t('servers.timeout')).toBe('Connection Timeout (seconds)')
      expect(i18n.t('servers.useHttps')).toBe('Use HTTPS')
    })

    it('应该正确翻译连接状态', () => {
      expect(i18n.t('servers.connected')).toBe('Connected')
      expect(i18n.t('servers.disconnected')).toBe('Disconnected')
      expect(i18n.t('servers.unknown')).toBe('Unknown')
    })

    it('应该正确翻译错误消息', () => {
      expect(i18n.t('servers.errors.requiredField')).toBe('This field is required')
      expect(i18n.t('servers.errors.invalidUrl')).toBe('Invalid URL format, must include http:// or https://')
      expect(i18n.t('servers.errors.timeoutRange')).toBe('Timeout must be between 1-300 seconds')
      expect(i18n.t('servers.errors.authFailed')).toBe('Authentication failed, please check username and password')
      expect(i18n.t('servers.errors.networkError')).toBe('Network connection failed')
      expect(i18n.t('servers.errors.timeout')).toBe('Connection timeout')
      expect(i18n.t('servers.errors.serverInUse')).toBe(
        'This server is being used by sync folders and cannot be deleted'
      )
      expect(i18n.t('servers.errors.unknown')).toBe('Unknown error')
    })

    it('应该正确翻译成功消息', () => {
      expect(i18n.t('servers.success.added')).toBe('Server added successfully')
      expect(i18n.t('servers.success.updated')).toBe('Server updated successfully')
      expect(i18n.t('servers.success.deleted')).toBe('Server deleted successfully')
      expect(i18n.t('servers.success.connectionSuccess')).toBe('Connection test successful')
    })

    it('应该正确翻译确认删除对话框（带插值）', () => {
      const result = i18n.t('servers.confirmDelete', { name: 'Test Server' })
      expect(result).toBe('Are you sure you want to delete server "Test Server"?')
    })
  })

  describe('通用翻译', () => {
    it('中文 - 应该正确翻译通用按钮', async () => {
      await i18n.changeLanguage('zh_cn')
      expect(i18n.t('common.ok')).toBe('确定')
      expect(i18n.t('common.cancel')).toBe('取消')
      expect(i18n.t('common.save')).toBe('保存')
      expect(i18n.t('common.loading')).toBe('加载中...')
    })

    it('英文 - 应该正确翻译通用按钮', async () => {
      await i18n.changeLanguage('en')
      expect(i18n.t('common.ok')).toBe('OK')
      expect(i18n.t('common.cancel')).toBe('Cancel')
      expect(i18n.t('common.save')).toBe('Save')
      expect(i18n.t('common.loading')).toBe('Loading...')
    })
  })

  describe('翻译完整性检查', () => {
    it('所有服务器管理相关的键在中英文中都应该存在', async () => {
      const keys = [
        'servers.title',
        'servers.addServer',
        'servers.editServer',
        'servers.deleteServer',
        'servers.serverName',
        'servers.webdavUrl',
        'servers.username',
        'servers.password',
        'servers.timeout',
        'servers.useHttps',
        'servers.connected',
        'servers.disconnected',
        'servers.unknown',
        'servers.status',
        'servers.lastTest',
        'servers.actions',
        'servers.testConnection',
        'servers.testing',
        'servers.edit',
        'servers.delete',
        'servers.confirmDelete',
        'servers.noServers',
        'servers.addFirstServer',
        'servers.emptyState',
        'servers.emptyStateHint',
        'servers.errors.requiredField',
        'servers.errors.invalidUrl',
        'servers.errors.timeoutRange',
        'servers.errors.authFailed',
        'servers.errors.networkError',
        'servers.errors.timeout',
        'servers.errors.serverInUse',
        'servers.errors.unknown',
        'servers.errors.loadFailed',
        'servers.errors.addFailed',
        'servers.errors.updateFailed',
        'servers.errors.deleteFailed',
        'servers.errors.testFailed',
        'servers.success.added',
        'servers.success.updated',
        'servers.success.deleted',
        'servers.success.connectionSuccess',
      ]

      // 检查中文
      await i18n.changeLanguage('zh_cn')
      for (const key of keys) {
        const translation = i18n.t(key)
        expect(translation).not.toBe(key) // 确保不是返回键本身
        expect(translation.length).toBeGreaterThan(0) // 确保有翻译内容
      }

      // 检查英文
      await i18n.changeLanguage('en')
      for (const key of keys) {
        const translation = i18n.t(key)
        expect(translation).not.toBe(key) // 确保不是返回键本身
        expect(translation.length).toBeGreaterThan(0) // 确保有翻译内容
      }
    })
  })
})
