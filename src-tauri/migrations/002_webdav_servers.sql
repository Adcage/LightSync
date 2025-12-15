-- WebDAV 服务器配置表
-- 存储所有用户配置的 WebDAV 服务器信息
DROP TABLE IF EXISTS webdav_servers CASCADE;
CREATE TABLE webdav_servers (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'WebDAV 服务器ID',
    name              VARCHAR(255) NOT NULL COMMENT '服务器名称',
    url               VARCHAR(512) NOT NULL COMMENT 'WebDAV 服务器 URL',
    username          VARCHAR(255) NOT NULL COMMENT '用户名',
    use_https         TINYINT NOT NULL DEFAULT 1 COMMENT '是否使用 HTTPS (0: HTTP, 1: HTTPS)',
    timeout           INT NOT NULL DEFAULT 30 COMMENT '连接超时时间（秒）',
    last_test_at      DATETIME COMMENT '最后连接测试时间',
    last_test_status  VARCHAR(32) DEFAULT 'unknown' COMMENT '最后连接测试状态（success, failed, unknown）',
    last_test_error   TEXT COMMENT '最后连接测试错误信息',
    server_type       VARCHAR(32) DEFAULT 'generic' COMMENT '服务器类型（自动检测，如 nextcloud, owncloud, generic）',
    enabled           TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用（0: 禁用, 1: 启用）',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    is_delete         TINYINT DEFAULT 0 NOT NULL COMMENT '是否删除',
    INDEX idx_webdav_servers_enabled (enabled),
    INDEX idx_webdav_servers_last_test_status (last_test_status)
) COMMENT 'WebDAV 服务器配置表';

CREATE INDEX IF NOT EXISTS idx_webdav_servers_enabled
    ON webdav_servers(enabled);

CREATE INDEX IF NOT EXISTS idx_webdav_servers_last_test_status
    ON webdav_servers(last_test_status);

-- 注意: sync_folders 表的外键约束将在 Phase 5 添加
-- 因为 sync_folders 表本身也是在 Phase 5 创建的


