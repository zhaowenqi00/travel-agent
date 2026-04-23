import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

interface HeaderProps {
  uploadedFilesCount?: number;
  messagesCount?: number;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e8e8e8',
        backgroundColor: '#fff',
      }}
    >
      <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>🗺️</span> 智能旅游规划助手
      </Title>
      <Text type="secondary" style={{ marginTop: '4px', display: 'block' }}>
        基于 Multi-Agents 架构的旅游规划系统
      </Text>
    </div>
  );
};
