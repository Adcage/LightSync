-- WebDAV 服务器配置表
-- 存储所有用户配置的 WebDAV 服务器信息
-- SQLite 版本

CREATE TABLE IF NOT EXISTS webdav_servers (
    -- 主键ID (使用 UUID 字符串)
    id TEXT PRIMARY KEY NOT NULL,

    -- 服务器名称
    name TEXT NOT NULL,

    -- WebDAV 服务器 URL
    url TEXT NOT NULL,

    -- 用户名
    username TEXT NOT NULL,

    -- 是否使用 HTTPS (0: HTTP, 1: HTTPS)
    use_https INTEGER NOT NULL DEFAULT 1,

    -- 连接超时时间（秒）
    timeout INTEGER NOT NULL DEFAULT 30,

    -- 最后连接测试时间（Unix 时间戳，秒）
    last_test_at INTEGER,

    -- 最后连接测试状态（success, failed, unknown）
    last_test_status TEXT DEFAULT 'unknown',

    -- 最后连接测试错误信息
    last_test_error TEXT,

    -- 服务器类型（自动检测，如 nextcloud, owncloud, generic）
    server_type TEXT DEFAULT 'generic',

    -- 是否启用（0: 禁用, 1: 启用）
    enabled INTEGER NOT NULL DEFAULT 1,

    -- 记录创建时间（Unix 时间戳，秒）
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),

    -- 记录更新时间（Unix 时间戳，秒）
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_webdav_servers_enabled
    ON webdav_servers(enabled);

CREATE INDEX IF NOT EXISTS idx_webdav_servers_last_test_status
    ON webdav_servers(last_test_status);

-- 注意: sync_folders 表的外键约束将在 Phase 5 添加
-- 因为 sync_folders 表本身也是在 Phase 5 创建的


