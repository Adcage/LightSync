/// WebDAV 模块
///
/// 提供 WebDAV 服务器配置管理和客户端功能
///
/// 模块结构:
/// - db: 数据库 CRUD 操作
/// - keyring: 密码管理
/// - client: WebDAV 客户端实现
pub mod client;
pub mod db;
pub mod keyring;
