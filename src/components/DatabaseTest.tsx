/**
 * 数据库功能测试组件
 * 
 * 用于验证 SQLite 数据库功能是否正常工作
 */

import { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Divider, Code, Chip } from '@nextui-org/react';
import {
  upsertFileMetadata,
  getFileMetadataByFolder,
  insertSyncLog,
  getSyncLogs,
  createSyncSession,
  updateSyncSession,
  getDatabaseStats,
  cleanupOldLogs,
  type FileMetadata,
  type SyncLog,
  type DatabaseStats,
} from '../utils/database';

export default function DatabaseTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // 测试插入文件元数据
  const testInsertFileMetadata = async () => {
    setLoading(true);
    try {
      const metadata: FileMetadata = {
        path: '/test/example.txt',
        hash: 'abc123def456',
        size: 1024,
        modified_at: Math.floor(Date.now() / 1000),
        sync_folder_id: 1,
        is_directory: false,
        status: 'pending',
      };

      const id = await upsertFileMetadata(metadata);
      setResult(`✅ 成功插入文件元数据，ID: ${id}`);
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试查询文件元数据
  const testQueryFileMetadata = async () => {
    setLoading(true);
    try {
      const results = await getFileMetadataByFolder(1);
      setFileMetadata(results);
      setResult(`✅ 查询到 ${results.length} 条文件元数据`);
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试插入同步日志
  const testInsertSyncLog = async () => {
    setLoading(true);
    try {
      const log: SyncLog = {
        sync_folder_id: 1,
        file_path: '/test/example.txt',
        action: 'upload',
        status: 'success',
        file_size: 1024,
        duration_ms: 500,
      };

      const id = await insertSyncLog(log);
      setResult(`✅ 成功插入同步日志，ID: ${id}`);
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试查询同步日志
  const testQuerySyncLogs = async () => {
    setLoading(true);
    try {
      const results = await getSyncLogs({ sync_folder_id: 1, limit: 10 });
      setSyncLogs(results);
      setResult(`✅ 查询到 ${results.length} 条同步日志`);
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试同步会话
  const testSyncSession = async () => {
    setLoading(true);
    try {
      // 创建会话
      const sessionId = await createSyncSession(1);
      
      // 模拟同步完成，更新会话
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = await updateSyncSession({
        id: sessionId,
        sync_folder_id: 1,
        status: 'completed',
        started_at: Math.floor(Date.now() / 1000) - 1,
        completed_at: Math.floor(Date.now() / 1000),
        files_uploaded: 5,
        files_downloaded: 3,
        files_deleted: 1,
        files_conflict: 0,
        errors_count: 0,
        total_bytes: 5120,
      });
      
      setResult(`✅ 同步会话测试成功 (ID: ${sessionId}, 更新: ${success})`);
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试清理旧日志
  const testCleanupLogs = async () => {
    setLoading(true);
    try {
      const deletedCount = await cleanupOldLogs(30);
      setResult(`✅ 清理了 ${deletedCount} 条旧日志`);
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试数据库统计
  const testDatabaseStats = async () => {
    setLoading(true);
    try {
      const statsData = await getDatabaseStats();
      setStats(statsData);
      setResult('✅ 成功获取数据库统计信息');
    } catch (error) {
      setResult(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    setLoading(true);
    setResult('开始运行所有测试...\n\n');
    
    try {
      // 测试1: 插入文件元数据
      await testInsertFileMetadata();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 测试2: 查询文件元数据
      await testQueryFileMetadata();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 测试3: 插入同步日志
      await testInsertSyncLog();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 测试4: 查询同步日志
      await testQuerySyncLogs();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 测试5: 同步会话
      await testSyncSession();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 测试6: 数据库统计
      await testDatabaseStats();
      
      setResult(prev => prev + '\n\n✅ 所有测试完成！');
    } catch (error) {
      setResult(prev => prev + `\n\n❌ 测试失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-col items-start">
          <h1 className="text-2xl font-bold">数据库功能测试</h1>
          <p className="text-sm text-gray-500">测试 SQLite 数据库的基础功能</p>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-4">
            {/* 测试按钮组 */}
            <div className="flex flex-wrap gap-2">
              <Button
                color="primary"
                onClick={testInsertFileMetadata}
                isLoading={loading}
              >
                插入文件元数据
              </Button>
              <Button
                color="primary"
                onClick={testQueryFileMetadata}
                isLoading={loading}
              >
                查询文件元数据
              </Button>
              <Button
                color="secondary"
                onClick={testInsertSyncLog}
                isLoading={loading}
              >
                插入同步日志
              </Button>
              <Button
                color="secondary"
                onClick={testQuerySyncLogs}
                isLoading={loading}
              >
                查询同步日志
              </Button>
              <Button
                color="success"
                onClick={testSyncSession}
                isLoading={loading}
              >
                测试同步会话
              </Button>
              <Button
                color="warning"
                onClick={testCleanupLogs}
                isLoading={loading}
              >
                清理旧日志
              </Button>
              <Button
                color="default"
                onClick={testDatabaseStats}
                isLoading={loading}
              >
                数据库统计
              </Button>
            </div>

            <Divider />

            {/* 运行所有测试 */}
            <Button
              color="danger"
              variant="flat"
              size="lg"
              className="w-full"
              onClick={runAllTests}
              isLoading={loading}
            >
              运行所有测试
            </Button>

            {/* 测试结果 */}
            {result && (
              <div>
                <h3 className="text-lg font-semibold mb-2">测试结果</h3>
                <Code className="w-full p-4 whitespace-pre-wrap">{result}</Code>
              </div>
            )}

            {/* 数据库统计 */}
            {stats && (
              <div>
                <h3 className="text-lg font-semibold mb-2">数据库统计</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Chip color="primary" variant="flat">
                    总文件: {stats.total_files}
                  </Chip>
                  <Chip color="success" variant="flat">
                    已同步: {stats.synced_files}
                  </Chip>
                  <Chip color="warning" variant="flat">
                    待同步: {stats.pending_files}
                  </Chip>
                  <Chip color="danger" variant="flat">
                    冲突: {stats.conflict_files}
                  </Chip>
                  <Chip color="secondary" variant="flat">
                    日志: {stats.total_logs}
                  </Chip>
                  <Chip color="default" variant="flat">
                    会话: {stats.total_sessions}
                  </Chip>
                </div>
              </div>
            )}

            {/* 文件元数据列表 */}
            {fileMetadata.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  文件元数据 ({fileMetadata.length})
                </h3>
                <div className="space-y-2">
                  {fileMetadata.slice(0, 5).map((file) => (
                    <Card key={file.id} className="p-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-mono text-sm">{file.path}</p>
                          <p className="text-xs text-gray-500">
                            大小: {file.size} bytes | 状态: {file.status}
                          </p>
                        </div>
                        <Chip
                          size="sm"
                          color={
                            file.status === 'synced'
                              ? 'success'
                              : file.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {file.status}
                        </Chip>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 同步日志列表 */}
            {syncLogs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  同步日志 ({syncLogs.length})
                </h3>
                <div className="space-y-2">
                  {syncLogs.slice(0, 5).map((log) => (
                    <Card key={log.id} className="p-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-mono text-sm">{log.file_path}</p>
                          <p className="text-xs text-gray-500">
                            {log.action} | {log.file_size} bytes | {log.duration_ms}ms
                          </p>
                        </div>
                        <Chip
                          size="sm"
                          color={
                            log.status === 'success'
                              ? 'success'
                              : log.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {log.status}
                        </Chip>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

