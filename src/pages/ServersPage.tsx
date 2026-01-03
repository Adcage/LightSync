import React, { useState } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Chip,
  Tooltip,
} from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { Cloud, Plus, RefreshCw, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { ServerConfigForm } from '@/components/servers/ServerConfigForm'
import { useWebDavServers } from '@/hooks/useWebDavServers'
import type { WebDavServerConfig, AddServerInput } from '@/utils/webdav'

const ServersPage: React.FC = () => {
  const { t } = useTranslation()

  // 使用真正的 Hook 来管理服务器数据
  const { servers, addServer, updateServer, removeServer, testConnection, loading, error } = useWebDavServers()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<WebDavServerConfig | null>(null)
  const [testingServerId, setTestingServerId] = useState<string | null>(null)

  const handleTestConnection = async (serverId: string) => {
    setTestingServerId(serverId)
    try {
      await testConnection(serverId)
    } catch (error) {
      console.error('测试连接失败:', error)
    } finally {
      setTestingServerId(null)
    }
  }

  const handleDeleteServer = async (serverId: string, serverName: string) => {
    if (window.confirm(t('servers.confirmDelete', { name: serverName }))) {
      try {
        await removeServer(serverId)
      } catch (error) {
        console.error('删除服务器失败:', error)
        alert(
          t('servers.errors.deleteFailed') +
            ': ' +
            (error instanceof Error ? error.message : t('servers.errors.unknown'))
        )
      }
    }
  }

  const handleEditServer = (server: WebDavServerConfig) => {
    setEditingServer(server)
    setIsEditModalOpen(true)
  }

  const handleSaveServer = async (config: AddServerInput, password: string) => {
    try {
      if (editingServer) {
        // 编辑现有服务器
        await updateServer(editingServer.id, {
          name: config.name,
          url: config.url,
          username: config.username,
          useHttps: config.useHttps,
          timeout: config.timeout,
          password: password || undefined,
        })
      } else {
        // 添加新服务器
        await addServer(config)
      }

      setIsAddModalOpen(false)
      setIsEditModalOpen(false)
      setEditingServer(null)
    } catch (error) {
      console.error('保存服务器失败:', error)
      throw error // 让表单组件显示错误
    }
  }

  const handleCancelForm = () => {
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setEditingServer(null)
  }

  const columns = [
    {
      key: 'name',
      label: t('servers.serverName', '服务器名称'),
    },
    {
      key: 'url',
      label: t('servers.webdavUrl', 'WebDAV URL'),
    },
    {
      key: 'username',
      label: t('servers.username', '用户名'),
    },
    {
      key: 'status',
      label: t('servers.status', '状态'),
    },
    {
      key: 'lastTest',
      label: t('servers.lastTest', '最后测试'),
    },
    {
      key: 'actions',
      label: t('servers.actions', '操作'),
    },
  ]

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>{t('servers.title', '服务器管理')}</h1>
        <Button color='primary' startContent={<Plus className='h-4 w-4' />} onPress={() => setIsAddModalOpen(true)}>
          {t('servers.addServer', '添加服务器')}
        </Button>
      </div>

      {/* 显示加载状态 */}
      {loading && (
        <Card className='mb-4'>
          <CardBody>
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
              <span>{t('common.loading', '加载中...')}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 显示错误信息 */}
      {error && (
        <Card className='mb-4 border-danger'>
          <CardBody>
            <div className='text-danger'>
              <p className='font-semibold'>{t('servers.errors.loadFailed', '加载失败')}</p>
              <p className='text-sm'>{error.message}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className='text-xl font-semibold'>{t('servers.serverList', '已配置的服务器')}</h2>
        </CardHeader>
        <CardBody>
          {servers.length > 0 ? (
            <Table aria-label={t('servers.serverList', '服务器列表')}>
              <TableHeader columns={columns}>
                {column => <TableColumn key={column.key}>{column.label}</TableColumn>}
              </TableHeader>
              <TableBody items={servers}>
                {(item: WebDavServerConfig) => (
                  <TableRow key={item.id}>
                    {/* 服务器名称列 */}
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <Cloud className='h-4 w-4 text-blue-500' />
                        <span className='font-medium'>{item.name}</span>
                      </div>
                    </TableCell>

                    {/* WebDAV URL 列 */}
                    <TableCell>
                      <Tooltip content={item.url} placement='bottom' className='max-w-md'>
                        <span className='block max-w-[120px] cursor-help truncate font-mono text-sm text-gray-600 dark:text-gray-400'>
                          {item.url}
                        </span>
                      </Tooltip>
                    </TableCell>

                    {/* 用户名列 */}
                    <TableCell>
                      <span className='text-sm'>{item.username}</span>
                    </TableCell>

                    {/* 连接状态列 */}
                    <TableCell>
                      {item.lastTestStatus === 'success' ? (
                        <Chip
                          color='success'
                          variant='flat'
                          size='sm'
                          startContent={<CheckCircle className='h-3 w-3' />}
                        >
                          {t('servers.connected', '已连接')}
                        </Chip>
                      ) : item.lastTestStatus === 'failed' ? (
                        <Chip color='danger' variant='flat' size='sm' startContent={<XCircle className='h-3 w-3' />}>
                          {t('servers.disconnected', '未连接')}
                        </Chip>
                      ) : (
                        <Chip color='warning' variant='flat' size='sm'>
                          {t('servers.unknown', '未知')}
                        </Chip>
                      )}
                    </TableCell>

                    {/* 最后测试时间列 */}
                    <TableCell>
                      <div className='flex flex-col gap-1'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          {item.lastTestAt
                            ? new Date(item.lastTestAt * 1000).toLocaleString('zh-CN')
                            : t('servers.unknown', '未知')}
                        </span>
                        {item.lastTestError && (
                          <Tooltip content={item.lastTestError} placement='bottom' className='max-w-md'>
                            <p className='max-w-[200px] cursor-help truncate text-xs text-danger'>
                              {item.lastTestError}
                            </p>
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
                            isLoading={testingServerId === item.id}
                            onPress={() => handleTestConnection(item.id)}
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
                            onPress={() => handleEditServer(item)}
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
                            onPress={() => handleDeleteServer(item.id, item.name)}
                            aria-label={t('servers.delete', '删除')}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className='py-12 text-center'>
              <Cloud className='mx-auto mb-4 h-16 w-16 text-gray-400' />
              <h3 className='mb-2 text-lg font-medium text-gray-600 dark:text-gray-400'>
                {t('servers.noServers', '暂无服务器配置')}
              </h3>
              <p className='mb-6 text-gray-500 dark:text-gray-400'>
                {t('servers.addFirstServer', '添加您的第一个WebDAV服务器以开始同步文件')}
              </p>
              <Button
                color='primary'
                size='lg'
                startContent={<Plus className='h-5 w-5' />}
                onPress={() => setIsAddModalOpen(true)}
              >
                {t('servers.addServer', '添加服务器')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 添加服务器模态框 */}
      <Modal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} size='2xl'>
        <ModalContent>
          <ModalHeader className='flex flex-col gap-1'>{t('servers.addServer', '添加服务器')}</ModalHeader>
          <ModalBody>
            <ServerConfigForm mode='add' onSubmit={handleSaveServer} onCancel={handleCancelForm} />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 编辑服务器模态框 */}
      <Modal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} size='2xl'>
        <ModalContent>
          <ModalHeader className='flex flex-col gap-1'>{t('servers.editServer', '编辑服务器')}</ModalHeader>
          <ModalBody>
            {editingServer && (
              <ServerConfigForm
                mode='edit'
                initialData={{
                  name: editingServer.name,
                  url: editingServer.url,
                  username: editingServer.username,
                  useHttps: editingServer.useHttps,
                  timeout: editingServer.timeout,
                }}
                onSubmit={handleSaveServer}
                onCancel={handleCancelForm}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}

export default ServersPage
