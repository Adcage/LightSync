/**
 * LightSync 配置类型定义
 * 
 * 与 Rust 后端的配置结构保持一致
 */

/**
 * 应用程序主配置
 */
export interface AppConfig {
  /** 应用程序版本 */
  version: string;
  /** 语言设置（zh-CN, en-US） */
  language: string;
  /** 主题设置（light, dark, system） */
  theme: string;
  /** 是否开机自启动 */
  autoStart: boolean;
  /** 是否最小化到系统托盘 */
  minimizeToTray: boolean;
  /** 同步文件夹配置列表 */
  syncFolders: SyncFolderConfig[];
  /** WebDAV 服务器配置列表 */
  webdavServers: WebDavServerConfig[];
}

/**
 * 同步文件夹配置
 */
export interface SyncFolderConfig {
  /** 配置 ID */
  id: string;
  /** 文件夹名称 */
  name: string;
  /** 本地路径 */
  localPath: string;
  /** 远程路径 */
  remotePath: string;
  /** 关联的服务器 ID */
  serverId: string;
  /** 同步方向（bidirectional, upload-only, download-only） */
  syncDirection: 'bidirectional' | 'upload-only' | 'download-only';
  /** 同步间隔（分钟） */
  syncInterval: number;
  /** 是否启用自动同步 */
  autoSync: boolean;
  /** 忽略规则（glob 模式） */
  ignorePatterns: string[];
  /** 冲突解决策略（ask, local-wins, remote-wins, newer-wins） */
  conflictResolution: 'ask' | 'local-wins' | 'remote-wins' | 'newer-wins';
}

/**
 * WebDAV 服务器配置
 */
export interface WebDavServerConfig {
  /** 服务器 ID */
  id: string;
  /** 服务器名称 */
  name: string;
  /** 服务器 URL */
  url: string;
  /** 用户名 */
  username: string;
  /** 是否使用 HTTPS */
  useHttps: boolean;
  /** 连接超时（秒） */
  timeout: number;
}

/**
 * 配置更新对象（部分更新）
 */
export type ConfigUpdate = Partial<AppConfig>;

/**
 * 同步文件夹更新对象（部分更新）
 */
export type SyncFolderUpdate = Partial<SyncFolderConfig>;

/**
 * WebDAV 服务器更新对象（部分更新）
 */
export type WebDavServerUpdate = Partial<WebDavServerConfig>;

