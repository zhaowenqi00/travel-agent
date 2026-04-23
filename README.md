# 智能旅行规划助手 (Travel Agent)

基于 Multi-Agents 架构的智能旅行规划系统，支持自然语言对话、实时数据查询和知识库检索。

> 本项目基于 [xiaoya5691/travel-agent](https://github.com/xiaoya5691/travel-agent) 二次开发。

## 主要改动

- **前端重构**：使用 React + Ant Design + Vite 构建现代化 UI
- **后端服务**：添加 FastAPI 后端提供 REST API
- **会话管理**：支持会话历史记录持久化
- **侧边栏**：支持切换对话和知识库
- **知识库**：独立的知识库管理页面，支持文档上传和检索

## 技术栈

**后端**
- LangGraph Multi-Agents 工作流
- LangChain Agent 框架
- FastAPI REST API
- ChromaDB 向量数据库
- DeepSeek R1 + Qwen3 双模型协作
- MCP (Model Context Protocol) 外部工具集成

**前端**
- React 18 + TypeScript
- Vite 构建工具
- Ant Design 组件库
- Zustand 状态管理
- React Router 路由

## 项目结构

```
travel-agent/
├── multi-agents/                 # Multi-Agents 后端核心
│   ├── agent_nodes/              # 各 Agent 实现
│   ├── graph/                    # LangGraph 工作流
│   ├── tools/                    # 工具集 (RAG/MCP)
│   ├── config/                   # 配置文件
│   └── data/                     # 数据目录
├── backend/                      # FastAPI 后端
│   └── api/                      # API 路由
│       ├── routes/               # API 端点
│       └── main.py               # 入口文件
├── frontend/                     # React 前端
│   └── src/
│       ├── components/           # 组件
│       ├── pages/               # 页面
│       ├── services/             # API 服务
│       ├── store/                # 状态管理
│       └── types/                # 类型定义
└── README.md
```

## 快速开始

### 1. 安装依赖

**后端依赖：**
```bash
cd travel-agent/multi-agents
pip install -r requirements.txt
```

**前端依赖：**
```bash
cd travel-agent/frontend
npm install
```

### 2. 配置环境变量

在 `multi-agents/.env` 中配置所有 API 密钥（后端会从此文件读取）：

```env
# ============================================================
# 统一 LLM API 配置（推荐阿里百炼）
# ============================================================
LLM_API_KEY=sk-your-dashscope-api-key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_PROVIDER=dashscope

# ============================================================
# 模型配置
# ============================================================
REASONING_MODEL=qwen-max
REASONING_TEMPERATURE=0.1

CHAT_MODEL=qwen-plus
CHAT_TEMPERATURE=0.7

EMBEDDING_MODEL=text-embedding-v3

# ============================================================
# MCP 配置
# ============================================================
MCP_CONFIG_PATH=config/servers_config.json
```

> 注意：后端 FastAPI 服务会从 `multi-agents/.env` 自动读取配置，无需单独配置。

### 3. 启动服务

**终端 1 - 启动后端：**
```bash
cd travel-agent/backend
uvicorn api.main:app --reload --port 8000
```

**终端 2 - 启动前端：**
```bash
cd travel-agent/frontend
npm run dev
```


## 功能特性

### 智能旅行规划
- 自然语言输入旅行需求
- 自动提取目的地、日期、预算等信息
- 生成完整旅行方案

### 实时数据查询
- 火车票查询 (12306)
- 自驾路线规划 (高德地图)
- 酒店推荐 (高德地图)
- 天气预报 (高德地图)
- 黄历宜忌查询

### 知识库管理
- 上传旅游攻略文档 (TXT/MD/PDF/CSV)
- 文档向量化存储
- 关键词智能检索

### 会话管理
- 会话历史自动保存
- 刷新页面恢复最近会话
- 支持多会话切换和管理

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/send` | POST | 发送消息（流式响应）|
| `/api/sessions/` | GET | 获取会话列表 |
| `/api/sessions/` | POST | 创建新会话 |
| `/api/sessions/latest` | GET | 获取最近会话 |
| `/api/sessions/{id}` | GET | 获取会话消息 |
| `/api/sessions/{id}` | DELETE | 删除会话 |
| `/api/rag/upload` | POST | 上传文档构建知识库 |
| `/api/rag/stats` | GET | 获取知识库统计 |
| `/api/rag/search` | POST | 搜索知识库 |

## 原项目致谢

本项目基于 [xiaoya5691/travel-agent](https://github.com/xiaoya5691) 开发。

原项目核心功能：
- LangGraph Multi-Agents 架构
- DeepSeek R1 + Qwen3 双模型协作
- MCP 外部工具集成 (12306/高德地图/黄历)
- RAG 向量检索

## 许可证

MIT License
