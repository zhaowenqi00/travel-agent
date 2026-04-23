import React, { useState } from 'react';
import { Input, Button } from 'antd';

const { TextArea } = Input;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = '请输入您的旅行需求，例如：我想12月去杭州玩3天',
}) => {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: '16px 20px',
        borderTop: '1px solid #e8e8e8',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <TextArea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1, borderRadius: '8px' }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="primary"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={{ height: '40px', borderRadius: '8px' }}
        >
          发送
        </Button>
      </div>
    </div>
  );
};
