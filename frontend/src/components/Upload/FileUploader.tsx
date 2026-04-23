import React, { useState } from 'react';
import { Upload, Button, message, List, Alert, Typography, Modal } from 'antd';
import { InboxOutlined, UploadOutlined, DeleteOutlined, FileSearchOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

interface FileUploaderProps {
  onUpload?: (files: File[], forceRecreate?: boolean) => Promise<void>;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [forceRecreate, setForceRecreate] = useState(false);

  const props = {
    name: 'files',
    multiple: true,
    fileList,
    beforeUpload: (file: any) => {
      const allowedTypes = ['.txt', '.pdf', '.csv', '.md'];
      const ext = '.' + file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
      if (!allowedTypes.includes(ext)) {
        message.error(`${file.name} 格式不支持，请上传 txt、pdf、csv、md 文件`);
        return false;
      }
      setFileList((prev) => [...prev, file]);
      return false;
    },
    onRemove: (file: any) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    },
    onChange: (info: any) => {
      setFileList(info.fileList);
    },
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const files = fileList.map((f) => f.originFileObj || f);
      if (onUpload) {
        await onUpload(files, forceRecreate);
      }
      setUploadResult(
        `已上传 ${fileList.length} 个文件，知识库正在构建中...`
      );
      message.success('文档上传成功');
      setFileList([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = () => {
    setFileList([]);
    setUploadResult(null);
  };

  return (
    <div>
      <Dragger {...props} style={{ marginBottom: '12px' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽上传旅游攻略文档</p>
        <p className="ant-upload-hint" style={{ fontSize: '12px', color: '#999' }}>
          支持 TXT、PDF、CSV、MD 格式
        </p>
      </Dragger>

      {fileList.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              已选择 {fileList.length} 个文件
            </Typography.Text>
            <Button size="small" icon={<DeleteOutlined />} onClick={handleClearAll}>
              清空
            </Button>
          </div>
          <List
            size="small"
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}>
                {item.name}
              </List.Item>
            )}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <UploadOutlined style={{ color: '#666' }} />
        <Typography.Text
          style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}
          onClick={() => {
            Modal.confirm({
              title: '强制重建知识库',
              content: '强制重建会清空现有知识库数据后重新导入，确定要继续吗？',
              okText: '确定',
              cancelText: '取消',
              onOk: () => setForceRecreate(true),
            });
          }}
        >
          <FileSearchOutlined /> 高级选项（强制重建）
        </Typography.Text>
        {forceRecreate && (
          <Typography.Text type="danger" style={{ fontSize: '12px' }}>
            [强制重建模式]
          </Typography.Text>
        )}
      </div>

      <Button
        type="primary"
        icon={<UploadOutlined />}
        onClick={handleUpload}
        loading={uploading}
        disabled={fileList.length === 0}
        block
      >
        {uploading ? '正在构建索引...' : '上传并构建索引'}
      </Button>

      {uploadResult && (
        <Alert
          message={uploadResult}
          type="success"
          showIcon
          closable
          onClose={() => setUploadResult(null)}
          style={{ marginTop: '8px' }}
        />
      )}
    </div>
  );
};
