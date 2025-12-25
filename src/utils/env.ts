import { invoke } from '@tauri-apps/api/core'

/**
 * 操作系统类型
 * 可能的值: "Linux" | "Darwin" | "Windows_NT"
 */
export let osType = ''

/**
 * 系统架构
 * 可能的值: "x86" | "x86_64" | "arm" | "aarch64" 等
 */
export let arch = ''

/**
 * 操作系统版本
 */
export let osVersion = ''

/**
 * 应用版本
 */
export let appVersion = ''

/**
 * 初始化环境变量
 * 必须在应用启动时调用，在渲染 React 组件之前
 */
export async function initEnv() {
  try {
    // 通过 Rust 后端获取系统信息
    osType = await invoke<string>('get_os_type')
    // 其他信息可以后续添加
    arch = ''
    osVersion = ''
    appVersion = ''
  } catch (error) {
    console.error('Failed to initialize environment:', error)
    // 设置默认值，避免应用崩溃
    osType = ''
  }
}
