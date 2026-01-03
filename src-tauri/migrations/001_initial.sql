-- LightSync 初始数据库架构
-- Version: 1.0
-- Description: 创建文件元数据表和同步日志表
-- SQLite 版本

-- 文件元数据表
-- 记录所有同步文件的元数据信息
CREATE TABLE IF NOT EXISTS file_metadata
(
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    path           TEXT    NOT NULL,
    hash           TEXT,
    size           INTEGER NOT NULL DEFAULT 0,
    modified_at    INTEGER NOT NULL,
    synced_at      INTEGER,
    sync_folder_id INTEGER NOT NULL,
    is_directory   INTEGER NOT NULL DEFAULT 0,
    status         TEXT    NOT NULL DEFAULT 'pending',
    created_at     INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'now')),
    updated_at     INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'now')),
    is_delete      INTEGER          DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_sync_folder_path ON file_metadata (sync_folder_id, path);
CREATE INDEX IF NOT EXISTS idx_file_metadata_sync_folder ON file_metadata (sync_folder_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_status ON file_metadata (status);
CREATE INDEX IF NOT EXISTS idx_file_metadata_path ON file_metadata (path);
CREATE INDEX IF NOT EXISTS idx_file_metadata_modified_at ON file_metadata (modified_at);

-- 同步日志表
-- 记录所有同步操作的历史记录
CREATE TABLE IF NOT EXISTS sync_logs
(
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_folder_id INTEGER NOT NULL,
    file_path      TEXT    NOT NULL,
    action         TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'pending',
    error_message  TEXT,
    file_size      INTEGER,
    duration_ms    INTEGER,
    created_at     INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'now')),
    is_delete      INTEGER          DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_folder ON sync_logs (sync_folder_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs (status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_action ON sync_logs (action);

-- 同步会话表
-- 记录每次完整的同步会话信息
CREATE TABLE IF NOT EXISTS sync_sessions
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_folder_id   INTEGER NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'running',
    started_at       INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'now')),
    completed_at     INTEGER,
    files_uploaded   INTEGER NOT NULL DEFAULT 0,
    files_downloaded INTEGER NOT NULL DEFAULT 0,
    files_deleted    INTEGER NOT NULL DEFAULT 0,
    files_conflict   INTEGER NOT NULL DEFAULT 0,
    errors_count     INTEGER NOT NULL DEFAULT 0,
    total_bytes      INTEGER NOT NULL DEFAULT 0,
    error_message    TEXT,
    is_delete        INTEGER          DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_sync_folder ON sync_sessions (sync_folder_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_started_at ON sync_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_status ON sync_sessions (status);
