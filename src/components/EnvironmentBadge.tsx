import React from 'react';
import { Chip } from '@nextui-org/react';
import { useEnvironment } from '../hooks/useEnvironment';

/**
 * 环境徽章组件
 * 显示当前运行环境的徽章
 */
export const EnvironmentBadge: React.FC = () => {
  const { isDev, loading } = useEnvironment();

  if (loading) {
    return <Chip variant="flat" isLoading>加载中...</Chip>;
  }

  return (
    <Chip 
      color={isDev ? "warning" : "success"}
      variant="flat"
      size="sm"
    >
      {isDev ? "开发环境" : "生产环境"}
    </Chip>
  );
};