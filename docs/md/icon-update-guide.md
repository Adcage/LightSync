# 应用图标更新指南

## 问题说明

在开发环境中，Windows 任务栏可能会缓存旧的应用图标，即使已经生成了新图标，任务栏上显示的仍然是旧图标。

## 已完成的操作

### 1. 生成新图标 ✅

使用命令生成了所有平台的图标：

```bash
pnpm tauri icon src/assets/logo.png
```

生成的图标文件位于 `src-tauri/icons/` 目录：

- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- `32x32.png`, `128x128.png` 等 - 各种尺寸的 PNG 图标

### 2. 清理缓存 ✅

- 清除了 Windows 图标缓存
- 清理了 Cargo 构建缓存（`cargo clean`）
- 重启了 Windows 资源管理器

## 应用新图标的步骤

### 方法 1：重新启动开发服务器（推荐）

1. **停止当前运行的应用**
   - 关闭 LightSync 窗口
   - 在终端按 `Ctrl+C` 停止开发服务器

2. **重新启动开发服务器**

   ```bash
   pnpm tauri:dev
   ```

3. **验证图标**
   - 查看任务栏图标是否更新
   - 查看窗口标题栏图标（如果显示）
   - 查看 Alt+Tab 切换窗口时的图标

### 方法 2：构建生产版本

如果开发环境图标仍未更新，可以构建生产版本：

```bash
pnpm tauri build
```

构建完成后，安装生成的安装包：

- Windows: `src-tauri/target/release/bundle/msi/LightSync_0.1.0_x64_en-US.msi`
- 或直接运行: `src-tauri/target/release/lightsync.exe`

### 方法 3：手动清除 Windows 图标缓存

如果图标仍未更新，可以手动清除 Windows 图标缓存：

1. **打开任务管理器** (Ctrl+Shift+Esc)

2. **结束 Windows 资源管理器进程**
   - 找到 "Windows 资源管理器" 或 "explorer.exe"
   - 右键 → 结束任务

3. **删除图标缓存文件**
   - 打开任务管理器 → 文件 → 运行新任务
   - 输入：`%localappdata%`
   - 删除以下文件：
     - `IconCache.db`
     - `Microsoft\Windows\Explorer\iconcache_*.db`

4. **重启资源管理器**
   - 任务管理器 → 文件 → 运行新任务
   - 输入：`explorer.exe`

5. **重启应用**
   ```bash
   pnpm tauri:dev
   ```

## 验证图标是否更新

### 开发环境

1. **任务栏图标**
   - 查看任务栏上的应用图标
   - 应该显示你的 logo

2. **Alt+Tab 图标**
   - 按 Alt+Tab 切换窗口
   - 查看应用图标是否为新 logo

3. **窗口图标**（如果启用了装饰）
   - 查看窗口左上角的图标

### 生产环境

1. **安装后的图标**
   - 开始菜单图标
   - 桌面快捷方式图标
   - 任务栏图标

2. **文件资源管理器**
   - 打开安装目录
   - 查看 `lightsync.exe` 的图标

## 常见问题

### Q: 为什么开发环境图标不更新？

**A:** 开发环境使用的是调试构建，Windows 可能会缓存图标。解决方法：

1. 运行 `cargo clean` 清理构建缓存
2. 清除 Windows 图标缓存
3. 重启开发服务器

### Q: 生产构建后图标还是旧的？

**A:** 检查以下几点：

1. 确认 `src-tauri/icons/icon.ico` 是新生成的图标
2. 确认 `tauri.conf.json` 中的图标路径正确
3. 卸载旧版本应用，重新安装新版本
4. 清除 Windows 图标缓存

### Q: macOS 上图标不更新？

**A:** macOS 也会缓存图标，解决方法：

```bash
# 清除图标缓存
sudo rm -rf /Library/Caches/com.apple.iconservices.store
killall Dock
killall Finder

# 重新构建应用
pnpm tauri build
```

### Q: Linux 上图标不更新？

**A:** Linux 图标缓存位置因桌面环境而异：

```bash
# GNOME/Ubuntu
rm -rf ~/.cache/thumbnails/*
gtk-update-icon-cache

# KDE
kbuildsycoca5 --noincremental

# 重新构建应用
pnpm tauri build
```

## 图标文件说明

### Windows

- `icon.ico` - 包含多个尺寸的图标（16x16, 32x32, 48x48, 256x256）
- 用于：任务栏、窗口、文件资源管理器、开始菜单

### macOS

- `icon.icns` - 包含多个尺寸的图标
- 用于：Dock、应用程序文件夹、Launchpad

### Linux

- PNG 图标（32x32, 128x128 等）
- 用于：应用程序菜单、任务栏

### Web

- `public/favicon.png` - 浏览器标签页图标
- 从 `src-tauri/icons/32x32.png` 复制而来

## 配置文件

### tauri.conf.json

```json
{
  "bundle": {
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

### index.html

```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

## 总结

图标已经成功生成并配置，如果任务栏图标未更新：

1. ✅ 停止当前应用
2. ✅ 清除 Windows 图标缓存（已完成）
3. ✅ 清理 Cargo 构建缓存（已完成）
4. ⏳ **重新启动开发服务器** ← 你需要做这一步

运行命令：

```bash
pnpm tauri:dev
```

新图标应该会在重启后显示在任务栏上。
