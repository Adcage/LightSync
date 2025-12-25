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
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
} from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { Cloud, Plus, Edit, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

const ServersPage: React.FC = () => {
  const { t } = useTranslation()
  const [servers, setServers] = useState([
    {
      id: '1',
      name: '坚果云',
      url: 'https://dav.jianguoyun.com/dav/',
      username: 'user@example.com',
      status: 'connected',
      lastTest: '2024-01-15 14:30:25',
    },
    {
      id: '2',
      name: 'NextCloud',
      url: 'https://cloud.example.com/remote.php/dav/files/',
      username: 'alice@example.com',
      status: 'disconnected',
      lastTest: '2024-01-14 09:15:10',
      error: '连接超时',
    },
    {
      id: '3',
      name: 'ownCloud',
      url: 'https://owncloud.example.com/remote.php/dav/files/',
      username: 'bob@example.com',
      status: 'connected',
      lastTest: '2024-01-15 10:22:33',
    },
  ])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<any>(null)
  const [testingServer, setTestingServer] = useState<string | null>(null)

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Chip color='success' variant='flat' size='sm' startContent={<CheckCircle className='h-3 w-3' />}>
            {t('servers.connected', '已连接')}
          </Chip>
        )
      case 'disconnected':
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

  const handleTestConnection = async (serverId: string) => {
    setTestingServer(serverId)
    // 模拟测试连接
    setTimeout(() => {
      setTestingServer(null)
      // 这里会调用实际的测试连接API
    }, 2000)
  }

  const handleDeleteServer = (serverId: string) => {
    if (window.confirm(t('servers.confirmDelete', '确定要删除这个服务器配置吗？'))) {
      setServers(servers.filter(s => s.id !== serverId))
    }
  }

  const handleEditServer = (server: any) => {
    setEditingServer(server)
    setIsEditModalOpen(true)
  }

  const handleSaveServer = (serverData: any) => {
    if (editingServer) {
      // 编辑现有服务器
      setServers(servers.map(s => (s.id === editingServer.id ? { ...s, ...serverData } : s)))
    } else {
      // 添加新服务器
      const newServer = {
        ...serverData,
        id: Date.now().toString(),
        status: 'disconnected',
        lastTest: new Date().toISOString(),
      }
      setServers([...servers, newServer])
    }
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setEditingServer(null)
  }

  const ServerForm = ({ server, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState(
      server || {
        name: '',
        url: '',
        username: '',
        password: '',
        timeout: 30,
      }
    )

    return (
      <ModalContent>
        <ModalHeader className='flex flex-col gap-1'>
          {server ? t('servers.editServer', '编辑服务器') : t('servers.addServer', '添加服务器')}
        </ModalHeader>
        <ModalBody>
          <div className='space-y-4'>
            <Input
              label={t('servers.serverName', '服务器名称')}
              placeholder={t('servers.serverNamePlaceholder', '例如：坚果云')}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              isRequired
            />

            <Input
              label={t('servers.webdavUrl', 'WebDAV URL')}
              placeholder='https://dav.example.com/dav/'
              value={formData.url}
              onChange={e => setFormData({ ...formData, url: e.target.value })}
              isRequired
              description={t('servers.urlDescription', '请输入完整的WebDAV地址，包含协议和路径')}
            />

            <Input
              label={t('servers.username', '用户名')}
              placeholder='user@example.com'
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              isRequired
            />

            <Input
              label={t('servers.password', '密码')}
              type='password'
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              isRequired
            />

            <Input
              label={t('servers.timeout', '连接超时（秒）')}
              type='number'
              value={formData.timeout.toString()}
              onChange={e => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30 })}
              description={t('servers.timeoutDescription', '连接超时时间，默认30秒')}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color='danger' variant='light' onPress={onCancel}>
            {t('common.cancel', '取消')}
          </Button>
          <Button color='primary' onPress={() => onSave(formData)}>
            {t('common.save', '保存')}
          </Button>
        </ModalFooter>
      </ModalContent>
    )
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
                {item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <Cloud className='h-4 w-4 text-blue-500' />
                        <span className='font-medium'>{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono text-sm text-gray-600 dark:text-gray-400'>{item.url}</span>
                    </TableCell>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>{item.lastTest}</span>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        <Button
                          isIconOnly
                          size='sm'
                          color='primary'
                          variant='light'
                          isLoading={testingServer === item.id}
                          onPress={() => handleTestConnection(item.id)}
                        >
                          <RefreshCw className='h-4 w-4' />
                        </Button>

                        <Button
                          isIconOnly
                          size='sm'
                          color='warning'
                          variant='light'
                          onPress={() => handleEditServer(item)}
                        >
                          <Edit className='h-4 w-4' />
                        </Button>

                        <Button
                          isIconOnly
                          size='sm'
                          color='danger'
                          variant='light'
                          onPress={() => handleDeleteServer(item.id)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
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
                {t('servers.addFirstServer', '添加第一个服务器')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 添加服务器模态框 */}
      <Modal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} size='2xl'>
        <ServerForm onSave={handleSaveServer} onCancel={() => setIsAddModalOpen(false)} />
      </Modal>

      {/* 编辑服务器模态框 */}
      <Modal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} size='2xl'>
        <ServerForm
          server={editingServer}
          onSave={handleSaveServer}
          onCancel={() => {
            setIsEditModalOpen(false)
            setEditingServer(null)
          }}
        />
      </Modal>
    </div>
  )
}

export default ServersPage
