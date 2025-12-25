import React from 'react'
import { Card, CardBody, CardHeader, Button, Progress } from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { Cloud, FolderOpen, Activity, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

const DashboardPage: React.FC = () => {
  const { t } = useTranslation()

  // 模拟数据 - 后续会从实际状态获取
  const syncStats = {
    lastSync: '2分钟前',
    activeTasks: 2,
    todayUploads: 15,
    todayDownloads: 8,
    uploadSize: '2.3MB',
    downloadSize: '1.1MB',
    errors: 0,
  }

  const syncFolders = [
    {
      id: '1',
      name: 'Documents',
      localPath: '/Users/alice/Documents',
      remotePath: '/cloud/docs',
      status: 'success',
      lastSync: '2分钟前',
      fileCount: 156,
    },
    {
      id: '2',
      name: 'Pictures',
      localPath: '/Users/alice/Pictures',
      remotePath: '/cloud/photos',
      status: 'syncing',
      progress: 45,
      estimatedTime: '约2分钟',
    },
    {
      id: '3',
      name: 'Downloads',
      localPath: '/Users/alice/Downloads',
      remotePath: '/cloud/downloads',
      status: 'error',
      error: '网络连接超时',
      retryCount: 3,
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'syncing':
        return <Activity className='h-4 w-4 animate-pulse text-blue-500' />
      case 'error':
        return <AlertCircle className='h-4 w-4 text-red-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-500' />
    }
  }

  const getStatusText = (folder: any) => {
    switch (folder.status) {
      case 'success':
        return `${t('dashboard.lastSync', { time: folder.lastSync })}`
      case 'syncing':
        return `${t('dashboard.syncing')} ${folder.progress}% - ${t('dashboard.remainingTime', { time: folder.estimatedTime })}`
      case 'error':
        return `${t('dashboard.lastError', { error: folder.error })} (${t('dashboard.retryCount', { count: folder.retryCount })})`
      default:
        return t('dashboard.unknown')
    }
  }

  return (
    <div className='mx-auto max-w-6xl space-y-6 p-6'>
      <h1 className='mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100'>{t('dashboard.title', '仪表盘')}</h1>

      {/* 同步状态总览 */}
      <Card className='mb-6'>
        <CardHeader>
          <h2 className='text-xl font-semibold'>{t('dashboard.syncOverview', '同步状态总览')}</h2>
        </CardHeader>
        <CardBody>
          <div className='grid grid-cols-2 gap-6 md:grid-cols-4'>
            <div className='rounded-lg bg-gray-50 p-4 text-center dark:bg-zinc-800'>
              <Clock className='mx-auto mb-2 h-8 w-8 text-blue-500' />
              <p className='mb-1 text-sm text-gray-600 dark:text-gray-400'>{t('dashboard.lastSync', '最后同步')}</p>
              <p className='text-lg font-semibold'>{syncStats.lastSync}</p>
            </div>

            <div className='rounded-lg bg-gray-50 p-4 text-center dark:bg-zinc-800'>
              <Activity className='mx-auto mb-2 h-8 w-8 text-orange-500' />
              <p className='mb-1 text-sm text-gray-600 dark:text-gray-400'>{t('dashboard.activeTasks', '活跃任务')}</p>
              <p className='text-lg font-semibold text-orange-500'>{syncStats.activeTasks}个</p>
            </div>

            <div className='rounded-lg bg-gray-50 p-4 text-center dark:bg-zinc-800'>
              <TrendingUp className='mx-auto mb-2 h-8 w-8 text-green-500' />
              <p className='mb-1 text-sm text-gray-600 dark:text-gray-400'>{t('dashboard.todayStats', '今日统计')}</p>
              <p className='font-mono text-sm'>
                {t('dashboard.uploadDownload', {
                  upload: syncStats.todayUploads,
                  download: syncStats.todayDownloads,
                  uploadSize: syncStats.uploadSize,
                  downloadSize: syncStats.downloadSize,
                })}
              </p>
            </div>

            <div className='rounded-lg bg-gray-50 p-4 text-center dark:bg-zinc-800'>
              <AlertCircle className='mx-auto mb-2 h-8 w-8 text-red-500' />
              <p className='mb-1 text-sm text-gray-600 dark:text-gray-400'>{t('dashboard.errors', '错误数量')}</p>
              <p className='text-lg font-semibold text-red-500'>{syncStats.errors}个</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 同步文件夹列表 */}
      <Card className='mb-6'>
        <CardHeader className='flex items-center justify-between'>
          <h2 className='text-xl font-semibold'>{t('dashboard.syncFolders', '同步文件夹')}</h2>
          <div className='flex gap-2'>
            <Button color='primary' size='sm' startContent={<Cloud className='h-4 w-4' />}>
              {t('dashboard.syncAll', '立即全部同步')}
            </Button>
            <Button color='default' size='sm' variant='bordered'>
              {t('dashboard.pauseAll', '暂停全部')}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className='space-y-3'>
            {syncFolders.map(folder => (
              <div
                key={folder.id}
                className='flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800'
              >
                <div className='flex flex-1 items-center space-x-3'>
                  {getStatusIcon(folder.status)}
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2'>
                      <FolderOpen className='h-5 w-5 text-blue-500' />
                      <div>
                        <p className='text-sm font-medium'>📂 {folder.name}</p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {folder.localPath} → {folder.remotePath}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-center space-x-4'>
                  {folder.status === 'syncing' && (
                    <div className='w-24'>
                      <Progress value={folder.progress} color='primary' size='sm' className='max-w-[100px]' />
                    </div>
                  )}

                  <div className='text-right'>
                    <p className='text-sm font-medium'>{getStatusText(folder)}</p>
                    {folder.fileCount && (
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {t('dashboard.fileCount', { count: folder.fileCount })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {syncFolders.length === 0 && (
            <div className='py-8 text-center text-gray-500 dark:text-gray-400'>
              <FolderOpen className='mx-auto mb-4 h-12 w-12 opacity-50' />
              <p>{t('dashboard.noFolders', '暂无同步文件夹')}</p>
              <Button color='primary' className='mt-4' startContent={<FolderOpen className='h-4 w-4' />}>
                {t('dashboard.addFirstFolder', '添加第一个同步文件夹')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <h2 className='text-xl font-semibold'>{t('dashboard.quickActions', '快速操作')}</h2>
        </CardHeader>
        <CardBody>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <Button
              color='primary'
              variant='bordered'
              className='flex h-20 flex-col items-center justify-center space-y-2'
              startContent={<Cloud className='h-6 w-6' />}
            >
              {t('dashboard.addServer', '添加服务器')}
            </Button>

            <Button
              color='success'
              variant='bordered'
              className='flex h-20 flex-col items-center justify-center space-y-2'
              startContent={<FolderOpen className='h-6 w-6' />}
            >
              {t('dashboard.addFolder', '添加文件夹')}
            </Button>

            <Button
              color='secondary'
              variant='bordered'
              className='flex h-20 flex-col items-center justify-center space-y-2'
              startContent={<Activity className='h-6 w-6' />}
            >
              {t('dashboard.viewLogs', '查看日志')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default DashboardPage
