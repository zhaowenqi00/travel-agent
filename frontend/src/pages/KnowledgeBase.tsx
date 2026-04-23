import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Upload,
  Space,
  Tag,
  Popconfirm,
  message,
  Input,
  Typography,
  Alert,
  Spin,
  Tooltip,
  Descriptions,
  Divider,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadDocuments, getRAGStats, clearRAG, searchRAG, deleteBySource, ragHealthCheck } from '../services/api';

const { Title, Text } = Typography;
const { Search } = Input;

interface SourceInfo {
  key: string;
  name: string;
  path: string;
}

export const KnowledgeBase: React.FC = () => {
  const [stats, setStats] = useState<{ total: number; sources: string[] }>({ total: 0, sources: [] });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ source: string; content: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [health, setHealth] = useState<{ status: string; initialized: boolean; total_chunks: number } | null>(null);

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      const [statsData, healthData] = await Promise.all([getRAGStats(), ragHealthCheck()]);
      setStats(statsData);
      setHealth(healthData);
    } catch (err) {
      console.error('加载统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 上传文档
  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    accept: '.txt,.md,.pdf,.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      setUploading(true);
      try {
        await uploadDocuments([file], false, (msg) => message.info(msg));
        message.success('文档上传成功');
        await loadStats();
      } catch (err) {
        message.error('上传失败');
        console.error(err);
      } finally {
        setUploading(false);
      }
      return false; // 阻止默认上传
    },
  };

  // 批量上传
  const handleBatchUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const files = Array.isArray(file) ? file : [file];
      await uploadDocuments(files as File[], false);
      message.success('批量上传成功');
      await loadStats();
      onSuccess?.({});
    } catch (err) {
      message.error('批量上传失败');
      onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  // 清空知识库
  const handleClear = async (force: boolean) => {
    try {
      await clearRAG(force);
      message.success('知识库已清空');
      await loadStats();
    } catch (err) {
      message.error('清空失败');
      console.error(err);
    }
  };

  // 删除指定来源
  const handleDeleteSource = async (source: string) => {
    try {
      await deleteBySource(source);
      message.success('删除成功');
      await loadStats();
    } catch (err) {
      message.error('删除失败');
      console.error(err);
    }
  };

  // 搜索知识库
  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    setSearchQuery(value);
    setSearching(true);
    try {
      const result = await searchRAG(value.trim(), 5);
      setSearchResults(result.results || []);
    } catch (err) {
      message.error('搜索失败');
      console.error(err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 解析来源名称
  const getSourceName = (path: string): string => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || path;
  };

  // 来源数据源
  const sourceData: SourceInfo[] = stats.sources.map((source, index) => ({
    key: source,
    name: getSourceName(source),
    path: source,
  }));

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <FileTextOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '来源路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (path: string) => (
        <Tooltip title={path}>
          <Text type="secondary" style={{ fontSize: '12px' }}>{path}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: SourceInfo) => (
        <Popconfirm
          title="确定删除此文档？"
          description="将删除该文档相关的所有数据块"
          onConfirm={() => handleDeleteSource(record.path)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={3} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DatabaseOutlined />
          知识库管理
        </Title>

      {/* 统计信息卡片 */}
      <Card style={{ marginBottom: '16px' }}>
        <Descriptions bordered column={3} size="small">
          <Descriptions.Item label="状态">
            {loading ? <Spin size="small" /> : (
              <Tag color={health?.initialized ? 'success' : 'default'}>
                {health?.initialized ? '已初始化' : '未初始化'}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="总数据块">
            <Tag color="blue">{stats.total}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="文档数量">
            <Tag color="green">{stats.sources.length}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 上传区域 */}
      <Card
        title="上传文档"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadStats}
              loading={loading}
            >
              刷新
            </Button>
            <Popconfirm
              title="确定清空知识库？"
              description="此操作将删除所有数据，且不可恢复"
              onConfirm={() => handleClear(true)}
              okText="确定清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                清空全部
              </Button>
            </Popconfirm>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Upload.Dragger
          {...uploadProps}
          customRequest={handleBatchUpload}
          multiple
          showUploadList={false}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽上传文档</p>
          <p className="ant-upload-hint">
            支持 txt、md、pdf、csv 格式，可批量上传
          </p>
          {uploading && <Spin tip="正在处理..." />}
        </Upload.Dragger>
      </Card>

      {/* 搜索区域 */}
      <Card title="知识检索" style={{ marginBottom: '16px' }}>
        <Search
          placeholder="输入关键词搜索知识库..."
          allowClear
          enterButton={
            <Button type="primary" icon={<SearchOutlined />} loading={searching}>
              搜索
            </Button>
          }
          onSearch={handleSearch}
          style={{ marginBottom: '16px' }}
        />

        {searchResults.length > 0 ? (
          <div>
            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
              找到 {searchResults.length} 条相关结果
            </Text>
            {searchResults.map((result, index) => (
              <Card key={index} size="small" style={{ marginBottom: '12px' }}>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{result.content}</Text>
              </Card>
            ))}
          </div>
        ) : searchQuery && !searching ? (
          <Alert message="未找到相关结果" type="info" showIcon />
        ) : (
          <Alert
            message="使用说明"
            description="输入关键词可以快速检索知识库中的相关内容"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />
        )}
      </Card>

      {/* 文档列表 */}
      <Card title="已加载文档">
        {stats.sources.length > 0 ? (
          <Table
            columns={columns}
            dataSource={sourceData}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        ) : (
          <Alert
            message="暂无文档"
            description="请上传旅游攻略文档以构建知识库"
            type="info"
            showIcon
          />
        )}
      </Card>
      </div>
    </div>
  );
};
