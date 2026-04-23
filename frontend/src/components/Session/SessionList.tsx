import React from 'react';
import { Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { SessionInfo } from '../../types';

interface SessionListProps {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
}) => {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {sessions.length > 0 ? (
        sessions.map((session) => {
          const isActive = session.session_id === currentSessionId;
          const isHovered = hoveredId === session.session_id;

          return (
            <div
              key={session.session_id}
              onMouseEnter={() => setHoveredId(session.session_id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(session.session_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: isActive
                  ? 'rgba(255,255,255,0.2)'
                  : isHovered
                  ? 'rgba(255,255,255,0.12)'
                  : 'transparent',
                transition: 'all 0.2s ease',
                border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              }}
            >
              {/* 删除按钮 */}
              <div
                style={{
                  width: isHovered ? '28px' : '0px',
                  overflow: 'hidden',
                  transition: 'width 0.2s ease',
                  marginRight: isHovered ? '8px' : '0px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.session_id);
                }}
              >
                <DeleteOutlined
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    background: 'rgba(255,77,79,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,77,79,0.4)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,77,79,0.2)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }}
                />
              </div>

              {/* 会话内容 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: isActive ? 500 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.title || '新对话'}
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                >
                  {session.message_count || 0} 条消息
                </div>
              </div>

              {/* 活跃指示器 */}
              {isActive && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#52c41a',
                    marginLeft: '8px',
                  }}
                />
              )}
            </div>
          );
        })
      ) : (
        <Typography.Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            display: 'block',
            textAlign: 'center',
            padding: '20px 0',
          }}
        >
          还没有历史对话
        </Typography.Text>
      )}
    </div>
  );
};
