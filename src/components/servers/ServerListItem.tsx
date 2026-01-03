/**
 * ServerListItem 组件
 *
 * 显示单个 WebDAV 服务器的信息和操作按钮
 * 实现 Property 8（敏感信息隐藏）和 Property 9（服务器列表信息完整性）
 */

import React from 'react'
import { Button, Chip, Tooltip, TableCell } from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { Cloud, Edit, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import type { WebDavServerConfig } from '@/utils/webdav.ts'

/**
 * ServerListItem 组件属性
 */
export interface ServerListItemProps {
  /** 服务器配置 */
  server: WebDavServerConfig
  /** 编辑回调 */
  onEdit: (server: WebDavServerConfig) => void
  /** 删除回调 */
  onDelete: (serverId: string) => void
  /** 测试连接回调 */
  onTest: (serverId: string) => void
  /** 是否正在测试连接 */
  isTesting?: boolean
}

/**
 * ServerListItem 组件
 *
 * 显示服务器信息，包括：
 * - 服务器名称和图标
 * - WebDAV URL（截断显示，悬停显示完整）
 * - 用户名
 * - 连接状态（成功/失败/未知）
 * - 最后测试时间和错误信息
 * - 操作按钮（测试连接、编辑、删除）
 *
 * **Property 8: 敏感信息隐藏**
 * - 密码不在组件中显示（WebDavServerConfig 不包含密码字段）
 *
 * **Property 9: 服务器列表信息完整性**
 * - 显示所有必需信息：名称、URL、用户名、连接状态
 *
 * @example
 * ```tsx
 * <ServerListItem
 *   server={serverConfig}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onTest={handleTest}
 *   isTesting={testingServerId === serverConfig.id}
 * />
 * ```
 */
export const ServerListItem: React.FC<ServerListItemProps> = ({
  server,
  onEdit,
  onDelete,
  onTest,
  isTesting = false,
}) => {
  const { t } = useTranslation()

  /**
   * 获取连接状态的 Chip 组件
   * 根据 lastTestStatus 显示不同的状态
   */
  const getStatusChip = () => {
    const status = server.lastTestStatus || 'unknown'

    switch (status) {
      case 'success':
        return (
          <Chip color='success' variant='flat' size='sm' startContent={<CheckCircle className='h-3 w-3' />}>
            {t('servers.connected', '已连接')}
          </Chip>
        )
      case 'failed':
        return (
          <Chip color='danger' variant='flat' size='sm' startContent={<XCircle className='h-3 w-3' />}>
            {t('servers.disconnected', '未连接')}
          </Chip>
        )
      default:
        return (
          <Chip color='warning' variant='flat' size='sm'>
            {t('servers.unknown', '未知')}
          </Chip>
        )
    }
  }

  /**
   * 格式化最后测试时间
   * 将 Unix 时间戳转换为本地时间字符串
   */
  const formatLastTestTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return t('servers.unknown', '未知')
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  return (
    <>
      {/* 服务器名称列 */}
      <TableCell>
        <div className='flex items-center space-x-2'>
          <Cloud className='h-4 w-4 text-blue-500' />
          <span className='font-medium'>{server.name}</span>
        </div>
      </TableCell>

      {/* WebDAV URL 列 */}
      <TableCell>
        <Tooltip content={server.url} placement='bottom' className='max-w-md'>
          <span className='block max-w-[200px] cursor-help truncate font-mono text-sm text-gray-600 dark:text-gray-400'>
            {server.url}
          </span>
        </Tooltip>
      </TableCell>

      {/* 用户名列 */}
      <TableCell>
        <span className='text-sm'>{server.username}</span>
      </TableCell>

      {/* 连接状态列 */}
      <TableCell>{getStatusChip()}</TableCell>

      {/* 最后测试时间列 */}
      <TableCell>
        <div className='flex flex-col gap-1'>
          <span className='text-sm text-gray-600 dark:text-gray-400'>{formatLastTestTime(server.lastTestAt)}</span>
          {server.lastTestError && (
            <Tooltip content={server.lastTestError} placement='bottom' className='max-w-md'>
              <p className='max-w-[200px] cursor-help truncate text-xs text-danger'>{server.lastTestError}</p>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* 操作按钮列 */}
      <TableCell>
        <div className='flex gap-2'>
          <Tooltip content={t('servers.testConnection', '测试连接')} placement='top'>
            <Button
              isIconOnly
              size='sm'
              color='primary'
              variant='light'
              isLoading={isTesting}
              onPress={() => onTest(server.id)}
              aria-label={t('servers.testConnection', '测试连接')}
            >
              <RefreshCw className='h-4 w-4' />
            </Button>
          </Tooltip>

          <Tooltip content={t('servers.edit', '编辑')} placement='top'>
            <Button
              isIconOnly
              size='sm'
              color='warning'
              variant='light'
              onPress={() => onEdit(server)}
              aria-label={t('servers.edit', '编辑')}
            >
              <Edit className='h-4 w-4' />
            </Button>
          </Tooltip>

          <Tooltip content={t('servers.delete', '删除')} placement='top'>
            <Button
              isIconOnly
              size='sm'
              color='danger'
              variant='light'
              onPress={() => onDelete(server.id)}
              aria-label={t('servers.delete', '删除')}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </Tooltip>
        </div>
      </TableCell>
    </>
  )
}
