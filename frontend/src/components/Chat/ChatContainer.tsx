import React from 'react';
import { Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  user: { bg: '#1890ff', text: '#fff', border: '#1890ff' },
  assistant: { bg: '#f7f7f7', text: '#333', border: '#e8e8e8' },
};

export const ChatMessage: React.FC<MessageProps> = ({ role, content }) => {
  const colors = roleColors[role] || roleColors.assistant;
  const isUser = role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          lineHeight: '1.6',
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0', fontSize: '14px' }}>
                  {children}
                </table>
              ),
              thead: ({ children }) => <thead style={{ backgroundColor: '#fafafa' }}>{children}</thead>,
              th: ({ children }) => (
                <th style={{ border: '1px solid #d9d9d9', padding: '8px 12px', fontWeight: 600, textAlign: 'left' }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td style={{ border: '1px solid #d9d9d9', padding: '8px 12px' }}>{children}</td>
              ),
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt || ''}
                  style={{ maxWidth: '100%', borderRadius: '8px', margin: '8px 0', display: 'block' }}
                />
              ),
              pre: ({ children }) => (
                <pre style={{ backgroundColor: '#f5f5f5', borderRadius: '6px', padding: '12px', overflow: 'auto', fontSize: '13px' }}>
                  {children}
                </pre>
              ),
              code: ({ className, children }) => {
                const isInline = !className;
                return isInline ? (
                  <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.9em' }}>
                    {children}
                  </code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote style={{ borderLeft: '3px solid #1890ff', paddingLeft: '12px', margin: '8px 0', color: '#666' }}>
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} style={{ color: '#1890ff' }} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              p: ({ children }) => <p style={{ margin: '8px 0' }}>{children}</p>,
              h1: ({ children }) => <h1 style={{ fontSize: '1.5em', marginTop: '16px', marginBottom: '8px' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: '1.3em', marginTop: '14px', marginBottom: '6px' }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: '1.1em', marginTop: '12px', marginBottom: '4px' }}>{children}</h3>,
              ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

interface ChatContainerProps {
  messages: Array<{ role: string; content: string }>;
  isStreaming?: boolean;
  currentAgent?: string | null;
  children?: React.ReactNode;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isStreaming,
  currentAgent,
  children,
}) => {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {messages.map((msg, idx) => (
        <ChatMessage key={idx} role={msg.role as 'user' | 'assistant'} content={msg.content} />
      ))}

      {isStreaming && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px 12px 12px 0',
              backgroundColor: '#f7f7f7',
              border: '1px solid #e8e8e8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '42px',
            }}
          >
            <Spin size="small" />
            <span style={{ color: '#666', fontSize: '14px' }}>
              {currentAgent ? `Multi-Agents 正在协作规划... (${currentAgent})` : '正在思考...'}
            </span>
          </div>
        </div>
      )}

      {children}

      <div ref={bottomRef} />
    </div>
  );
};
