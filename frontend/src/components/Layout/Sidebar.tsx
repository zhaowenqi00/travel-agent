import React from 'react';
import { Button, Divider, Tag, Tooltip } from 'antd';
import { DatabaseOutlined, MessageOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import { SessionList } from '../Session/SessionList';
import type { SessionInfo } from '../../types';

interface SidebarProps {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  messagesCount?: number;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onNavigate?: (path: string) => void;
  isKnowledgePage?: boolean;
}

const agents = [
  { key: 'main', name: 'Main', role: '协调者', icon: '🏠', color: '#1677ff' },
  { key: 'planner', name: 'Planner', role: '规划者', icon: '📋', color: '#52c41a' },
  { key: 'executor', name: 'Executor', role: '执行者', icon: '⚡', color: '#fa8c16' },
  { key: 'summarizer', name: 'Summarizer', role: '总结者', icon: '📝', color: '#722ed1' },
  { key: 'feedback', name: 'Feedback', role: '反馈者', icon: '💭', color: '#13c2c2' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  messagesCount = 0,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onNavigate,
  isKnowledgePage = false,
}) => {
  const navigate = (path: string) => {
    onNavigate?.(path);
  };

  return (
    <div
      style={{
        width: '300px',
        minWidth: '300px',
        height: '100vh',
        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo 区域 */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            ✈️
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>Travel Agent</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>智能旅游规划助手</div>
          </div>
        </div>

        {/* 导航按钮 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            type={isKnowledgePage ? 'default' : 'primary'}
            icon={<MessageOutlined />}
            onClick={() => navigate('/chat')}
            style={{
              flex: 1,
              height: '40px',
              borderRadius: '10px',
              background: isKnowledgePage ? 'rgba(255,255,255,0.15)' : '#fff',
              border: 'none',
              color: isKnowledgePage ? '#fff' : '#667eea',
              fontWeight: 500,
            }}
          >
            对话
          </Button>
          <Button
            type={isKnowledgePage ? 'primary' : 'default'}
            icon={<DatabaseOutlined />}
            onClick={() => navigate('/knowledge')}
            style={{
              flex: 1,
              height: '40px',
              borderRadius: '10px',
              background: isKnowledgePage ? '#fff' : 'rgba(255,255,255,0.15)',
              border: 'none',
              color: isKnowledgePage ? '#667eea' : '#fff',
              fontWeight: 500,
            }}
          >
            旅游攻略知识库
          </Button>
        </div>
      </div>

      {/* 历史会话 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500, opacity: 0.9 }}>历史会话</div>
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={onCreateSession}
            style={{
              color: '#fff',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              height: '28px',
              fontSize: '12px',
            }}
          >
            新建
          </Button>
        </div>
        <SessionList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelect={onSelectSession}
          onCreate={onCreateSession}
          onDelete={onDeleteSession}
        />
      </div>

      {/* 底部信息 */}
      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(0,0,0,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Agents 展示 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Multi-Agents
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agents.map((agent) => (
              <Tooltip key={agent.key} title={`${agent.name} (${agent.role})`} placement="top">
                <Tag
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    cursor: 'default',
                    color: '#fff',
                  }}
                >
                  {agent.icon}
                </Tag>
              </Tooltip>
            ))}
          </div>
        </div>

        <Divider style={{ margin: '10px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* 统计信息 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            <RobotOutlined style={{ marginRight: '6px' }} />
            对话轮数
          </div>
          <Tag
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 500,
            }}
          >
            {Math.ceil(messagesCount / 2)}
          </Tag>
        </div>
      </div>
    </div>
  );
};
