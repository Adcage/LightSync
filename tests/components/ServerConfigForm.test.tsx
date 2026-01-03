import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ServerConfigForm } from '@/components/servers/ServerConfigForm.tsx'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

// Mock NextUI components
vi.mock('@nextui-org/react', async () => {
  const actual = await vi.importActual('@nextui-org/react')
  return {
    ...actual,
    Input: ({ label, value, onChange, onBlur, isInvalid, errorMessage, isRequired, type, ...props }: any) => (
      <div>
        <label>
          {label}
          {isRequired && <span>*</span>}
        </label>
        <input
          type={type || 'text'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={isInvalid}
          aria-label={label}
          {...props}
        />
        {isInvalid && errorMessage && <span role='alert'>{errorMessage}</span>}
      </div>
    ),
    Button: ({ children, onPress, type, isLoading, isDisabled, ...props }: any) => (
      <button type={type} onClick={onPress} disabled={isDisabled || isLoading} {...props}>
        {isLoading ? 'Loading...' : children}
      </button>
    ),
    Switch: ({ isSelected, onValueChange, ...props }: any) => (
      <input
        type='checkbox'
        checked={isSelected}
        onChange={e => onValueChange(e.target.checked)}
        role='switch'
        {...props}
      />
    ),
  }
})

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>)
}

describe('ServerConfigForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('表单渲染', () => {
    it('应该渲染所有必需字段', () => {
      renderWithI18n(<ServerConfigForm mode='add' onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByLabelText(/Server Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/WebDAV URL/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })

    it('应该预填充编辑模式的数据', () => {
      const initialData = {
        name: 'Test Server',
        url: 'https://dav.example.com',
        username: 'testuser',
        useHttps: true,
        timeout: 60,
      }

      renderWithI18n(
        <ServerConfigForm mode='edit' initialData={initialData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      )

      expect(screen.getByLabelText(/Server Name/i)).toHaveValue('Test Server')
      expect(screen.getByLabelText(/WebDAV URL/i)).toHaveValue('https://dav.example.com')
      expect(screen.getByLabelText(/Username/i)).toHaveValue('testuser')
    })
  })

  describe('表单验证', () => {
    it('应该验证 URL 格式', async () => {
      renderWithI18n(<ServerConfigForm mode='add' onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const urlInput = screen.getByLabelText(/WebDAV URL/i)
      fireEvent.change(urlInput, { target: { value: 'invalid-url' } })
      fireEvent.blur(urlInput)

      await waitFor(() => {
        expect(screen.getByText(/must include http/i)).toBeInTheDocument()
      })
    })
  })

  describe('表单提交', () => {
    it('应该提交有效表单', async () => {
      mockOnSubmit.mockResolvedValue(undefined)

      renderWithI18n(<ServerConfigForm mode='add' onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.change(screen.getByLabelText(/Server Name/i), { target: { value: 'Test' } })
      fireEvent.change(screen.getByLabelText(/WebDAV URL/i), { target: { value: 'https://test.com' } })
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'user' } })
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } })

      fireEvent.click(screen.getByRole('button', { name: /Save/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('应该在提交失败时显示错误', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Test error'))

      renderWithI18n(<ServerConfigForm mode='add' onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.change(screen.getByLabelText(/Server Name/i), { target: { value: 'Test' } })
      fireEvent.change(screen.getByLabelText(/WebDAV URL/i), { target: { value: 'https://test.com' } })
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'user' } })
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } })

      fireEvent.click(screen.getByRole('button', { name: /Save/i }))

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
      })
    })
  })

  describe('用户体验', () => {
    it('应该处理取消操作', () => {
      renderWithI18n(<ServerConfigForm mode='add' onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('应该在表单无效时禁用提交按钮', () => {
      renderWithI18n(<ServerConfigForm mode='add' onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled()
    })
  })
})
