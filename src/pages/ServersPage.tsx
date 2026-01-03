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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { Cloud, Plus, RefreshCw } from 'lucide-react'
import { ServerConfigForm } from '@/components/servers/ServerConfigForm.tsx'
import { ServerListItem } from '@/components/servers/ServerListItem.tsx'
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

  const handleDeleteServer = async (serverId: string) => {
    if (window.confirm(t('servers.confirmDelete', '确定要删除这个服务器配置吗？'))) {
      try {
        await removeServer(serverId)
      } catch (error) {
        console.error('删除服务器失败:', error)
        alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'))
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
          enabled: config.enabled,
          password: password || undefined,
        })
      } else {
        // 添加新服务器
        await addServer({
          ...config,
          password: password,
        })
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
              <span>加载中...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 显示错误信息 */}
      {error && (
        <Card className='mb-4 border-danger'>
          <CardBody>
            <div className='text-danger'>
              <p className='font-semibold'>加载失败</p>
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
                    <ServerListItem
                      server={item}
                      onEdit={handleEditServer}
                      onDelete={handleDeleteServer}
                      onTest={handleTestConnection}
                      isTesting={testingServerId === item.id}
                    />
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
            <ServerConfigForm
              mode='edit'
              initialData={
                editingServer
                  ? {
                      name: editingServer.name,
                      url: editingServer.url,
                      username: editingServer.username,
                      useHttps: true,
                      timeout: 30,
                    }
                  : undefined
              }
              onSubmit={handleSaveServer}
              onCancel={handleCancelForm}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}

export default ServersPage
