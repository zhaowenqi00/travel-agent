import axios from 'axios';
import type {
  ChatMessage,
  SessionInfo,
  CreateSessionRequest,
  RAGStats,
  UploadResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5分钟超时（Multi-Agents 执行可能较长）
  // 保持原始字段名，不自动转换 snake_case 到 camelCase
  transformResponse: [
    (data) => {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    },
  ],
});

// ========== 会话管理 ==========

/** 获取所有会话列表 */
export async function getSessions(limit = 50): Promise<SessionInfo[]> {
  const res = await api.get<any[]>('/api/sessions/', { params: { limit } });
  return res.data.map((item) => ({
    session_id: item.sessionId || item.session_id,
    title: item.title,
    created_at: item.createdAt || item.created_at,
    updated_at: item.updatedAt || item.updated_at,
    message_count: item.messageCount || item.message_count,
  }));
}

/** 获取最近一个会话 */
export async function getLastSession(): Promise<SessionInfo | null> {
  try {
    const res = await api.get<any>('/api/sessions/latest');
    if (!res.data) return null;
    const item = res.data;
    return {
      session_id: item.sessionId || item.session_id,
      title: item.title,
      created_at: item.createdAt || item.created_at,
      updated_at: item.updatedAt || item.updated_at,
      message_count: item.messageCount || item.message_count,
    };
  } catch {
    return null;
  }
}

/** 创建新会话 */
export async function createSession(data?: CreateSessionRequest): Promise<{ session_id: string; title: string }> {
  const res = await api.post<any>('/api/sessions/', data || {});
  return {
    session_id: res.data.sessionId || res.data.session_id,
    title: res.data.title,
  };
}

/** 获取会话消息 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await api.get<ChatMessage[]>(`/api/sessions/${sessionId}`);
  return res.data;
}

/** 删除会话 */
export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/api/sessions/${sessionId}`);
}

/** 更新会话标题 */
export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  await api.put(`/api/sessions/${sessionId}/title`, null, { params: { title } });
}

// ========== 聊天 ==========

/**
 * 发送聊天消息（SSE 流式）
 * @param sessionId 会话 ID
 * @param message 消息内容
 * @param callbacks 回调
 */
export function sendMessageSSE(
  sessionId: string,
  message: string,
  callbacks: {
    onAgent?: (agent: string) => void;
    onDone?: (content: string) => void;
    onError?: (error: string) => void;
    onFinally?: () => void;
  }
): () => void {
  const { onAgent, onDone, onError, onFinally } = callbacks;
  let closed = false;

  const url = `${API_BASE}/api/chat/send`;

  const eventSource = new EventSource(`${url}?session_id=${encodeURIComponent(sessionId)}&message=${encodeURIComponent(message)}`);

  eventSource.addEventListener('agent', (e) => {
    if (closed) return;
    try {
      const data = JSON.parse(e.data);
      onAgent?.(data.agent);
    } catch {}
  });

  eventSource.addEventListener('done', (e) => {
    if (closed) return;
    try {
      const data = JSON.parse(e.data);
      onDone?.(data.content);
    } catch {}
  });

  eventSource.addEventListener('error', (e) => {
    if (closed) return;
    try {
      const data = JSON.parse((e as MessageEvent).data);
      onError?.(data.error);
    } catch {
      onError?.('连接失败，请检查后端服务');
    }
  });

  eventSource.onerror = () => {
    if (closed) return;
    closed = true;
    eventSource.close();
    onFinally?.();
  };

  return () => {
    closed = true;
    eventSource.close();
    onFinally?.();
  };
}

/**
 * 使用 fetch + ReadableStream 消费 SSE（更可靠）
 */
export async function sendMessageStream(
  sessionId: string,
  message: string,
  callbacks: {
    onAgent?: (agent: string) => void;
    onChunk?: (content: string) => void;
    onDone?: (content: string) => void;
    onError?: (error: string) => void;
  }
): Promise<void> {
  const { onAgent, onDone, onError } = callbacks;

  const url = `${API_BASE}/api/chat/send`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let done = false;
    let currentEventType = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '') {
            currentEventType = '';
            continue;
          }
          
          if (trimmedLine.startsWith('event:')) {
            const colonIndex = trimmedLine.indexOf(':');
            currentEventType = trimmedLine.slice(colonIndex + 1).trim();
            continue;
          }
          
          if (trimmedLine.startsWith('data:')) {
            let dataStr = trimmedLine.slice(4).trim();
            // 处理后端可能发送的 "data: : {...}" 格式（多了一个冒号）
            if (dataStr.startsWith(':')) {
              dataStr = dataStr.slice(1).trim();
            }
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (currentEventType === 'agent' && data.agent) {
                onAgent?.(data.agent);
              } else if (currentEventType === 'done' && data.content !== undefined) {
                fullContent = data.content;
                onDone?.(data.content);
              } else if (currentEventType === 'error' && data.error) {
                onError?.(data.error);
                return;
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
        
        if (done && buffer.trim()) {
          const remainingLines = buffer.split('\n');
          let lastEventType = currentEventType;
          
          for (const line of remainingLines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine === '') continue;
            
            if (trimmedLine.startsWith('event:')) {
              const colonIndex = trimmedLine.indexOf(':');
              lastEventType = trimmedLine.slice(colonIndex + 1).trim();
              continue;
            }
            
            if (trimmedLine.startsWith('data:')) {
              let dataStr = trimmedLine.slice(4).trim();
              // 处理后端可能发送的 "data: : {...}" 格式（多了一个冒号）
              if (dataStr.startsWith(':')) {
                dataStr = dataStr.slice(1).trim();
              }
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                
                if (lastEventType === 'done' && data.content !== undefined) {
                  fullContent = data.content;
                  onDone?.(data.content);
                } else if (lastEventType === 'error' && data.error) {
                  onError?.(data.error);
                } else if (lastEventType === 'agent' && data.agent) {
                  onAgent?.(data.agent);
                }
              } catch (parseErr) {
                console.error('[SSE] Buffer parse error:', parseErr);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    onError?.(err instanceof Error ? err.message : '请求失败');
  }
}

// ========== RAG ==========

/** 上传文档构建向量库 */
export async function uploadDocuments(
  files: File[],
  forceRecreate = false,
  onProgress?: (msg: string) => void
): Promise<UploadResponse> {
  onProgress?.('正在准备文件...');

  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  formData.append('force_recreate', String(forceRecreate));

  onProgress?.('正在上传和构建向量索引...');

  const res = await api.post<UploadResponse>('/api/rag/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  onProgress?.(`已加载 ${res.data.files_loaded.length} 个文件`);
  return res.data;
}

/** 获取 RAG 统计 */
export async function getRAGStats(): Promise<RAGStats> {
  const res = await api.get<RAGStats>('/api/rag/stats');
  return res.data;
}

/** 清空知识库 */
export async function clearRAG(force = false): Promise<{ message: string }> {
  const res = await api.delete('/api/rag/clear', { params: { force } });
  return res.data;
}

/** 搜索知识库 */
export async function searchRAG(query: string, k = 5): Promise<{ query: string; results: Array<{ source: string; content: string }> }> {
  const res = await api.post('/api/rag/search', null, { params: { query, k } });
  return res.data;
}

/** 根据来源删除数据 */
export async function deleteBySource(source: string): Promise<{ deleted_count: number }> {
  const res = await api.delete('/api/rag/delete', { params: { source } });
  return res.data;
}

/** RAG 健康检查 */
export async function ragHealthCheck(): Promise<{ status: string; initialized: boolean; total_chunks: number }> {
  const res = await api.get('/api/rag/health');
  return res.data;
}

// ========== 健康检查 ==========

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await api.get('/api/health');
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}
