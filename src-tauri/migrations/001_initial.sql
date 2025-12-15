-- LightSync 初始数据库架构
-- Version: 1.0
-- Description: 创建文件元数据表和同步日志表

DROP TABLE IF EXISTS file_metadata CASCADE;
CREATE TABLE file_metadata (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '文件元数据ID',
    path              VARCHAR(512) NOT NULL COMMENT '文件路径（相对于同步文件夹的路径）',
    hash              VARCHAR(64) COMMENT '文件内容哈希值（用于检测文件变更）',
    size              BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    modified_at       BIGINT NOT NULL COMMENT '文件最后修改时间（Unix 时间戳，秒）',
    synced_at         BIGINT COMMENT '最后同步时间（Unix 时间戳，秒）',
    sync_folder_id    BIGINT NOT NULL COMMENT '所属同步文件夹ID（外键，关联配置中的 sync_folder）',
    is_directory      TINYINT NOT NULL DEFAULT 0 COMMENT '是否为目录（0: 文件, 1: 目录）',
    status            VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '同步状态（synced: 已同步, pending: 待同步, conflict: 冲突, error: 错误）',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    is_delete         TINYINT DEFAULT 0 NOT NULL COMMENT '是否删除',
    UNIQUE KEY uk_sync_folder_path (sync_folder_id, path),
    INDEX idx_file_metadata_sync_folder (sync_folder_id),
    INDEX idx_file_metadata_status (status),
    INDEX idx_file_metadata_path (path),
    INDEX idx_file_metadata_modified_at (modified_at)
) COMMENT '文件元数据表';

-- 同步日志表
-- 记录所有同步操作的历史记录
DROP TABLE IF EXISTS sync_logs CASCADE;
CREATE TABLE sync_logs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    sync_folder_id    BIGINT NOT NULL COMMENT '所属同步文件夹ID',
    file_path         VARCHAR(512) NOT NULL COMMENT '文件路径（相对于同步文件夹的路径）',
    action            VARCHAR(32) NOT NULL COMMENT '操作类型（upload: 上传, download: 下载, delete: 删除, conflict: 冲突处理）',
    status            VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '操作状态（success: 成功, failed: 失败, pending: 待处理）',
    error_message     TEXT COMMENT '错误信息（仅当 status 为 failed 时记录）',
    file_size         BIGINT COMMENT '文件大小（字节）',
    duration_ms       BIGINT COMMENT '操作耗时（毫秒）',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '日志创建时间',
    is_delete         TINYINT DEFAULT 0 NOT NULL COMMENT '是否删除',
    INDEX idx_sync_logs_sync_folder (sync_folder_id),
    INDEX idx_sync_logs_status (status),
    INDEX idx_sync_logs_created_at (created_at DESC),
    INDEX idx_sync_logs_action (action)
) COMMENT '同步日志表';

-- 同步会话表
-- 记录每次完整的同步会话信息
DROP TABLE IF EXISTS sync_sessions CASCADE;
CREATE TABLE sync_sessions (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '会话ID',
    sync_folder_id    BIGINT NOT NULL COMMENT '所属同步文件夹ID',
    status            VARCHAR(32) NOT NULL DEFAULT 'running' COMMENT '会话状态（running: 运行中, completed: 已完成, failed: 失败, cancelled: 已取消）',
    started_at        DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    completed_at      DATETIME COMMENT '结束时间',
    files_uploaded    BIGINT NOT NULL DEFAULT 0 COMMENT '上传文件数',
    files_downloaded  BIGINT NOT NULL DEFAULT 0 COMMENT '下载文件数',
    files_deleted     BIGINT NOT NULL DEFAULT 0 COMMENT '删除文件数',
    files_conflict    BIGINT NOT NULL DEFAULT 0 COMMENT '冲突文件数',
    errors_count      BIGINT NOT NULL DEFAULT 0 COMMENT '错误数',
    total_bytes       BIGINT NOT NULL DEFAULT 0 COMMENT '总传输字节数',
    error_message     TEXT COMMENT '错误信息',
    is_delete         TINYINT DEFAULT 0 NOT NULL COMMENT '是否删除',
    INDEX idx_sync_sessions_sync_folder (sync_folder_id),
    INDEX idx_sync_sessions_started_at (started_at DESC),
    INDEX idx_sync_sessions_status (status)
) COMMENT '同步会话表';
