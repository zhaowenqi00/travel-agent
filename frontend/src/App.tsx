import { useEffect, useRef } from 'react';
import { Layout, Spin, Alert, Typography } from 'antd';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { ChatContainer } from './components/Chat/ChatContainer';
import { ChatInput } from './components/Chat/ChatInput';
import { AgentStatus } from './components/Chat/AgentStatus';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { useChatStore } from './store/chatStore';

const { Content } = Layout;
const { Text } = Typography;

function ChatPage() {
  const {
    currentSessionId,
    messages,
    isLoading,
    isStreaming,
    currentAgent,
    uploadedFilesCount,
    error,
    sendMessage,
  } = useChatStore();

  const showUploadTip = uploadedFilesCount === 0;

  return (
    <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <AgentStatus agent={currentAgent} error={error} />

      <Content
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafafa',
        }}
      >
        {isLoading && messages.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
            <Spin size="large" />
            <Text type="secondary">加载中...</Text>
            {error && <Alert type="error" message={`初始化错误: ${error}`} showIcon />}
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: '12px 20px 0' }}>
                <Alert type="warning" message={error} showIcon closable onClose={() => {}} />
              </div>
            )}
            {showUploadTip && (
              <div style={{ padding: '12px 20px 0' }}>
                <Alert
                  message="💡 提示：可以在「旅游攻略知识库」页面导入旅游攻略文档"
                  type="info"
                  showIcon
                />
              </div>
            )}
            <ChatContainer messages={messages} isStreaming={isStreaming} currentAgent={currentAgent} />
          </>
        )}
      </Content>

      <ChatInput onSend={sendMessage} disabled={isStreaming || !currentSessionId} />
    </Layout>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentSessionId,
    sessions,
    messagesCount,
    initSession,
    createNewSession,
    switchSession,
    removeSession,
  } = useChatStore();

  const hasInited = useRef(false);

  useEffect(() => {
    if (!hasInited.current) {
      hasInited.current = true;
      initSession();
    }
  }, [initSession]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        messagesCount={messagesCount}
        onSelectSession={switchSession}
        onCreateSession={createNewSession}
        onDeleteSession={removeSession}
        onNavigate={handleNavigate}
        isKnowledgePage={location.pathname === '/knowledge'}
      />

      <Content style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
