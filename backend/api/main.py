"""
FastAPI 后端入口
智能旅游规划助手 - Multi-Agents 后端服务
"""
import sys
import os
from pathlib import Path

# 将项目根目录加入 Python 路径
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# 安装 multi_agents -> multi-agents 的导入映射（Python 不支持导入含连字符的模块名）
import importlib
import importlib.abc
import importlib.machinery

_actual_dir = project_root / "multi-agents"


class _MultiAgentsFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if not fullname.startswith('multi_agents'):
            return None
        if not _actual_dir.exists():
            return None

        if fullname == 'multi_agents':
            init_file = _actual_dir / "__init__.py"
            if init_file.exists():
                return importlib.util.spec_from_file_location(
                    'multi_agents', str(init_file),
                    loader=importlib.machinery.SourceFileLoader('multi_agents', str(init_file))
                )
        elif fullname.startswith('multi_agents.'):
            parts = fullname.split('.')[1:]
            for part in parts:
                if not part.isidentifier():
                    return None
            file_path = _actual_dir
            for part in parts:
                file_path = file_path / part
            py_file = file_path.with_suffix('.py')
            if py_file.exists():
                return importlib.util.spec_from_file_location(
                    fullname, str(py_file),
                    loader=importlib.machinery.SourceFileLoader(fullname, str(py_file))
                )
            pkg_init = file_path / "__init__.py"
            if pkg_init.exists():
                spec = importlib.util.spec_from_file_location(
                    fullname, str(pkg_init),
                    loader=importlib.machinery.SourceFileLoader(fullname, str(pkg_init))
                )
                if spec:
                    spec.submodule_search_locations = [str(file_path)]
                return spec
        return None


if not any(isinstance(f, _MultiAgentsFinder) for f in sys.meta_path):
    sys.meta_path.insert(0, _MultiAgentsFinder())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import warnings
import logging
import asyncio

# 加载环境变量
from pathlib import Path
from dotenv import load_dotenv
project_root = Path(__file__).parent.parent.parent
env_paths = [
    project_root / ".env",
    project_root / "multi-agents" / ".env",
    project_root / "aggentic_RAG" / ".env",
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        print(f"✅ 已加载环境变量: {env_path}")
        break

# 静默不必要的日志
logging.getLogger('mcp').setLevel(logging.ERROR)
logging.getLogger('anyio').setLevel(logging.ERROR)
logging.getLogger('asyncio').setLevel(logging.ERROR)

warnings.filterwarnings('ignore')

# 全局异常钩子
def custom_excepthook(type, value, traceback):
    if type.__name__ in ['RuntimeError', 'GeneratorExit', 'BaseExceptionGroup']:
        error_str = str(value)
        if any(keyword in error_str.lower() for keyword in [
            'async_generator', 'generator didn\'t stop',
            'taskgroup', 'cancel scope', 'sse_client'
        ]):
            return
    sys.__excepthook__(type, value, traceback)

sys.excepthook = custom_excepthook

# 全局事件循环（用于 MCP 调用）
_mcp_loop = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global _mcp_loop
    import asyncio

    _mcp_loop = asyncio.new_event_loop()
    _mcp_loop.set_exception_handler(lambda loop, ctx: None)
    asyncio.set_event_loop(_mcp_loop)

    from multi_agents.chat_history_manager import get_chat_history_manager
    get_chat_history_manager()

    print("✅ FastAPI 后端启动完成")

    yield

    if _mcp_loop:
        try:
            pending = asyncio.all_tasks(_mcp_loop)
            for task in pending:
                task.cancel()
            _mcp_loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        except Exception:
            pass
        finally:
            _mcp_loop.close()
            print("✅ 事件循环已关闭")


app = FastAPI(
    title="智能旅游规划助手 API",
    description="基于 Multi-Agents 架构的旅游规划后端服务",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.routes import chat, sessions, rag

app.include_router(chat.router, prefix="/api", tags=["聊天"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["会话管理"])
app.include_router(rag.router, prefix="/api/rag", tags=["知识库"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "travel-agent-backend"}


@app.get("/")
async def root():
    return {
        "service": "智能旅游规划助手 API",
        "version": "1.0.0",
        "docs": "/docs",
    }
