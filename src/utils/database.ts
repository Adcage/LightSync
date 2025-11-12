/**
 * LightSync 数据库操作工具
 *
 * 提供文件元数据和同步日志的 CRUD 操作
 * 使用 @tauri-apps/plugin-sql 直接操作 SQLite 数据库
 */

import Database from '@tauri-apps/plugin-sql'

// 数据库连接单例
let db: Database | null = null

/**
 * 获取数据库连接
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    console.log('Creating database...')
    db = await Database.load('sqlite:lightsync.db')
  }
  return db
}

// ==================== 类型定义 ====================

export interface FileMetadata {
  id?: number
  path: string
  hash?: string
  size: number
  modified_at: number
  synced_at?: number
  sync_folder_id: number
  is_directory: boolean
  status: 'pending' | 'synced' | 'conflict' | 'error'
  created_at?: number
  updated_at?: number
}

export interface SyncLog {
  id?: number
  sync_folder_id: number
  file_path: string
  action: 'upload' | 'download' | 'delete' | 'conflict'
  status: 'success' | 'failed' | 'pending'
  error_message?: string
  file_size?: number
  duration_ms?: number
  created_at?: number
}

export interface SyncSession {
  id?: number
  sync_folder_id: number
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: number
  completed_at?: number
  files_uploaded: number
  files_downloaded: number
  files_deleted: number
  files_conflict: number
  errors_count: number
  total_bytes: number
  error_message?: string
}

export interface DatabaseStats {
  total_files: number
  total_logs: number
  total_sessions: number
  pending_files: number
  synced_files: number
  conflict_files: number
  database_size_bytes: number
}

export interface QueryFilter {
  sync_folder_id?: number
  status?: string
  limit?: number
  offset?: number
}

// ==================== 文件元数据操作 ====================

/**
 * 插入或更新文件元数据
 * 如果文件已存在（基于 sync_folder_id + path），则更新；否则插入
 */
export async function upsertFileMetadata(metadata: FileMetadata): Promise<number> {
  const database = await getDatabase()

  const result = await database.execute(
    `INSERT INTO file_metadata (
      path, hash, size, modified_at, synced_at, 
      sync_folder_id, is_directory, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(sync_folder_id, path) DO UPDATE SET
      hash = excluded.hash,
      size = excluded.size,
      modified_at = excluded.modified_at,
      synced_at = excluded.synced_at,
      is_directory = excluded.is_directory,
      status = excluded.status,
      updated_at = unixepoch()`,
    [
      metadata.path,
      metadata.hash || null,
      metadata.size,
      metadata.modified_at,
      metadata.synced_at || null,
      metadata.sync_folder_id,
      metadata.is_directory ? 1 : 0,
      metadata.status,
    ]
  )

  return result.lastInsertId ?? 0
}

/**
 * 根据 ID 获取文件元数据
 */
export async function getFileMetadata(id: number): Promise<FileMetadata | null> {
  const database = await getDatabase()

  const results = await database.select<FileMetadata[]>('SELECT * FROM file_metadata WHERE id = ?', [id])

  return results.length > 0 ? results[0] : null
}

/**
 * 根据同步文件夹 ID 获取所有文件元数据
 */
export async function getFileMetadataByFolder(syncFolderId: number): Promise<FileMetadata[]> {
  const database = await getDatabase()

  return await database.select<FileMetadata[]>('SELECT * FROM file_metadata WHERE sync_folder_id = ? ORDER BY path', [
    syncFolderId,
  ])
}

/**
 * 根据路径获取文件元数据
 */
export async function getFileMetadataByPath(syncFolderId: number, path: string): Promise<FileMetadata | null> {
  const database = await getDatabase()

  const results = await database.select<FileMetadata[]>(
    'SELECT * FROM file_metadata WHERE sync_folder_id = ? AND path = ?',
    [syncFolderId, path]
  )

  return results.length > 0 ? results[0] : null
}

/**
 * 删除文件元数据
 */
export async function deleteFileMetadata(id: number): Promise<boolean> {
  const database = await getDatabase()

  const result = await database.execute('DELETE FROM file_metadata WHERE id = ?', [id])

  return result.rowsAffected > 0
}

/**
 * 批量更新文件元数据状态
 */
export async function batchUpdateStatus(syncFolderId: number, status: string): Promise<number> {
  const database = await getDatabase()

  const result = await database.execute(
    'UPDATE file_metadata SET status = ?, updated_at = unixepoch() WHERE sync_folder_id = ?',
    [status, syncFolderId]
  )

  return result.rowsAffected
}

// ==================== 同步日志操作 ====================

/**
 * 插入同步日志
 */
export async function insertSyncLog(log: SyncLog): Promise<number> {
  const database = await getDatabase()

  const result = await database.execute(
    `INSERT INTO sync_logs (
      sync_folder_id, file_path, action, status, 
      error_message, file_size, duration_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      log.sync_folder_id,
      log.file_path,
      log.action,
      log.status,
      log.error_message || null,
      log.file_size || null,
      log.duration_ms || null,
    ]
  )

  return result.lastInsertId ?? 0
}

/**
 * 获取同步日志列表
 */
export async function getSyncLogs(filter: QueryFilter = {}): Promise<SyncLog[]> {
  const database = await getDatabase()

  let query = 'SELECT * FROM sync_logs WHERE 1=1'
  const params: any[] = []

  if (filter.sync_folder_id) {
    query += ' AND sync_folder_id = ?'
    params.push(filter.sync_folder_id)
  }

  if (filter.status) {
    query += ' AND status = ?'
    params.push(filter.status)
  }

  query += ' ORDER BY created_at DESC'

  if (filter.limit) {
    query += ' LIMIT ?'
    params.push(filter.limit)
  }

  if (filter.offset) {
    query += ' OFFSET ?'
    params.push(filter.offset)
  }

  return await database.select<SyncLog[]>(query, params)
}

// ==================== 同步会话操作 ====================

/**
 * 创建同步会话
 */
export async function createSyncSession(syncFolderId: number): Promise<number> {
  const database = await getDatabase()

  const result = await database.execute('INSERT INTO sync_sessions (sync_folder_id, status) VALUES (?, ?)', [
    syncFolderId,
    'running',
  ])

  return result.lastInsertId ?? 0
}

/**
 * 更新同步会话
 */
export async function updateSyncSession(session: SyncSession): Promise<boolean> {
  const database = await getDatabase()

  const result = await database.execute(
    `UPDATE sync_sessions SET
      status = ?,
      completed_at = ?,
      files_uploaded = ?,
      files_downloaded = ?,
      files_deleted = ?,
      files_conflict = ?,
      errors_count = ?,
      total_bytes = ?,
      error_message = ?
    WHERE id = ?`,
    [
      session.status,
      session.completed_at || null,
      session.files_uploaded,
      session.files_downloaded,
      session.files_deleted,
      session.files_conflict,
      session.errors_count,
      session.total_bytes,
      session.error_message || null,
      session.id,
    ]
  )

  return result.rowsAffected > 0
}

/**
 * 获取同步会话列表
 */
export async function getSyncSessions(syncFolderId?: number, limit: number = 10): Promise<SyncSession[]> {
  const database = await getDatabase()

  let query = 'SELECT * FROM sync_sessions'
  const params: any[] = []

  if (syncFolderId) {
    query += ' WHERE sync_folder_id = ?'
    params.push(syncFolderId)
  }

  query += ' ORDER BY started_at DESC LIMIT ?'
  params.push(limit)

  return await database.select<SyncSession[]>(query, params)
}

// ==================== 工具函数 ====================

/**
 * 清理旧日志（保留最近 N 天的日志）
 */
export async function cleanupOldLogs(daysToKeep: number): Promise<number> {
  const database = await getDatabase()

  const cutoffTime = Math.floor(Date.now() / 1000) - daysToKeep * 86400

  const result = await database.execute('DELETE FROM sync_logs WHERE created_at < ?', [cutoffTime])

  return result.rowsAffected
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const database = await getDatabase()

  const [filesResult] = await database.select<[{ total: number }]>('SELECT COUNT(*) as total FROM file_metadata')

  const [logsResult] = await database.select<[{ total: number }]>('SELECT COUNT(*) as total FROM sync_logs')

  const [sessionsResult] = await database.select<[{ total: number }]>('SELECT COUNT(*) as total FROM sync_sessions')

  const [pendingResult] = await database.select<[{ total: number }]>(
    "SELECT COUNT(*) as total FROM file_metadata WHERE status = 'pending'"
  )

  const [syncedResult] = await database.select<[{ total: number }]>(
    "SELECT COUNT(*) as total FROM file_metadata WHERE status = 'synced'"
  )

  const [conflictResult] = await database.select<[{ total: number }]>(
    "SELECT COUNT(*) as total FROM file_metadata WHERE status = 'conflict'"
  )

  return {
    total_files: filesResult.total,
    total_logs: logsResult.total,
    total_sessions: sessionsResult.total,
    pending_files: pendingResult.total,
    synced_files: syncedResult.total,
    conflict_files: conflictResult.total,
    database_size_bytes: 0, // SQLite 不容易获取数据库大小
  }
}
