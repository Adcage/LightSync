-- LightSync 初始数据库架构
-- Version: 1.0
-- Description: 创建文件元数据表和同步日志表

-- 文件元数据表
-- 存储所有被同步的文件和文件夹的元数据信息
CREATE TABLE IF NOT EXISTS file_metadata (
    -- 主键ID
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 文件路径（相对于同步文件夹的路径）
    path TEXT NOT NULL,
    
    -- 文件内容哈希值（用于检测文件变更）
    hash TEXT,
    
    -- 文件大小（字节）
    size INTEGER NOT NULL DEFAULT 0,
    
    -- 文件最后修改时间（Unix 时间戳，秒）
    modified_at INTEGER NOT NULL,
    
    -- 最后同步时间（Unix 时间戳，秒）
    synced_at INTEGER,
    
    -- 所属同步文件夹ID（外键，关联配置中的 sync_folder）
    sync_folder_id INTEGER NOT NULL,
    
    -- 是否为目录（0: 文件, 1: 目录）
    is_directory INTEGER NOT NULL DEFAULT 0,
    
    -- 同步状态（synced: 已同步, pending: 待同步, conflict: 冲突, error: 错误）
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- 记录创建时间（Unix 时间戳，秒）
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    -- 记录更新时间（Unix 时间戳，秒）
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    -- 唯一约束：每个同步文件夹中的路径必须唯一
    UNIQUE(sync_folder_id, path)
);

-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_file_metadata_sync_folder 
    ON file_metadata(sync_folder_id);

CREATE INDEX IF NOT EXISTS idx_file_metadata_status 
    ON file_metadata(status);

CREATE INDEX IF NOT EXISTS idx_file_metadata_path 
    ON file_metadata(path);

CREATE INDEX IF NOT EXISTS idx_file_metadata_modified_at 
    ON file_metadata(modified_at);

-- 同步日志表
-- 记录所有同步操作的历史记录
CREATE TABLE IF NOT EXISTS sync_logs (
    -- 主键ID
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 所属同步文件夹ID
    sync_folder_id INTEGER NOT NULL,
    
    -- 文件路径（相对于同步文件夹的路径）
    file_path TEXT NOT NULL,
    
    -- 操作类型（upload: 上传, download: 下载, delete: 删除, conflict: 冲突处理）
    action TEXT NOT NULL,
    
    -- 操作状态（success: 成功, failed: 失败, pending: 待处理）
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- 错误信息（仅当 status 为 failed 时记录）
    error_message TEXT,
    
    -- 文件大小（字节）
    file_size INTEGER,
    
    -- 操作耗时（毫秒）
    duration_ms INTEGER,
    
    -- 日志创建时间（Unix 时间戳，秒）
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 为日志查询创建索引
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_folder 
    ON sync_logs(sync_folder_id);

CREATE INDEX IF NOT EXISTS idx_sync_logs_status 
    ON sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at 
    ON sync_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_action 
    ON sync_logs(action);

-- 同步会话表
-- 记录每次完整的同步会话信息
CREATE TABLE IF NOT EXISTS sync_sessions (
    -- 主键ID
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 所属同步文件夹ID
    sync_folder_id INTEGER NOT NULL,
    
    -- 会话状态（running: 运行中, completed: 已完成, failed: 失败, cancelled: 已取消）
    status TEXT NOT NULL DEFAULT 'running',
    
    -- 开始时间（Unix 时间戳，秒）
    started_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    -- 结束时间（Unix 时间戳，秒）
    completed_at INTEGER,
    
    -- 上传文件数
    files_uploaded INTEGER NOT NULL DEFAULT 0,
    
    -- 下载文件数
    files_downloaded INTEGER NOT NULL DEFAULT 0,
    
    -- 删除文件数
    files_deleted INTEGER NOT NULL DEFAULT 0,
    
    -- 冲突文件数
    files_conflict INTEGER NOT NULL DEFAULT 0,
    
    -- 错误数
    errors_count INTEGER NOT NULL DEFAULT 0,
    
    -- 总传输字节数
    total_bytes INTEGER NOT NULL DEFAULT 0,
    
    -- 错误信息
    error_message TEXT
);

-- 为会话查询创建索引
CREATE INDEX IF NOT EXISTS idx_sync_sessions_sync_folder 
    ON sync_sessions(sync_folder_id);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_started_at 
    ON sync_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_status 
    ON sync_sessions(status);

