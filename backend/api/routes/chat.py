"""
聊天 API - SSE 流式响应
"""
import json
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from langchain_core.messages import HumanMessage, AIMessage
from multi_agents.graph.workflow import travel_graph
from multi_agents.graph.state import GlobalState
from multi_agents.chat_history_manager import get_chat_history_manager

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_id: Optional[str] = "default_user"


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    current_agent: Optional[str] = None


def initialize_state(user_query: str, session_id: str, user_id: str = "default_user") -> GlobalState:
    """初始化 Multi-Agents 全局状态，从会话历史加载上下文"""
    chat_manager = get_chat_history_manager()
    
    # 加载历史消息
    history_messages = chat_manager.get_session_messages(session_id)
    
    # 转换为 LangChain 消息格式
    messages = []
    for msg in history_messages:
        if msg.message_type == "user":
            messages.append(HumanMessage(content=msg.content))
        else:  # ai message
            messages.append(AIMessage(content=msg.content))
    
    return {
        "user_query": None,
        "messages": messages,  # 包含历史消息
        "planner_context": None,
        "executor_context": None,
        "summarizer_context": None,
        "current_agent": None,
        "next_agent": None,
        "is_complete": False,
    }


async def run_multi_agents_streaming(user_query: str, state: GlobalState):
    """
    运行 Multi-Agents 系统
    返回完整执行结果
    """
    state["user_query"] = user_query
    state["messages"].append(HumanMessage(content=user_query))
    state["is_complete"] = False
    state["current_agent"] = None
    state["next_agent"] = None
    state["planner_context"] = None
    state["executor_context"] = None
    state["summarizer_context"] = None

    # 使用 ainvoke 获取完整执行结果
    result = await travel_graph.ainvoke(state)
    yield result


def extract_answer(result: GlobalState) -> tuple[str, Optional[str]]:
    """从最终状态中提取回答和当前 Agent"""
    answer = "处理完成，但没有生成回答。"
    current_agent = result.get("current_agent", None)

    # 优先级：clarification_question > summarizer > messages
    if result.get("planner_context") and result["planner_context"].get("needs_clarification", False):
        answer = result["planner_context"].get("clarification_question", "请提供更多信息")
    elif result.get("summarizer_context") and result["summarizer_context"].get("final_summary"):
        answer = result["summarizer_context"]["final_summary"]
    elif result.get("is_complete") and result.get("messages"):
        for msg in reversed(result["messages"]):
            try:
                if isinstance(msg, AIMessage) and msg.content:
                    answer = msg.content
                    break
                if hasattr(msg, 'type') and msg.type == 'ai' and getattr(msg, 'content', ''):
                    answer = getattr(msg, 'content', '')
                    break
            except Exception:
                continue

    return answer, current_agent


@router.post("/chat/send")
async def send_message(request: ChatRequest):
    """
    发送聊天消息（SSE 流式响应）

    前端通过 EventSource 或 fetch + ReadableStream 消费：
    - event: agent     → 当前执行的 Agent 名称
    - event: done     → 最终回答
    - event: error    → 错误信息
    """
    session_id = request.session_id
    user_query = request.message
    chat_manager = get_chat_history_manager()

    async def event_generator():
        nonlocal session_id
        try:
            # 保存用户消息
            chat_manager.add_message(
                session_id=session_id,
                message_type="user",
                content=user_query,
                user_id=request.user_id,
            )

            state = initialize_state(user_query, session_id, request.user_id)

            final_result = None
            agent_name = None

            # 运行 Multi-Agents 系统
            async for chunk in run_multi_agents_streaming(user_query, state):
                # 记录当前 Agent
                if chunk.get("current_agent"):
                    agent_name = chunk["current_agent"]
                    yield f"event: agent\ndata: {json.dumps({'agent': agent_name})}\n\n"
                
                # 收集最终结果（最后一次迭代的结果）
                final_result = chunk

            # 如果没有获取到结果，发送错误消息
            if final_result is None:
                error_msg = "抱歉，处理您的请求时出现错误（未能获取最终结果）"
                yield f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"
                chat_manager.add_message(
                    session_id=session_id,
                    message_type="ai",
                    content=error_msg,
                    user_id=request.user_id,
                )
            else:
                # 提取回答
                answer, current_agent = extract_answer(final_result)
                yield f"event: agent\ndata: {json.dumps({'agent': current_agent or agent_name or 'unknown'})}\n\n"
                yield f"event: done\ndata: {json.dumps({'content': answer, 'session_id': session_id})}\n\n"

                # 保存 AI 回答
                chat_manager.add_message(
                    session_id=session_id,
                    message_type="ai",
                    content=answer,
                    user_id=request.user_id,
                )

        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg = f"抱歉，Multi-Agents处理您的请求时出现错误：{str(e)}"
            yield f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"

    return __import__('fastapi').responses.StreamingResponse(
        event_generator(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/send_sync", response_model=ChatResponse)
async def send_message_sync(request: ChatRequest):
    """
    同步版本的聊天接口（非流式）
    适用于不需要实时反馈的场景
    """
    session_id = request.session_id
    user_query = request.message
    chat_manager = get_chat_history_manager()

    try:
        # 保存用户消息
        chat_manager.add_message(
            session_id=session_id,
            message_type="user",
            content=user_query,
            user_id=request.user_id,
        )

        state = initialize_state(user_query, session_id, request.user_id)
        result = await travel_graph.ainvoke(state)

        answer, current_agent = extract_answer(result)

        # 保存 AI 回答
        chat_manager.add_message(
            session_id=session_id,
            message_type="ai",
            content=answer,
            user_id=request.user_id,
        )

        return ChatResponse(
            session_id=session_id,
            answer=answer,
            current_agent=current_agent,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = f"抱歉，Multi-Agents处理您的请求时出现错误：{str(e)}"
        chat_manager.add_message(
            session_id=session_id,
            message_type="ai",
            content=error_msg,
            user_id=request.user_id,
        )
        raise HTTPException(status_code=500, detail=error_msg)
