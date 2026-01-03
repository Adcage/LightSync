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
  Select,
  SelectItem,
  Switch,
  Textarea,
  Tooltip,
} from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Plus, Edit, Trash2, Play, Pause, XCircle, ArrowUpDown } from 'lucide-react'

const SyncFoldersPage: React.FC = () => {
  const { t } = useTranslation()
  const [folders, setFolders] = useState([
    {
      id: '1',
      name: 'Documents',
      localPath: '/Users/alice/Documents',
      remotePath: '/documents',
      serverId: '1',
      serverName: '坚果云',
      syncDirection: 'both',
      syncInterval: 15,
      conflictResolution: 'ask_user',
      status: 'active',
      lastSync: '2024-01-15 14:30:25',
      fileCount: 156,
      totalSize: '2.3GB',
      enabled: true,
    },
    {
      id: '2',
      name: 'Pictures',
      localPath: '/Users/alice/Pictures',
      remotePath: '/photos',
      serverId: '1',
      serverName: '坚果云',
      syncDirection: 'upload_only',
      syncInterval: 30,
      conflictResolution: 'local_wins',
      status: 'paused',
      lastSync: '2024-01-14 09:15:10',
      fileCount: 342,
      totalSize: '5.7GB',
      enabled: false,
    },
    {
      id: '3',
      name: 'Projects',
      localPath: '/Users/alice/Projects',
      remotePath: '/projects',
      serverId: '2',
      serverName: 'NextCloud',
      syncDirection: 'both',
      syncInterval: 5,
      conflictResolution: 'keep_both',
      status: 'error',
      lastSync: '2024-01-13 16:22:33',
      error: '网络连接超时',
      fileCount: 89,
      totalSize: '1.2GB',
      enabled: true,
    },
  ])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<any>(null)

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Chip color='success' variant='flat' size='sm' startContent={<Play className='h-3 w-3' />}>
            {t('folders.active', '同步中')}
          </Chip>
        )
      case 'paused':
        return (
          <Chip color='warning' variant='flat' size='sm' startContent={<Pause className='h-3 w-3' />}>
            {t('folders.paused', '已暂停')}
          </Chip>
        )
      case 'error':
        return (
          <Chip color='danger' variant='flat' size='sm' startContent={<XCircle className='h-3 w-3' />}>
            {t('folders.error', '错误')}
          </Chip>
        )
      default:
        return (
          <Chip color='default' variant='flat' size='sm'>
            {t('folders.unknown', '未知')}
          </Chip>
        )
    }
  }

  const getSyncDirectionText = (direction: string) => {
    switch (direction) {
      case 'both':
        return t('folders.syncDirectionBoth', '双向同步')
      case 'upload_only':
        return t('folders.syncDirectionUpload', '仅上传')
      case 'download_only':
        return t('folders.syncDirectionDownload', '仅下载')
      default:
        return t('folders.unknown', '未知')
    }
  }

  const getConflictResolutionText = (resolution: string) => {
    switch (resolution) {
      case 'ask_user':
        return t('folders.conflictAskUser', '询问用户')
      case 'local_wins':
        return t('folders.conflictLocalWins', '本地优先')
      case 'remote_wins':
        return t('folders.conflictRemoteWins', '远程优先')
      case 'keep_both':
        return t('folders.conflictKeepBoth', '保留两者')
      default:
        return t('folders.unknown', '未知')
    }
  }

  const handleSyncNow = (folderId: string) => {
    // 触发立即同步
    console.log('Sync folder:', folderId)
  }

  const handleToggleFolder = (folderId: string) => {
    setFolders(folders.map(f => (f.id === folderId ? { ...f, enabled: !f.enabled } : f)))
  }

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm(t('folders.confirmDelete', '确定要删除这个同步文件夹吗？这将不会删除本地或远程文件。'))) {
      setFolders(folders.filter(f => f.id !== folderId))
    }
  }

  const handleEditFolder = (folder: any) => {
    setEditingFolder(folder)
    setIsEditModalOpen(true)
  }

  const handleSaveFolder = (folderData: any) => {
    if (editingFolder) {
      // 编辑现有文件夹
      setFolders(folders.map(f => (f.id === editingFolder.id ? { ...f, ...folderData } : f)))
    } else {
      // 添加新文件夹
      const newFolder = {
        ...folderData,
        id: Date.now().toString(),
        status: 'paused',
        lastSync: new Date().toISOString(),
        fileCount: 0,
        totalSize: '0B',
      }
      setFolders([...folders, newFolder])
    }
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setEditingFolder(null)
  }

  const FolderForm = ({ folder, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState(
      folder || {
        name: '',
        localPath: '',
        remotePath: '',
        serverId: '',
        syncDirection: 'both',
        syncInterval: 15,
        conflictResolution: 'ask_user',
        ignorePatterns: ['.DS_Store', 'Thumbs.db', '*.tmp', '.git/'],
        maxFileSize: 100,
      }
    )

    return (
      <ModalContent>
        <ModalHeader className='flex flex-col gap-1'>
          {folder ? t('folders.editFolder', '编辑同步文件夹') : t('folders.addFolder', '添加同步文件夹')}
        </ModalHeader>
        <ModalBody>
          <div className='space-y-4'>
            <Input
              label={t('folders.folderName', '文件夹名称')}
              placeholder={t('folders.folderNamePlaceholder', '例如：Documents')}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              isRequired
            />

            <Input
              label={t('folders.localPath', '本地路径')}
              placeholder='/Users/alice/Documents'
              value={formData.localPath}
              onChange={e => setFormData({ ...formData, localPath: e.target.value })}
              isRequired
              description={t('folders.localPathDescription', '选择要同步的本地文件夹路径')}
              endContent={
                <Button size='sm' variant='light'>
                  {t('folders.browse', '浏览')}
                </Button>
              }
            />

            <Input
              label={t('folders.remotePath', '远程路径')}
              placeholder='/documents'
              value={formData.remotePath}
              onChange={e => setFormData({ ...formData, remotePath: e.target.value })}
              isRequired
              description={t('folders.remotePathDescription', '服务器上的相对路径')}
            />

            <Select
              label={t('folders.server', '服务器')}
              selectedKeys={[formData.serverId]}
              onSelectionChange={keys => setFormData({ ...formData, serverId: Array.from(keys)[0] })}
            >
              <SelectItem key='1' value='1'>
                坚果云
              </SelectItem>
              <SelectItem key='2' value='2'>
                NextCloud
              </SelectItem>
              <SelectItem key='3' value='3'>
                ownCloud
              </SelectItem>
            </Select>

            <Select
              label={t('folders.syncDirection', '同步方向')}
              selectedKeys={[formData.syncDirection]}
              onSelectionChange={keys => setFormData({ ...formData, syncDirection: Array.from(keys)[0] })}
            >
              <SelectItem key='both' value='both'>
                {getSyncDirectionText('both')}
              </SelectItem>
              <SelectItem key='upload_only' value='upload_only'>
                {getSyncDirectionText('upload_only')}
              </SelectItem>
              <SelectItem key='download_only' value='download_only'>
                {getSyncDirectionText('download_only')}
              </SelectItem>
            </Select>

            <Select
              label={t('folders.syncInterval', '同步间隔（分钟）')}
              selectedKeys={[formData.syncInterval.toString()]}
              onSelectionChange={keys =>
                setFormData({ ...formData, syncInterval: parseInt(String(Array.from(keys)[0])) || 15 })
              }
            >
              <SelectItem key='1' value='1'>
                {t('folders.realtime', '实时')}
              </SelectItem>
              <SelectItem key='5' value='5'>
                5 {t('folders.minutes', '分钟')}
              </SelectItem>
              <SelectItem key='15' value='15'>
                15 {t('folders.minutes', '分钟')}
              </SelectItem>
              <SelectItem key='30' value='30'>
                30 {t('folders.minutes', '分钟')}
              </SelectItem>
              <SelectItem key='60' value='60'>
                1 {t('folders.hour', '小时')}
              </SelectItem>
              <SelectItem key='0' value='0'>
                {t('folders.manual', '仅手动')}
              </SelectItem>
            </Select>

            <Select
              label={t('folders.conflictResolution', '冲突解决策略')}
              selectedKeys={[formData.conflictResolution]}
              onSelectionChange={keys => setFormData({ ...formData, conflictResolution: Array.from(keys)[0] })}
            >
              <SelectItem key='ask_user' value='ask_user'>
                {getConflictResolutionText('ask_user')}
              </SelectItem>
              <SelectItem key='local_wins' value='local_wins'>
                {getConflictResolutionText('local_wins')}
              </SelectItem>
              <SelectItem key='remote_wins' value='remote_wins'>
                {getConflictResolutionText('remote_wins')}
              </SelectItem>
              <SelectItem key='keep_both' value='keep_both'>
                {getConflictResolutionText('keep_both')}
              </SelectItem>
            </Select>

            <Textarea
              label={t('folders.ignorePatterns', '忽略规则')}
              placeholder='.DS_Store&#10;Thumbs.db&#10;*.tmp&#10;.git/'
              value={formData.ignorePatterns.join('\n')}
              onChange={e =>
                setFormData({
                  ...formData,
                  ignorePatterns: (e.target as unknown as HTMLTextAreaElement).value
                    .split('\n')
                    .filter((p: string) => p.trim()),
                })
              }
              description={t('folders.ignorePatternsDescription', '每行一个规则，支持glob模式匹配')}
            />

            <Input
              label={t('folders.maxFileSize', '最大文件大小（MB）')}
              type='number'
              value={formData.maxFileSize.toString()}
              onChange={e => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
              description={t('folders.maxFileSizeDescription', '超过此大小的文件不会自动同步')}
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
      label: t('folders.folderName', '文件夹名称'),
    },
    {
      key: 'paths',
      label: t('folders.paths', '路径'),
    },
    {
      key: 'server',
      label: t('folders.server', '服务器'),
    },
    {
      key: 'syncDirection',
      label: t('folders.syncDirection', '同步方向'),
    },
    {
      key: 'status',
      label: t('folders.status', '状态'),
    },
    {
      key: 'lastSync',
      label: t('folders.lastSync', '最后同步'),
    },
    {
      key: 'actions',
      label: t('folders.actions', '操作'),
    },
  ]

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>{t('folders.title', '同步文件夹')}</h1>
        <Button color='primary' startContent={<Plus className='h-4 w-4' />} onPress={() => setIsAddModalOpen(true)}>
          {t('folders.addFolder', '添加同步文件夹')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className='text-xl font-semibold'>{t('folders.folderList', '同步文件夹列表')}</h2>
        </CardHeader>
        <CardBody>
          {folders.length > 0 ? (
            <Table aria-label={t('folders.folderList', '同步文件夹列表')}>
              <TableHeader columns={columns}>
                {column => <TableColumn key={column.key}>{column.label}</TableColumn>}
              </TableHeader>
              <TableBody items={folders}>
                {item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <FolderOpen className='h-4 w-4 text-blue-500' />
                        <span className='font-medium'>{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div className='text-gray-900 dark:text-gray-100'>📁 {item.localPath}</div>
                        <div className='text-gray-500 dark:text-gray-400'>↓</div>
                        <div className='text-gray-900 dark:text-gray-100'>☁️ {item.remotePath}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-1'>
                        <Chip color='primary' variant='flat' size='sm'>
                          {item.serverName}
                        </Chip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color='secondary'
                        variant='flat'
                        size='sm'
                        startContent={<ArrowUpDown className='h-3 w-3' />}
                      >
                        {getSyncDirectionText(item.syncDirection)}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        {getStatusChip(item.status)}
                        <Switch size='sm' isSelected={item.enabled} onValueChange={() => handleToggleFolder(item.id)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>{item.lastSync}</span>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        <Tooltip content={t('folders.syncNow', '立即同步')} placement='top'>
                          <Button
                            isIconOnly
                            size='sm'
                            color='primary'
                            variant='light'
                            isDisabled={!item.enabled}
                            onPress={() => handleSyncNow(item.id)}
                          >
                            <Play className='h-4 w-4' />
                          </Button>
                        </Tooltip>

                        <Tooltip content={t('folders.edit', '编辑')} placement='top'>
                          <Button
                            isIconOnly
                            size='sm'
                            color='warning'
                            variant='light'
                            onPress={() => handleEditFolder(item)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                        </Tooltip>

                        <Tooltip content={t('folders.delete', '删除')} placement='top'>
                          <Button
                            isIconOnly
                            size='sm'
                            color='danger'
                            variant='light'
                            onPress={() => handleDeleteFolder(item.id)}
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
              <FolderOpen className='mx-auto mb-4 h-16 w-16 text-gray-400' />
              <h3 className='mb-2 text-lg font-medium text-gray-600 dark:text-gray-400'>
                {t('folders.noFolders', '暂无同步文件夹')}
              </h3>
              <p className='mb-6 text-gray-500 dark:text-gray-400'>
                {t('folders.addFirstFolder', '添加您的第一个同步文件夹以开始文件同步')}
              </p>
              <Button
                color='primary'
                size='lg'
                startContent={<Plus className='h-5 w-5' />}
                onPress={() => setIsAddModalOpen(true)}
              >
                {t('folders.addFirstFolder', '添加第一个同步文件夹')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 添加文件夹模态框 */}
      <Modal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} size='3xl'>
        <FolderForm onSave={handleSaveFolder} onCancel={() => setIsAddModalOpen(false)} />
      </Modal>

      {/* 编辑文件夹模态框 */}
      <Modal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} size='3xl'>
        <FolderForm
          folder={editingFolder}
          onSave={handleSaveFolder}
          onCancel={() => {
            setIsEditModalOpen(false)
            setEditingFolder(null)
          }}
        />
      </Modal>
    </div>
  )
}

export default SyncFoldersPage
