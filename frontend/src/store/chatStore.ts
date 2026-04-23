import { create } from 'zustand';
import type { ChatMessage, SessionInfo, RAGStats } from '../types';
import * as api from '../services/api';

interface ChatStore {
  // ========== 状态 ==========
  currentSessionId: string | null;
  messages: ChatMessage[];
  sessions: SessionInfo[];
  isLoading: boolean;
  isStreaming: boolean;
  currentAgent: string | null;
  ragStats: RAGStats | null;
  uploadedFilesCount: number;
  messagesCount: number;
  error: string | null;

  // ========== 会话管理 ==========
  initSession: () => Promise<void>;
  loadSessions: () => Promise<void>;
  createNewSession: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;

  // ========== 聊天 ==========
  sendMessage: (message: string) => Promise<void>;
  clearError: () => void;

  // ========== RAG ==========
  uploadFiles: (files: File[], forceRecreate?: boolean) => Promise<void>;
  loadRAGStats: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // ========== 初始状态 ==========
  currentSessionId: null,
  messages: [],
  sessions: [],
  isLoading: false,
  isStreaming: false,
  currentAgent: null,
  ragStats: null,
  uploadedFilesCount: 0,
  messagesCount: 0,
  error: null,

  // ========== 会话管理 ==========

  initSession: async () => {
    set({ isLoading: true, error: null });
    try {
      // 先获取会话列表
      const sessions = await api.getSessions();

      if (sessions.length > 0) {
        // 有历史会话，加载最近一个
        const lastSession = sessions[0]; // sessions 已按更新时间排序
        const messages = await api.getSessionMessages(lastSession.session_id);
        set({
          currentSessionId: lastSession.session_id,
          messages: messages.length > 0 ? messages : [getWelcomeMessage()],
          messagesCount: messages.length,
          sessions,
          isLoading: false,
        });
      } else {
        // 没有历史会话，创建新会话
        const { session_id } = await api.createSession();
        const updatedSessions = await api.getSessions();
        set({
          currentSessionId: session_id,
          messages: [getWelcomeMessage()],
          messagesCount: 1,
          sessions: updatedSessions,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error('初始化失败:', err);
      set({
        currentSessionId: null,
        messages: [],
        sessions: [],
        isLoading: false,
        error: err instanceof Error ? err.message : '初始化失败',
      });
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await api.getSessions();
      set({ sessions });
    } catch {
      // 静默失败
    }
  },

  createNewSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const { session_id } = await api.createSession();
      set({
        currentSessionId: session_id,
        messages: [getWelcomeMessage()],
        messagesCount: 1,
        sessions: await api.getSessions(),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建会话失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  switchSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const msgs = await api.getSessionMessages(sessionId);
      if (msgs.length === 0) {
        msgs.push(getWelcomeMessage());
      }
      set({
        currentSessionId: sessionId,
        messages: msgs,
        messagesCount: msgs.length,
        currentAgent: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载会话失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  removeSession: async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      const { currentSessionId, sessions } = get();
      const newSessions = sessions.filter((s) => s.session_id !== sessionId);
      if (currentSessionId === sessionId && newSessions.length > 0) {
        await get().switchSession(newSessions[0].session_id);
      } else if (newSessions.length === 0) {
        // 没有会话了，创建新会话
        const { session_id } = await api.createSession();
        set({
          currentSessionId: session_id,
          messages: [getWelcomeMessage()],
          messagesCount: 1,
          sessions: await api.getSessions(),
        });
        return;
      }
      set({ sessions: newSessions });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除会话失败' });
    }
  },

  // ========== 聊天 ==========

  sendMessage: async (message: string) => {
    const { currentSessionId } = get();
    if (!currentSessionId || get().isStreaming) return;

    // 先追加用户消息（乐观更新）
    const userMsg: ChatMessage = { role: 'user', content: message };
    set((state) => ({
      messages: [...state.messages, userMsg],
      messagesCount: state.messagesCount + 1,
      isStreaming: true,
      currentAgent: null,
      error: null,
    }));

    // 收集 AI 回复
    let fullContent = '';

    try {
      await api.sendMessageStream(
        currentSessionId,
        message,
        {
          onAgent: (agent) => {
            set({ currentAgent: agent });
          },
          onChunk: (content) => {
            fullContent = content;
          },
          onDone: (content) => {
            fullContent = content;
            const aiMsg: ChatMessage = { role: 'assistant', content };
            set((state) => ({
              messages: [...state.messages, aiMsg],
              messagesCount: state.messagesCount + 1,
            }));
          },
          onError: (error) => {
            const errorMsg: ChatMessage = { role: 'assistant', content: `错误: ${error}` };
            set((state) => ({
              messages: [...state.messages, errorMsg],
              error,
            }));
          },
        }
      );

      // 如果流式没有触发 onDone，也尝试保存
      if (!fullContent) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '发送消息失败',
      });
    } finally {
      set({ isStreaming: false, currentAgent: null });
    }
  },

  clearError: () => set({ error: null }),

  // ========== RAG ==========

  uploadFiles: async (files: File[], forceRecreate = false) => {
    set({ isLoading: true, error: null });
    try {
      await api.uploadDocuments(files, forceRecreate);
      set({ uploadedFilesCount: files.length });
      await get().loadRAGStats();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '上传文件失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadRAGStats: async () => {
    try {
      const ragStats = await api.getRAGStats();
      set({ ragStats });
    } catch {
      // 静默失败
    }
  },
}));

// ========== 辅助函数 ==========

// 欢迎消息
function getWelcomeMessage(): ChatMessage {
  return {
    role: 'assistant',
    content: `您好！我是智能旅游规划助手 (Multi-Agents版本)

我可以帮您：
- 查询景点攻略和美食推荐
- 查询火车票和航班信息
- 推荐酒店和住宿
- 查询天气预报
- 查询黄历吉日
- 规划自驾路线

请告诉我您的旅行需求吧！`,
  };
}
