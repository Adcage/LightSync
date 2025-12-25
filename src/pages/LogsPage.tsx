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
  Input,
  Select,
  SelectItem,
  DatePicker,
} from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { FileText, Search, Download, CheckCircle, XCircle, AlertCircle, RefreshCw, Upload } from 'lucide-react'

const LogsPage: React.FC = () => {
  const { t } = useTranslation()
  const [logs] = useState([
    {
      id: '1',
      timestamp: '2024-01-15 14:30:25',
      folderId: '1',
      folderName: 'Documents',
      filePath: '/report.docx',
      action: 'upload',
      status: 'success',
      fileSize: '2.3MB',
      duration: 1250,
    },
    {
      id: '2',
      timestamp: '2024-01-15 14:28:10',
      folderId: '2',
      folderName: 'Pictures',
      filePath: '/vacation/photo.jpg',
      action: 'download',
      status: 'success',
      fileSize: '5.7MB',
      duration: 3420,
    },
    {
      id: '3',
      timestamp: '2024-01-15 13:45:33',
      folderId: '3',
      folderName: 'Projects',
      filePath: '/source.zip',
      action: 'conflict',
      status: 'resolved',
      fileSize: '12.1MB',
      duration: 560,
      conflictResolution: 'local_wins',
    },
    {
      id: '4',
      timestamp: '2024-01-15 12:22:15',
      folderId: '1',
      folderName: 'Documents',
      filePath: '/temp.tmp',
      action: 'ignored',
      status: 'success',
      fileSize: '0B',
      duration: 10,
      ignoreReason: 'matched ignore pattern *.tmp',
    },
    {
      id: '5',
      timestamp: '2024-01-15 11:15:42',
      folderId: '2',
      folderName: 'Pictures',
      filePath: '/large_video.mp4',
      action: 'error',
      status: 'failed',
      fileSize: '850MB',
      duration: 12000,
      errorMessage: '文件大小超过限制 (100MB)',
    },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  const getActionChip = (action: string) => {
    switch (action) {
      case 'upload':
        return (
          <Chip color='success' variant='flat' size='sm' startContent={<Upload className='h-3 w-3' />}>
            {t('logs.upload', '上传')}
          </Chip>
        )
      case 'download':
        return (
          <Chip color='primary' variant='flat' size='sm' startContent={<Download className='h-3 w-3' />}>
            {t('logs.download', '下载')}
          </Chip>
        )
      case 'delete':
        return (
          <Chip color='danger' variant='flat' size='sm'>
            {t('logs.delete', '删除')}
          </Chip>
        )
      case 'conflict':
        return (
          <Chip color='warning' variant='flat' size='sm' startContent={<AlertCircle className='h-3 w-3' />}>
            {t('logs.conflict', '冲突')}
          </Chip>
        )
      case 'ignored':
        return (
          <Chip color='default' variant='flat' size='sm'>
            {t('logs.ignored', '已忽略')}
          </Chip>
        )
      default:
        return (
          <Chip color='secondary' variant='flat' size='sm'>
            {action}
          </Chip>
        )
    }
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Chip color='success' variant='flat' size='sm' startContent={<CheckCircle className='h-3 w-3' />}>
            {t('logs.success', '成功')}
          </Chip>
        )
      case 'failed':
        return (
          <Chip color='danger' variant='flat' size='sm' startContent={<XCircle className='h-3 w-3' />}>
            {t('logs.failed', '失败')}
          </Chip>
        )
      case 'resolved':
        return (
          <Chip color='warning' variant='flat' size='sm' startContent={<AlertCircle className='h-3 w-3' />}>
            {t('logs.resolved', '已解决')}
          </Chip>
        )
      default:
        return (
          <Chip color='default' variant='flat' size='sm'>
            {status}
          </Chip>
        )
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.floor((ms % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  const formatFileSize = (size: string) => {
    return size
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.filePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.folderName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = filterAction === 'all' || log.action === filterAction
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus
    const matchesDate = !filterDate || log.timestamp.startsWith(filterDate)

    return matchesSearch && matchesAction && matchesStatus && matchesDate
  })

  const handleExportLogs = () => {
    // 导出日志功能
    const logText = logs
      .map(
        log =>
          `${log.timestamp}\t${log.folderName}\t${log.action}\t${log.status}\t${log.filePath}\t${log.fileSize}\t${log.duration}ms`
      )
      .join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lightsync_logs_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefreshLogs = () => {
    // 刷新日志功能
    console.log('Refreshing logs...')
  }

  const columns = [
    {
      key: 'timestamp',
      label: t('logs.timestamp', '时间'),
    },
    {
      key: 'folder',
      label: t('logs.folder', '文件夹'),
    },
    {
      key: 'action',
      label: t('logs.action', '操作'),
    },
    {
      key: 'file',
      label: t('logs.file', '文件'),
    },
    {
      key: 'status',
      label: t('logs.status', '状态'),
    },
    {
      key: 'size',
      label: t('logs.size', '大小'),
    },
    {
      key: 'duration',
      label: t('logs.duration', '耗时'),
    },
  ]

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>{t('logs.title', '同步日志')}</h1>
        <div className='flex gap-2'>
          <Button
            color='primary'
            variant='bordered'
            startContent={<RefreshCw className='h-4 w-4' />}
            onPress={handleRefreshLogs}
          >
            {t('logs.refresh', '刷新')}
          </Button>
          <Button
            color='success'
            variant='bordered'
            startContent={<Download className='h-4 w-4' />}
            onPress={handleExportLogs}
          >
            {t('logs.export', '导出')}
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      <Card className='mb-6'>
        <CardBody>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
            <Input
              label={t('logs.search', '搜索')}
              placeholder={t('logs.searchPlaceholder', '搜索文件名或文件夹名...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              startContent={<Search className='h-4 w-4' />}
            />

            <Select
              label={t('logs.filterAction', '操作类型')}
              selectedKeys={[filterAction]}
              onSelectionChange={keys => setFilterAction(String(Array.from(keys)[0]))}
            >
              <SelectItem key='all' value='all'>
                {t('logs.filterAll', '全部')}
              </SelectItem>
              <SelectItem key='upload' value='upload'>
                {t('logs.upload', '上传')}
              </SelectItem>
              <SelectItem key='download' value='download'>
                {t('logs.download', '下载')}
              </SelectItem>
              <SelectItem key='delete' value='delete'>
                {t('logs.delete', '删除')}
              </SelectItem>
              <SelectItem key='conflict' value='conflict'>
                {t('logs.conflict', '冲突')}
              </SelectItem>
              <SelectItem key='ignored' value='ignored'>
                {t('logs.ignored', '已忽略')}
              </SelectItem>
            </Select>

            <Select
              label={t('logs.filterStatus', '状态')}
              selectedKeys={[filterStatus]}
              onSelectionChange={keys => setFilterStatus(String(Array.from(keys)[0]))}
            >
              <SelectItem key='all' value='all'>
                {t('logs.filterAll', '全部')}
              </SelectItem>
              <SelectItem key='success' value='success'>
                {t('logs.success', '成功')}
              </SelectItem>
              <SelectItem key='failed' value='failed'>
                {t('logs.failed', '失败')}
              </SelectItem>
              <SelectItem key='resolved' value='resolved'>
                {t('logs.resolved', '已解决')}
              </SelectItem>
            </Select>

            <DatePicker
              label={t('logs.filterDate', '日期')}
              onChange={date => setFilterDate(date ? date.toString().split('T')[0] : '')}
            />
          </div>
        </CardBody>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <h2 className='text-xl font-semibold'>
            {t('logs.operationHistory', '操作历史')} ({filteredLogs.length} {t('logs.records', '条记录')})
          </h2>
        </CardHeader>
        <CardBody>
          {filteredLogs.length > 0 ? (
            <Table aria-label={t('logs.operationHistory', '操作历史')}>
              <TableHeader columns={columns}>
                {column => <TableColumn key={column.key}>{column.label}</TableColumn>}
              </TableHeader>
              <TableBody items={filteredLogs}>
                {item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className='font-mono text-sm'>{item.timestamp}</span>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <FileText className='h-4 w-4 text-blue-500' />
                        <span>{item.folderName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getActionChip(item.action)}</TableCell>
                    <TableCell>
                      <span className='font-mono text-sm text-gray-600 dark:text-gray-400'>{item.filePath}</span>
                    </TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>
                      <span className='text-sm'>{formatFileSize(item.fileSize)}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono text-sm'>{formatDuration(item.duration)}</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className='py-12 text-center'>
              <FileText className='mx-auto mb-4 h-16 w-16 text-gray-400' />
              <h3 className='mb-2 text-lg font-medium text-gray-600 dark:text-gray-400'>
                {t('logs.noLogs', '暂无日志记录')}
              </h3>
              <p className='text-gray-500 dark:text-gray-400'>
                {t('logs.noLogsDescription', '当您开始同步文件后，操作历史将显示在这里')}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 日志详情模态框 - 可以在点击某行时显示 */}
      {/* 这里可以添加一个模态框来显示详细的日志信息 */}
    </div>
  )
}

export default LogsPage
