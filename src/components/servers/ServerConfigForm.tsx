import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, Switch } from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import type { AddServerInput } from '@/utils/webdav.ts'

interface ServerConfigFormProps {
  mode: 'add' | 'edit'
  initialData?: Partial<AddServerInput>
  onSubmit: (config: AddServerInput, password: string) => Promise<void>
  onCancel: () => void
}

interface FormData {
  name: string
  url: string
  username: string
  password: string
  useHttps: boolean
  timeout: number
}

interface FormErrors {
  name?: string
  url?: string
  username?: string
  password?: string
  timeout?: string
}

export const ServerConfigForm: React.FC<ServerConfigFormProps> = ({ mode, initialData, onSubmit, onCancel }) => {
  const { t } = useTranslation()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    url: initialData?.url || '',
    username: initialData?.username || '',
    password: '',
    useHttps: initialData?.useHttps ?? true,
    timeout: initialData?.timeout || 30,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')

  // 自动聚焦到服务器名称输入框 (Requirement 10.1)
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已渲染
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // URL 格式验证函数 (Property 1: URL 格式验证正确性)
  const validateUrl = (url: string): string | undefined => {
    if (!url.trim()) {
      return t('servers.errors.requiredField', '此字段为必填项')
    }

    // 检查是否包含协议
    if (!/^https?:\/\//i.test(url)) {
      return t('servers.errors.invalidUrl', '无效的 URL 格式，必须包含 http:// 或 https://')
    }

    // 使用 URL API 进行更严格的验证
    try {
      const urlObj = new URL(url)
      // 检查是否有有效的主机名
      if (!urlObj.hostname) {
        return t('servers.errors.invalidUrl', '无效的 URL 格式')
      }
    } catch {
      return t('servers.errors.invalidUrl', '无效的 URL 格式')
    }

    return undefined
  }

  // 超时时间范围验证 (Property 19: 超时时间范围验证)
  const validateTimeout = (timeout: number): string | undefined => {
    if (timeout < 1 || timeout > 300) {
      return t('servers.errors.timeoutRange', '超时时间必须在 1-300 秒之间')
    }
    return undefined
  }

  // 必填字段验证
  const validateRequired = (value: string): string | undefined => {
    if (!value.trim()) {
      return t('servers.errors.requiredField', '此字段为必填项')
    }
    return undefined
  }

  // 实时验证 (Property 18: 表单验证实时性)
  const validateField = (name: keyof FormData, value: string | number): string | undefined => {
    switch (name) {
      case 'name':
        return validateRequired(value as string)
      case 'url':
        return validateUrl(value as string)
      case 'username':
        return validateRequired(value as string)
      case 'password':
        // 添加模式下密码必填，编辑模式下可选
        if (mode === 'add') {
          return validateRequired(value as string)
        }
        return undefined
      case 'timeout':
        return validateTimeout(value as number)
      default:
        return undefined
    }
  }

  // 验证所有字段
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    newErrors.name = validateField('name', formData.name)
    newErrors.url = validateField('url', formData.url)
    newErrors.username = validateField('username', formData.username)
    newErrors.password = validateField('password', formData.password)
    newErrors.timeout = validateField('timeout', formData.timeout)

    setErrors(newErrors)

    // 检查是否有任何错误
    return !Object.values(newErrors).some(error => error !== undefined)
  }

  // 处理字段变化
  const handleFieldChange = (name: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    // 实时验证 (Property 18)
    if (touched[name] && typeof value !== 'boolean') {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  // 处理字段失焦
  const handleFieldBlur = (name: keyof FormData) => {
    setTouched(prev => ({ ...prev, [name]: true }))

    // 失焦时验证
    const value = formData[name]
    if (typeof value !== 'boolean') {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  // 处理表单提交 (Requirement 10.2: Enter 键提交)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    // 标记所有字段为已触摸
    setTouched({
      name: true,
      url: true,
      username: true,
      password: true,
      timeout: true,
    })

    // 验证表单
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const { password, ...rest } = formData
      const configData: AddServerInput = {
        ...rest,
        password: password,
      }
      await onSubmit(configData, password)
      // 成功后由父组件处理 (Requirement 10.4)
    } catch (error) {
      // 失败时保持对话框打开并显示错误 (Requirement 10.5)
      console.error('Failed to submit server config:', error)
      setSubmitError(error instanceof Error ? error.message : t('servers.errors.unknown', '未知错误'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Property 20: 表单状态管理 - 所有验证通过时启用提交按钮
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.url.trim() !== '' &&
      formData.username.trim() !== '' &&
      (mode === 'edit' || formData.password.trim() !== '') &&
      formData.timeout >= 1 &&
      formData.timeout <= 300 &&
      !validateUrl(formData.url) &&
      !validateTimeout(formData.timeout)
    )
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      {/* 服务器名称 */}
      <Input
        ref={nameInputRef}
        label={t('servers.serverName', '服务器名称')}
        placeholder={t('servers.serverNamePlaceholder', '例如：坚果云')}
        value={formData.name}
        onChange={e => handleFieldChange('name', e.target.value)}
        onBlur={() => handleFieldBlur('name')}
        isRequired
        isInvalid={touched.name && !!errors.name}
        errorMessage={touched.name && errors.name}
      />

      {/* 服务器 URL */}
      <Input
        label={t('servers.webdavUrl', 'WebDAV URL')}
        placeholder='https://dav.example.com/dav/'
        value={formData.url}
        onChange={e => handleFieldChange('url', e.target.value)}
        onBlur={() => handleFieldBlur('url')}
        isRequired
        isInvalid={touched.url && !!errors.url}
        errorMessage={touched.url && errors.url}
        description={!errors.url ? t('servers.urlDescription', '请输入完整的WebDAV地址，包含协议和路径') : undefined}
      />

      {/* 用户名 */}
      <Input
        label={t('servers.username', '用户名')}
        placeholder='user@example.com'
        value={formData.username}
        onChange={e => handleFieldChange('username', e.target.value)}
        onBlur={() => handleFieldBlur('username')}
        isRequired
        isInvalid={touched.username && !!errors.username}
        errorMessage={touched.username && errors.username}
      />

      {/* 密码 */}
      <Input
        label={t('servers.password', '密码')}
        type='password'
        placeholder={mode === 'edit' ? t('servers.passwordPlaceholder', '留空则不修改') : ''}
        value={formData.password}
        onChange={e => handleFieldChange('password', e.target.value)}
        onBlur={() => handleFieldBlur('password')}
        isRequired={mode === 'add'}
        isInvalid={touched.password && !!errors.password}
        errorMessage={touched.password && errors.password}
      />

      {/* HTTPS 开关 */}
      <div className='flex items-center justify-between py-2'>
        <label className='text-sm font-medium text-foreground'>{t('servers.useHttps', '使用 HTTPS')}</label>
        <Switch isSelected={formData.useHttps} onValueChange={value => handleFieldChange('useHttps', value)} />
      </div>

      {/* 超时时间 */}
      <Input
        label={t('servers.timeout', '连接超时（秒）')}
        type='number'
        value={formData.timeout.toString()}
        onChange={e => handleFieldChange('timeout', parseInt(e.target.value) || 30)}
        onBlur={() => handleFieldBlur('timeout')}
        isInvalid={touched.timeout && !!errors.timeout}
        errorMessage={touched.timeout && errors.timeout}
        description={!errors.timeout ? t('servers.timeoutDescription', '连接超时时间，默认30秒') : undefined}
        min={1}
        max={300}
      />

      {/* 提交错误提示 (Requirement 10.5) */}
      {submitError && (
        <div className='rounded-lg bg-danger-50 p-3 text-sm text-danger dark:bg-danger-50/10'>{submitError}</div>
      )}

      {/* 操作按钮 (Requirement 10.3: 加载状态显示) */}
      <div className='flex justify-end gap-2 pt-4'>
        <Button color='danger' variant='light' onPress={onCancel} isDisabled={isSubmitting}>
          {t('common.cancel', '取消')}
        </Button>
        <Button color='primary' type='submit' isLoading={isSubmitting} isDisabled={!isFormValid() || isSubmitting}>
          {t('common.save', '保存')}
        </Button>
      </div>
    </form>
  )
}
