"""
会话管理 API
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from multi_agents.chat_history_manager import get_chat_history_manager, ChatSession, ChatMessage

router = APIRouter()


class CreateSessionRequest(BaseModel):
    model_config = {"populate_by_name": True}

    user_id: Optional[str] = "default_user"
    title: Optional[str] = None


class CreateSessionResponse(BaseModel):
    model_config = {"populate_by_name": True}

    session_id: str
    title: str


class SessionInfo(BaseModel):
    model_config = {"populate_by_name": True}

    session_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class MessageInfo(BaseModel):
    model_config = {"populate_by_name": True}

    role: str
    content: str


@router.get("/", response_model=List[SessionInfo])
async def list_sessions(limit: int = 50, user_id: Optional[str] = "default_user"):
    """获取用户的所有会话列表"""
    chat_manager = get_chat_history_manager()
    sessions = chat_manager.get_user_sessions(user_id=user_id, limit=limit)
    return [
        SessionInfo(
            session_id=s.session_id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=s.message_count,
        )
        for s in sessions
    ]


@router.post("/", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest):
    """创建新会话"""
    chat_manager = get_chat_history_manager()
    session_id = chat_manager.create_session(
        user_id=request.user_id,
        title=request.title,
    )
    sessions = chat_manager.get_user_sessions(user_id=request.user_id or "default_user", limit=1)
    title = sessions[0].title if sessions else "新对话"
    return CreateSessionResponse(session_id=session_id, title=title)


@router.get("/{session_id}", response_model=List[MessageInfo])
async def get_session_messages(session_id: str, user_id: Optional[str] = "default_user"):
    """获取指定会话的所有消息"""
    chat_manager = get_chat_history_manager()
    messages = chat_manager.get_session_messages(session_id)
    return [
        MessageInfo(
            role="user" if msg.message_type == "user" else "assistant",
            content=msg.content,
        )
        for msg in messages
    ]


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """删除指定会话"""
    chat_manager = get_chat_history_manager()
    chat_manager.delete_session(session_id)
    return {"status": "ok", "session_id": session_id}


@router.get("/{session_id}/info", response_model=SessionInfo)
async def get_session_info(session_id: str):
    """获取会话基本信息"""
    chat_manager = get_chat_history_manager()
    sessions = chat_manager.get_user_sessions(user_id="default_user", limit=100)
    for s in sessions:
        if s.session_id == session_id:
            return SessionInfo(
                session_id=s.session_id,
                title=s.title,
                created_at=s.created_at,
                updated_at=s.updated_at,
                message_count=s.message_count,
            )
    raise HTTPException(status_code=404, detail="Session not found")


@router.put("/{session_id}/title")
async def update_session_title(session_id: str, title: str):
    """更新会话标题"""
    chat_manager = get_chat_history_manager()
    chat_manager.update_session_title(session_id, title)
    return {"status": "ok", "session_id": session_id, "title": title}


@router.get("/latest")
async def get_last_session(user_id: Optional[str] = "default_user"):
    """获取最近一个会话（用于恢复会话）"""
    chat_manager = get_chat_history_manager()
    session = chat_manager.get_last_session(user_id=user_id)
    if session:
        return {
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": session.message_count,
        }
    return None
