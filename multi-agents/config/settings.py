"""
全局配置文件
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

# 加载环境变量（查找多个可能的 .env 文件位置）
env_paths = [
    PROJECT_ROOT / ".env",
    PROJECT_ROOT / "multi-agents" / ".env",
    PROJECT_ROOT / "aggentic_RAG" / ".env",
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        print(f"✅ 已加载环境变量: {env_path}")
        break

# ============================================================
# 统一 LLM API 配置（只使用一个平台）
# ============================================================
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
# DashScope API Key（兼容旧代码）
DASHSCOPE_API_KEY = LLM_API_KEY
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "dashscope")  # dashscope | openai | siliconflow

# LangSmith配置（可选，仅用于调试）
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")

# ============================================================
# 模型配置（按用途分类，而非按平台）
# ============================================================

# 推理模型 - 用于复杂规划、计划制定（R1等推理模型）
REASONING_MODEL = os.getenv("REASONING_MODEL", "qwen-max")
REASONING_TEMPERATURE = float(os.getenv("REASONING_TEMPERATURE", "0.1"))

# 对话模型 - 用于日常对话、生成回复
CHAT_MODEL = os.getenv("CHAT_MODEL", "qwen-plus")
CHAT_TEMPERATURE = float(os.getenv("CHAT_TEMPERATURE", "0.7"))

# 向量化模型 - 用于文本嵌入、RAG检索
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-v3")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))

# RAG配置
CHROMA_PERSIST_DIR = PROJECT_ROOT / "data" / "vector_db"
RAG_CHUNK_SIZE = 500
RAG_CHUNK_OVERLAP = 50
RAG_SEARCH_K = 3
RAG_BATCH_SIZE = 10  # ChromaDB批量载入大小，如遇到API限制可调小

# MCP配置
MCP_CONFIG_PATH = str(PROJECT_ROOT / "config" / "servers_config.json")
