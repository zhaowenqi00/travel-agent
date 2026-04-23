import React from 'react';
import { Tag } from 'antd';

interface AgentStatusProps {
  agent: string | null;
  error?: string | null;
}

const agentLabels: Record<string, string> = {
  main: 'Main Agent (协调者)',
  planner: 'Planner Agent (规划者)',
  executor: 'Executor Agent (执行者)',
  summarizer: 'Summarizer Agent (总结者)',
  feedback: 'Feedback Agent (反馈者)',
  unknown: 'Unknown',
};

const agentColors: Record<string, string> = {
  main: 'blue',
  planner: 'green',
  executor: 'orange',
  summarizer: 'purple',
  feedback: 'cyan',
  unknown: 'default',
};

export const AgentStatus: React.FC<AgentStatusProps> = ({ agent, error }) => {
  if (error) {
    return (
      <div style={{
        padding: '8px 20px',
        backgroundColor: '#fff2f0',
        borderTop: '1px solid #ffccc7',
      }}>
        <Tag color="red">错误</Tag>
        <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>{error}</span>
      </div>
    );
  }

  if (!agent) return null;

  const color = agentColors[agent] || 'default';
  const label = agentLabels[agent] || agent;

  return (
    <div style={{
      padding: '8px 20px',
      backgroundColor: '#f0f5ff',
      borderTop: '1px solid #adc6ff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '16px' }}>🤖</span>
      <span style={{ color: '#333' }}>当前处理 Agent:</span>
      <Tag color={color}>{label}</Tag>
    </div>
  );
};
