/// WebDAV 模块
///
/// 提供 WebDAV 服务器配置管理和客户端功能
///
/// 模块结构:
/// - db: 数据库 CRUD 操作
/// - client: WebDAV 客户端实现 (Phase 2 后续任务)
/// - keyring: 密码管理 (Phase 2 后续任务)
pub mod db;

// 重新导出常用类型
pub use db::{
    delete_webdav_server, get_webdav_server_by_id, get_webdav_servers, insert_webdav_server,
    update_webdav_server,
};
