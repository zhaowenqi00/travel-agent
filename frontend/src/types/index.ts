// 聊天消息
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 会话信息
export interface SessionInfo {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

// 创建会话请求
export interface CreateSessionRequest {
  user_id?: string;
  title?: string;
}

// RAG 统计
export interface RAGStats {
  total: number;
  sources: string[];
}

// SSE 事件类型
export interface SSEAgentEvent {
  type: 'agent';
  agent: string;
}

export interface SSEDoneEvent {
  type: 'done';
  content: string;
  session_id: string;
}

export interface SSEErrorEvent {
  type: 'error';
  error: string;
}

export type SSEEvent = SSEAgentEvent | SSEDoneEvent | SSEErrorEvent;

// 上传响应
export interface UploadResponse {
  status: string;
  files_loaded: string[];
  docs_count: number;
  chunks_count: number;
  imported_count: number;
  persist_dir: string;
}
