/**
 * ServerListItem 组件测试
 *
 * 测试服务器列表项组件的显示和交互功能
 * 验证 Property 8（敏感信息隐藏）和 Property 9（服务器列表信息完整性）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { ServerListItem } from '@/components/servers/ServerListItem.tsx'
import type { WebDavServerConfig } from '@/utils/webdav'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}))

// Mock NextUI Table components
vi.mock('@nextui-org/react', async () => {
  const actual = await vi.importActual('@nextui-org/react')
  return {
    ...actual,
    TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  }
})

describe('ServerListItem', () => {
  const mockServer: WebDavServerConfig = {
    id: 'test-server-id',
    name: 'Test Server',
    url: 'https://example.com/webdav',
    username: 'testuser',
    useHttps: true,
    timeout: 30,
    lastTestAt: 1704067200, // 2024-01-01 00:00:00
    lastTestStatus: 'success',
    lastTestError: undefined,
    serverType: 'generic',
    enabled: true,
    createdAt: 1704067200,
    updatedAt: 1704067200,
  }

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onTest: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Property 9: 服务器列表信息完整性', () => {
    it('应该显示服务器名称', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('Test Server')).toBeInTheDocument()
    })

    it('应该显示 WebDAV URL', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('https://example.com/webdav')).toBeInTheDocument()
    })

    it('应该显示用户名', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('应该显示连接状态', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('已连接')).toBeInTheDocument()
    })

    it('应该显示所有必需信息（名称、URL、用户名、状态）', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      // 验证所有必需信息都存在
      expect(screen.getByText('Test Server')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/webdav')).toBeInTheDocument()
      expect(screen.getByText('testuser')).toBeInTheDocument()
      expect(screen.getByText('已连接')).toBeInTheDocument()
    })
  })

  describe('Property 8: 敏感信息隐藏', () => {
    it('不应该显示密码', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      // 验证组件中不包含 "password" 相关文本
      expect(container.textContent).not.toMatch(/password/i)
      expect(container.textContent).not.toMatch(/密码/i)
    })

    it('不应该显示任何敏感信息占位符', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      // 验证不显示密码占位符（如 "****"）
      expect(container.textContent).not.toMatch(/\*\*\*\*/i)
    })
  })

  describe('连接状态显示', () => {
    it('应该显示成功状态', () => {
      const successServer = { ...mockServer, lastTestStatus: 'success' }
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={successServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('已连接')).toBeInTheDocument()
    })

    it('应该显示失败状态', () => {
      const failedServer = { ...mockServer, lastTestStatus: 'failed' }
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={failedServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('未连接')).toBeInTheDocument()
    })

    it('应该显示未知状态', () => {
      const unknownServer = { ...mockServer, lastTestStatus: 'unknown' }
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={unknownServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('未知')).toBeInTheDocument()
    })

    it('应该显示最后测试时间', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      // 验证时间戳被格式化显示（具体格式取决于本地化设置）
      const timeElement = screen.getByText(/2024/)
      expect(timeElement).toBeInTheDocument()
    })

    it('应该显示错误信息（如果存在）', () => {
      const serverWithError = {
        ...mockServer,
        lastTestStatus: 'failed',
        lastTestError: 'Connection timeout',
      }

      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={serverWithError} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('Connection timeout')).toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('应该渲染测试连接按钮', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      const testButton = screen.getByLabelText('测试连接')
      expect(testButton).toBeInTheDocument()
    })

    it('应该渲染编辑按钮', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      const editButton = screen.getByLabelText('编辑')
      expect(editButton).toBeInTheDocument()
    })

    it('应该渲染删除按钮', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      const deleteButton = screen.getByLabelText('删除')
      expect(deleteButton).toBeInTheDocument()
    })

    it('点击测试连接按钮应该调用 onTest', async () => {
      const user = userEvent.setup()

      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      const testButton = screen.getByLabelText('测试连接')
      await user.click(testButton)

      expect(mockHandlers.onTest).toHaveBeenCalledWith('test-server-id')
      expect(mockHandlers.onTest).toHaveBeenCalledTimes(1)
    })

    it('点击编辑按钮应该调用 onEdit', async () => {
      const user = userEvent.setup()

      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      const editButton = screen.getByLabelText('编辑')
      await user.click(editButton)

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockServer)
      expect(mockHandlers.onEdit).toHaveBeenCalledTimes(1)
    })

    it('点击删除按钮应该调用 onDelete', async () => {
      const user = userEvent.setup()

      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      const deleteButton = screen.getByLabelText('删除')
      await user.click(deleteButton)

      expect(mockHandlers.onDelete).toHaveBeenCalledWith('test-server-id')
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1)
    })

    it('测试连接时应该显示加载状态', () => {
      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={mockServer} {...mockHandlers} isTesting={true} />
            </tr>
          </tbody>
        </table>
      )

      const testButton = screen.getByLabelText('测试连接')
      // NextUI Button 的 isLoading 属性会添加 data-loading 属性
      expect(testButton).toHaveAttribute('data-loading', 'true')
    })
  })

  describe('边界情况', () => {
    it('应该处理没有最后测试时间的情况', () => {
      const serverWithoutTestTime = {
        ...mockServer,
        lastTestAt: undefined,
      }

      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={serverWithoutTestTime} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('未知')).toBeInTheDocument()
    })

    it('应该处理没有错误信息的情况', () => {
      const serverWithoutError = {
        ...mockServer,
        lastTestError: undefined,
      }

      const { container } = render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={serverWithoutError} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      // 验证不显示错误信息
      expect(container.textContent).not.toMatch(/error/i)
    })

    it('应该处理长 URL 的截断显示', () => {
      const serverWithLongUrl = {
        ...mockServer,
        url: 'https://very-long-domain-name-that-should-be-truncated.example.com/webdav/path/to/resource',
      }

      render(
        <table>
          <tbody>
            <tr>
              <ServerListItem server={serverWithLongUrl} {...mockHandlers} />
            </tr>
          </tbody>
        </table>
      )

      // URL 应该被截断显示（通过 CSS truncate 类）
      const urlElement = screen.getByText(serverWithLongUrl.url)
      expect(urlElement).toHaveClass('truncate')
    })
  })
})
