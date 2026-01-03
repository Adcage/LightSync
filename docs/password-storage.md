# LightSync 密码存储机制

## 概述

LightSync 使用**系统 Keyring（密钥环）**来安全存储 WebDAV 服务器密码，而不是存储在配置文件或数据库中。这是一种业界标准的安全实践。

## 存储位置

密码存储位置取决于操作系统：

### Windows

- **位置**：Windows 凭据管理器（Credential Manager）
- **路径**：控制面板 → 用户账户 → 凭据管理器 → Windows 凭据
- **存储格式**：
  - 服务名称：`LightSync`
  - 用户名：服务器 ID（UUID）
  - 密码：WebDAV 服务器密码（加密存储）

### macOS

- **位置**：macOS 钥匙串（Keychain）
- **路径**：应用程序 → 实用工具 → 钥匙串访问
- **存储格式**：
  - 服务：`LightSync`
  - 账户：服务器 ID（UUID）
  - 密码：WebDAV 服务器密码（加密存储）

### Linux

- **位置**：取决于桌面环境
  - **GNOME**：GNOME Keyring（`libsecret`）
  - **KDE**：KWallet
  - **其他**：可能使用文件系统加密存储
- **存储格式**：
  - 服务：`LightSync`
  - 用户：服务器 ID（UUID）
  - 密码：WebDAV 服务器密码（加密存储）

## 查看密码

### Windows 查看方法

1. 打开**凭据管理器**：
   - 按 `Win + R`，输入 `control /name Microsoft.CredentialManager`
   - 或：控制面板 → 用户账户 → 凭据管理器

2. 点击 **Windows 凭据**

3. 查找名为 `LightSync` 的凭据条目

4. 点击条目展开，可以看到：
   - **Internet 地址或网络地址**：`LightSync`
   - **用户名**：服务器 ID（UUID 格式，如 `a1b2c3d4-e5f6-...`）
   - **密码**：点击"显示"按钮，输入 Windows 密码后可查看

### macOS 查看方法

1. 打开**钥匙串访问**：
   - 应用程序 → 实用工具 → 钥匙串访问
   - 或按 `Cmd + Space`，搜索"钥匙串访问"

2. 在左侧选择**登录**钥匙串

3. 在搜索框输入 `LightSync`

4. 双击找到的条目，可以看到：
   - **名称**：`LightSync`
   - **账户**：服务器 ID（UUID）
   - **密码**：勾选"显示密码"，输入 macOS 密码后可查看

### Linux 查看方法

#### GNOME（使用 Seahorse）

1. 安装 Seahorse（如果未安装）：

   ```bash
   sudo apt install seahorse  # Ubuntu/Debian
   sudo dnf install seahorse  # Fedora
   ```

2. 打开 Seahorse：
   - 应用程序 → 密码和密钥
   - 或运行 `seahorse`

3. 在**登录**钥匙串中搜索 `LightSync`

4. 双击条目查看详情，点击"显示密码"

#### KDE（使用 KWalletManager）

1. 打开 KWalletManager：
   - 系统设置 → KDE 钱包
   - 或运行 `kwalletmanager5`

2. 打开默认钱包（通常是 `kdewallet`）

3. 在文件夹中查找 `LightSync` 相关条目

#### 命令行查看（使用 secret-tool）

```bash
# 安装 libsecret-tools
sudo apt install libsecret-tools  # Ubuntu/Debian

# 查看密码（需要知道服务器 ID）
secret-tool lookup service LightSync username <服务器ID>
```

## 代码实现

### Rust 后端（`src-tauri/src/webdav/keyring.rs`）

```rust
use keyring::Entry;

pub struct KeyringManager;

impl KeyringManager {
    const SERVICE_NAME: &'static str = "LightSync";

    /// 保存密码
    pub fn save_password(server_id: &str, password: &str) -> Result<()> {
        let entry = Entry::new(Self::SERVICE_NAME, server_id)?;
        entry.set_password(password)?;
        Ok(())
    }

    /// 读取密码
    pub fn get_password(server_id: &str) -> Result<String> {
        let entry = Entry::new(Self::SERVICE_NAME, server_id)?;
        entry.get_password()
    }

    /// 删除密码
    pub fn delete_password(server_id: &str) -> Result<()> {
        let entry = Entry::new(Self::SERVICE_NAME, server_id)?;
        entry.delete_password()?;
        Ok(())
    }
}
```

### 数据流程

```
添加服务器时：
1. 前端提交：服务器配置 + 密码
2. 后端生成：UUID 作为服务器 ID
3. 数据库存储：服务器配置（不含密码）
4. Keyring 存储：密码（使用服务器 ID 作为 key）

连接测试时：
1. 从数据库读取：服务器配置
2. 从 Keyring 读取：密码（使用服务器 ID）
3. 创建 WebDAV 客户端并测试连接

删除服务器时：
1. 从数据库删除：服务器配置
2. 从 Keyring 删除：密码
```

## 安全特性

### 1. 操作系统级加密

- 密码由操作系统使用硬件或软件加密存储
- Windows：使用 DPAPI（Data Protection API）
- macOS：使用 Keychain 加密
- Linux：使用 libsecret 或 KWallet 加密

### 2. 用户权限隔离

- 密码只能被当前用户访问
- 其他用户无法读取密码
- 需要用户认证才能查看密码

### 3. 不存储在文件中

- 密码不存储在配置文件（`.config.dat`）
- 密码不存储在数据库（`lightsync.db`）
- 即使配置文件或数据库泄露，密码仍然安全

### 4. 自动清理

- 删除服务器时自动删除密码
- 避免遗留敏感信息

## 常见问题

### Q1: 为什么看不到密码？

**A**: 密码存储在系统 Keyring 中，需要使用系统工具查看（见上文"查看密码"部分）。

### Q2: 密码会同步到其他设备吗？

**A**:

- **Windows**：不会自动同步
- **macOS**：如果启用了 iCloud 钥匙串，可能会同步
- **Linux**：通常不会同步

### Q3: 如果忘记密码怎么办？

**A**:

1. 在 LightSync 中删除该服务器
2. 重新添加服务器并输入正确的密码

### Q4: 密码存储失败怎么办？

**A**: 可能原因：

- Keyring 服务未运行（Linux）
- 权限不足
- 系统 Keyring 已锁定

解决方法：

- 确保系统 Keyring 服务正常运行
- 检查用户权限
- 重启应用或系统

### Q5: 如何批量导出密码？

**A**: LightSync 不提供批量导出功能（出于安全考虑）。如需迁移：

1. 记录所有服务器的密码
2. 在新设备上重新添加服务器

### Q6: 密码存储在哪个数据库表？

**A**: 密码**不存储在数据库**中。数据库（`webdav_servers` 表）只存储服务器配置信息（URL、用户名等），密码存储在系统 Keyring 中。

## 开发调试

### 查看所有 LightSync 密码（开发用）

#### Windows PowerShell

```powershell
# 列出所有 LightSync 凭据
cmdkey /list | Select-String "LightSync"
```

#### macOS Terminal

```bash
# 列出所有 LightSync 钥匙串条目
security find-generic-password -s "LightSync" -g
```

#### Linux

```bash
# 列出所有 LightSync 密码
secret-tool search service LightSync
```

### 手动删除所有密码（清理测试数据）

#### Windows

```powershell
# 需要知道具体的服务器 ID
cmdkey /delete:LightSync/<服务器ID>
```

#### macOS

```bash
# 删除所有 LightSync 钥匙串条目
security delete-generic-password -s "LightSync"
```

#### Linux

```bash
# 删除所有 LightSync 密码
secret-tool clear service LightSync
```

## 相关文件

- **实现代码**：`src-tauri/src/webdav/keyring.rs`
- **测试代码**：`src-tauri/src/webdav/keyring.rs` (tests 模块)
- **使用示例**：`src-tauri/src/commands/webdav.rs`

## 参考资料

- [keyring-rs](https://github.com/hwchen/keyring-rs) - Rust Keyring 库
- [Windows Credential Manager](https://support.microsoft.com/en-us/windows/accessing-credential-manager-1b5c916a-6a16-889f-8581-fc16e8165ac0)
- [macOS Keychain](https://support.apple.com/guide/keychain-access/welcome/mac)
- [GNOME Keyring](https://wiki.gnome.org/Projects/GnomeKeyring)
