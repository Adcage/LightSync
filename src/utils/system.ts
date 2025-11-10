import { invoke } from '@tauri-apps/api/core';

/**
 * 获取当前运行环境信息
 * @returns Promise<string> 返回包含操作系统、架构、Rust版本和应用版本的环境信息字符串
 */
export async function getRuntimeEnvironment(): Promise<string> {
  try {
    const envInfo = await invoke<string>('get_runtime_environment');
    return envInfo;
  } catch (error) {
    console.error('获取运行环境信息失败:', error);
    throw error;
  }
}

/**
 * 获取当前运行模式（开发环境或生产环境）
 * @returns Promise<string> 返回 "development" 或 "production"
 */
export async function getEnvironmentMode(): Promise<string> {
  try {
    const mode = await invoke<string>('get_environment_mode');
    return mode;
  } catch (error) {
    console.error('获取环境模式失败:', error);
    throw error;
  }
}

/**
 * 检查当前是否为开发环境
 * @returns Promise<boolean> 如果是开发环境返回 true，否则返回 false
 */
export async function isDevelopmentMode(): Promise<boolean> {
  try {
    const mode = await getEnvironmentMode();
    return mode === 'development';
  } catch (error) {
    console.error('检查开发环境失败:', error);
    // 如果无法获取环境信息，默认返回 false
    return false;
  }
}

/**
 * 检查当前是否为生产环境
 * @returns Promise<boolean> 如果是生产环境返回 true，否则返回 false
 */
export async function isProductionMode(): Promise<boolean> {
  try {
    const mode = await getEnvironmentMode();
    return mode === 'production';
  } catch (error) {
    console.error('检查生产环境失败:', error);
    // 如果无法获取环境信息，默认返回 true
    return true;
  }
}