# Implementation Plan

- [ ] 1. 数据库迁移和数据模型
  - [x] 1.1 创建数据库迁移文件
    - 创建 `src-tauri/migrations/002_webdav_servers.sql`
    - 定义 `webdav_servers` 表结构
    - 添加必要的索引
    - _Requirements: 1.3, 1.4_

  - [x] 1.2 在 lib.rs 中注册数据库迁移
    - 添加 migration version 2
    - 配置迁移文件路径
    - _Requirements: 1.3_

  - [x] 1.3 创建 WebDavServerConfig 数据结构
    - 在 `src-tauri/src/database.rs` 中定义结构体
    - 实现序列化/反序列化
    - 添加字段验证
    - _Requirements: 1.1, 1.3_

  - [x] 1.4 实现数据库 CRUD 操作
    - 创建 `src-tauri/src/webdav/` 模块文件夹
    - 创建 `src-tauri/src/webdav/mod.rs` 模块导出文件
    - 创建 `src-tauri/src/webdav/db.rs` 数据库操作模块
    - 实现 insert_webdav_server
    - 实现 get_webdav_servers (支持 enabled 筛选)
    - 实现 get_webdav_server_by_id
    - 实现 update_webdav_server
    - 实现 delete_webdav_server
    - _Requirements: 1.3, 4.3, 5.2_

  - [x] 1.5 编写数据库操作单元测试
    - 测试插入服务器配置
    - 测试查询服务器配置
    - 测试更新服务器配置
    - 测试删除服务器配置
    - 测试外键约束
    - _Requirements: 1.3, 4.3, 5.2_

- [ ] 2. Keyring 密码管理
  - [x] 2.1 添加 keyring 依赖
    - 在 Cargo.toml 中添加 keyring crate
    - _Requirements: 1.2_

  - [x] 2.2 创建 KeyringManager 模块
    - 创建 `src-tauri/src/webdav/keyring.rs`
    - 实现 save_password 函数
    - 实现 get_password 函数
    - 实现 delete_password 函数
    - 处理 keyring 不可用的情况
    - _Requirements: 1.2, 4.4, 5.3_

  - [x] 2.3 编写 Keyring 单元测试
    - 测试密码保存
    - 测试密码读取
    - 测试密码删除
    - 测试密码不存在的情况
    - **Property 3: 密码安全存储 Round-Trip**
    - **Validates: Requirements 1.2, 4.4**
    - _Requirements: 1.2, 4.4, 5.3_

- [ ] 3. WebDAV 客户端实现
  - [x] 3.1 添加 WebDAV 相关依赖
    - 在 Cargo.toml 中添加 reqwest
    - 添加 url crate
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.2 创建 WebDavClient 结构体
    - 创建 `src-tauri/src/webdav/client.rs`
    - 定义 WebDavClient 结构体
    - 实现 new 构造函数
    - 配置 HTTP 客户端(超时、认证)
    - _Requirements: 2.1, 6.1_

  - [x] 3.3 实现连接测试功能
    - 实现 test_connection 方法
    - 发送 PROPFIND 请求测试连接
    - 解析服务器响应
    - 检测服务器类型
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 实现基本文件操作
    - 实现 list 方法(列出文件)
    - 实现 upload 方法(上传文件)
    - 实现 download 方法(下载文件)
    - 实现 delete 方法(删除文件)
    - 实现 mkdir 方法(创建文件夹)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.5 实现错误处理
    - 处理网络错误
    - 处理认证错误
    - 处理 HTTP 4xx 错误
    - 处理 HTTP 5xx 错误
    - 处理超时错误
    - **Property 7: 错误信息完整性**
    - **Validates: Requirements 2.3, 7.1, 7.3, 7.4**
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.6 编写 WebDavClient 单元测试
    - 测试 URL 解析
    - 测试认证头构建
    - 测试超时机制
    - **Property 6: 连接超时机制**
    - **Validates: Requirements 2.5, 7.5**
    - _Requirements: 2.5, 6.1, 7.5_

  - [x] 3.7 编写 WebDAV 操作集成测试
    - 使用 mock 服务器测试连接
    - 测试文件上传下载
    - 测试文件删除
    - 测试文件夹创建
    - **Property 14: WebDAV 文件操作 Round-Trip**
    - **Property 15: WebDAV 删除操作正确性**
    - **Property 16: WebDAV 文件夹创建正确性**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 4. Tauri 命令层
  - [ ] 4.1 创建 WebDAV 命令模块
    - 创建 `src-tauri/src/commands/webdav.rs`
    - 导出命令模块
    - _Requirements: 1.3, 2.1_

  - [ ] 4.2 实现服务器配置 CRUD 命令
    - 实现 add_webdav_server 命令
    - 实现 get_webdav_servers 命令
    - 实现 get_webdav_server 命令
    - 实现 update_webdav_server 命令
    - 实现 delete_webdav_server 命令
    - **Property 2: 配置持久化 Round-Trip**
    - **Property 4: 服务器 ID 唯一性**
    - **Property 12: 配置删除完整性**
    - **Validates: Requirements 1.3, 1.4, 4.3, 5.2, 5.3**
    - _Requirements: 1.3, 1.4, 1.5, 4.3, 5.2, 5.3_

  - [ ] 4.3 实现连接测试命令
    - 实现 test_webdav_connection 命令
    - 从数据库读取服务器配置
    - 从 Keyring 读取密码
    - 创建 WebDavClient 并测试连接
    - 更新数据库中的测试状态
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 4.4 实现删除保护逻辑
    - 检查服务器是否被 sync_folders 使用
    - 如果被使用则拒绝删除
    - 返回适当的错误信息
    - **Property 13: 删除保护机制**
    - **Validates: Requirements 5.5**
    - _Requirements: 5.5_

  - [ ] 4.5 在 lib.rs 中注册所有命令
    - 注册 WebDAV 相关命令
    - 更新 invoke_handler
    - _Requirements: 1.3, 2.1_

  - [ ] 4.6 编写 Tauri 命令集成测试
    - 测试命令调用
    - 测试参数传递
    - 测试错误序列化
    - _Requirements: 1.3, 2.1, 5.2_

- [ ] 5. 前端工具函数
  - [ ] 5.1 创建 WebDAV 工具模块
    - 创建 `src/utils/webdav.ts`
    - 封装 Tauri 命令调用
    - _Requirements: 1.3, 2.1_

  - [ ] 5.2 实现服务器配置 API 函数
    - 实现 addWebDavServer
    - 实现 getWebDavServers
    - 实现 getWebDavServer
    - 实现 updateWebDavServer
    - 实现 deleteWebDavServer
    - 实现 testWebDavConnection
    - _Requirements: 1.3, 1.5, 2.1, 4.3, 5.2_

  - [ ] 5.3 实现错误处理和类型定义
    - 定义 TypeScript 接口
    - 实现错误处理逻辑
    - 添加 JSDoc 注释
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6. 前端 Hook 实现
  - [ ] 6.1 创建 useWebDavServers Hook
    - 创建 `src/hooks/useWebDavServers.ts`
    - 实现状态管理
    - 实现数据加载
    - _Requirements: 1.5, 3.1, 3.2_

  - [ ] 6.2 实现 CRUD 操作方法
    - 实现 addServer 方法
    - 实现 updateServer 方法
    - 实现 removeServer 方法
    - 实现 testConnection 方法
    - 实现 refresh 方法
    - **Property 5: 配置列表同步性**
    - **Validates: Requirements 1.5, 3.1, 5.4**
    - _Requirements: 1.5, 3.1, 4.1, 4.3, 5.2, 5.4_

  - [ ] 6.3 实现加载和错误状态管理
    - 管理 loading 状态
    - 管理 error 状态
    - 实现错误恢复
    - _Requirements: 2.4, 3.5, 10.3_

  - [ ] 6.4 编写 Hook 单元测试
    - 测试 CRUD 操作
    - 测试状态管理
    - 测试错误处理
    - _Requirements: 1.5, 4.3, 5.2_

- [ ] 7. 服务器配置表单组件
  - [ ] 7.1 创建 ServerConfigForm 组件
    - 创建 `src/components/ServerConfigForm.tsx`
    - 实现表单布局
    - 使用 NextUI 组件
    - _Requirements: 1.1, 4.1, 9.1_

  - [ ] 7.2 实现表单字段
    - 服务器名称输入框
    - 服务器 URL 输入框
    - 用户名输入框
    - 密码输入框
    - 超时时间输入框
    - HTTPS 开关
    - _Requirements: 1.1, 4.1, 9.2_

  - [ ] 7.3 实现表单验证
    - URL 格式验证
    - 必填字段验证
    - 超时时间范围验证
    - 实时验证反馈
    - **Property 1: URL 格式验证正确性**
    - **Property 18: 表单验证实时性**
    - **Property 19: 超时时间范围验证**
    - **Property 20: 表单状态管理**
    - **Validates: Requirements 1.1, 9.1, 9.2, 9.3, 9.4, 9.5**
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 7.4 实现表单提交逻辑
    - 处理添加模式
    - 处理编辑模式
    - 密码字段处理
    - 提交成功/失败处理
    - **Property 10: 编辑表单预填充正确性**
    - **Property 11: 密码保留逻辑**
    - **Validates: Requirements 4.1, 4.5**
    - _Requirements: 1.1, 4.1, 4.2, 4.5, 10.4_

  - [ ] 7.5 实现用户体验优化
    - 自动聚焦
    - Enter 键提交
    - 加载状态显示
    - 错误提示显示
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [ ] 7.6 编写表单组件测试
    - 测试表单渲染
    - 测试验证逻辑
    - 测试提交流程
    - _Requirements: 9.1, 9.5, 10.4_

- [ ] 8. 服务器列表组件
  - [ ] 8.1 创建 ServerListItem 组件
    - 创建 `src/components/ServerListItem.tsx`
    - 实现列表项布局
    - 显示服务器信息
    - **Property 9: 服务器列表信息完整性**
    - **Validates: Requirements 3.2**
    - _Requirements: 3.1, 3.2_

  - [ ] 8.2 实现敏感信息隐藏
    - 隐藏密码字段
    - 显示密码占位符
    - **Property 8: 敏感信息隐藏**
    - **Validates: Requirements 3.3, 4.2**
    - _Requirements: 3.3, 4.2_

  - [ ] 8.3 实现操作按钮
    - 测试连接按钮
    - 编辑按钮
    - 删除按钮
    - 按钮状态管理
    - _Requirements: 2.1, 4.1, 5.1_

  - [ ] 8.4 实现连接状态显示
    - 显示连接状态图标
    - 显示最后测试时间
    - 显示错误信息
    - _Requirements: 2.2, 2.3, 3.2_

  - [ ] 8.5 编写列表组件测试
    - 测试信息显示
    - 测试敏感信息隐藏
    - 测试操作按钮
    - _Requirements: 3.2, 3.3_

- [ ] 9. 服务器列表页面
  - [ ] 9.1 更新 ServersPage 组件
    - 集成 useWebDavServers Hook
    - 实现服务器列表渲染
    - _Requirements: 3.1, 3.2_

  - [ ] 9.2 实现空状态显示
    - 创建空状态组件
    - 显示引导信息
    - _Requirements: 3.4_

  - [ ] 9.3 实现添加服务器对话框
    - 集成 ServerConfigForm
    - 处理对话框打开/关闭
    - 处理表单提交
    - _Requirements: 1.1, 1.5_

  - [ ] 9.4 实现编辑服务器对话框
    - 集成 ServerConfigForm
    - 预填充服务器数据
    - 处理表单提交
    - _Requirements: 4.1, 4.3_

  - [ ] 9.5 实现删除确认对话框
    - 显示确认消息
    - 处理删除操作
    - 显示错误信息(如果被使用)
    - _Requirements: 5.1, 5.5_

  - [ ] 9.6 实现连接测试功能
    - 调用测试连接 API
    - 显示测试进度
    - 显示测试结果
    - **Property 21: 异步操作加载状态**
    - **Validates: Requirements 10.3**
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 9.7 实现错误处理和提示
    - 显示操作成功提示
    - 显示操作失败提示
    - 实现错误恢复
    - _Requirements: 3.5, 10.5_

- [ ] 10. 国际化支持
  - [ ] 10.1 添加中文翻译
    - 在 `src/i18n/locales/zh_CN.json` 中添加翻译
    - 添加服务器管理相关文本
    - 添加错误消息文本
    - 添加成功消息文本
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.2 添加英文翻译
    - 在 `src/i18n/locales/en_US.json` 中添加翻译
    - 保持与中文翻译的一致性
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.3 在组件中应用国际化
    - 在表单组件中使用 t 函数
    - 在列表组件中使用 t 函数
    - 在页面组件中使用 t 函数
    - **Property 17: 国际化文本正确性**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 10.4 测试语言切换
    - 测试中英文切换
    - 验证所有文本正确翻译
    - _Requirements: 8.4_

- [ ] 11. 集成测试和验收
  - [ ] 11.1 端到端测试 - 添加服务器
    - 测试完整的添加流程
    - 验证数据库记录
    - 验证 Keyring 密码
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 11.2 端到端测试 - 连接测试
    - 测试成功连接场景
    - 测试失败连接场景
    - 验证状态更新
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 11.3 端到端测试 - 编辑服务器
    - 测试配置更新
    - 测试密码更新
    - 测试密码保留
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 11.4 端到端测试 - 删除服务器
    - 测试正常删除
    - 测试删除保护
    - 验证数据清理
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 11.5 性能测试
    - 测试多服务器场景
    - 测试并发操作
    - 验证响应时间
    - _Requirements: 2.5, 6.1_

  - [ ] 11.6 用户验收测试
    - 验证所有用户故事
    - 验证所有验收标准
    - 收集用户反馈
    - _Requirements: All_

- [ ] 12. 文档和清理
  - [ ] 12.1 更新 API 文档
    - 文档化 Tauri 命令
    - 文档化前端 API
    - 添加使用示例
    - _Requirements: All_

  - [ ] 12.2 更新用户文档
    - 编写服务器配置指南
    - 添加常见问题解答
    - 添加故障排除指南
    - _Requirements: All_

  - [ ] 12.3 代码审查和优化
    - 审查代码质量
    - 优化性能
    - 清理未使用代码
    - _Requirements: All_

  - [ ] 12.4 更新项目进度清单
    - 标记 Phase 2 为已完成
    - 更新完成时间
    - 准备 Phase 3
    - _Requirements: All_
