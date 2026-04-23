"""
RAG 知识库 API
支持文档上传、分块、向量化存储
复用了 multi_agents/tools/rag_tool.py 中的 TravelRAG 类
"""
import tempfile
import os
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from multi_agents.tools.rag_tool import TravelRAG, get_rag_instance, reset_rag_instance
from multi_agents.config.settings import CHROMA_PERSIST_DIR

router = APIRouter()


class RAGStatsResponse(BaseModel):
    total: int
    sources: List[str]


class RAGSearchResponse(BaseModel):
    query: str
    results: List[dict]


def _get_rag() -> TravelRAG:
    """获取 RAG 实例"""
    return get_rag_instance()


@router.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    force_recreate: bool = False,
):
    """
    上传文档，构建向量知识库

    - **files**: 支持 txt, pdf, csv, md 格式的文件
    - **force_recreate**: 是否强制重建（删除旧数据）
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # 过滤支持的文件
    supported_types = {".txt", ".md", ".pdf", ".csv"}
    valid_files = []
    for f in files:
        ext = Path(f.filename).suffix.lower()
        if ext in supported_types:
            valid_files.append(f)
        else:
            print(f"跳过不支持的文件: {f.filename} (类型: {ext})")

    if not valid_files:
        raise HTTPException(status_code=400, detail="No supported files found")

    # 创建临时目录存储上传的文件
    temp_dir = tempfile.mkdtemp(prefix="travel_rag_")

    try:
        # 写入临时文件
        for file in valid_files:
            filepath = os.path.join(temp_dir, file.filename)
            content = await file.read()
            with open(filepath, "wb") as f:
                f.write(content)

        # 获取 RAG 实例并构建知识库
        rag = _get_rag()
        rag.build_knowledge_base(
            source_path=temp_dir,
            file_type="directory",
            force_recreate=force_recreate
        )

        # 获取统计信息
        stats = rag.get_stats()

        return {
            "status": "ok",
            "files_loaded": [f.filename for f in valid_files],
            "total_chunks": stats.get("total", 0),
            "sources": stats.get("sources", []),
        }

    except Exception as e:
        print(f"上传文档失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 清理临时目录
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except Exception:
            pass


@router.get("/stats", response_model=RAGStatsResponse)
async def get_rag_stats():
    """获取知识库统计信息"""
    try:
        rag = _get_rag()
        stats = rag.get_stats()
        return RAGStatsResponse(
            total=stats.get("total", 0),
            sources=stats.get("sources", [])
        )
    except Exception as e:
        print(f"获取 RAG 统计失败: {e}")
        return RAGStatsResponse(total=0, sources=[])


@router.delete("/clear")
async def clear_rag():
    """
    清空知识库
    """
    try:
        rag = _get_rag()
        stats = rag.get_stats()
        total_deleted = 0
        for source in stats.get("sources", []):
            count = rag.delete_by_source(source)
            total_deleted += count

        return {
            "status": "ok",
            "message": f"已删除 {total_deleted} 条数据",
            "deleted_count": total_deleted
        }

    except Exception as e:
        print(f"清空知识库失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=RAGSearchResponse)
async def search_rag(query: str, k: int = 3):
    """
    搜索知识库

    - **query**: 搜索关键词
    - **k**: 返回结果数量
    """
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        rag = _get_rag()
        raw_results = await rag.search(query.strip(), k=k)

        # 解析结果为列表格式
        results = []
        if raw_results and "未找到" not in raw_results and "失败" not in raw_results:
            for item in raw_results.split("\n\n"):
                if item.strip():
                    # 简单解析：尝试分离来源和内容
                    lines = item.strip().split("\n", 1)
                    if len(lines) >= 2:
                        results.append({
                            "source": lines[0],
                            "content": lines[1]
                        })
                    else:
                        results.append({
                            "source": "未知",
                            "content": item
                        })

        return RAGSearchResponse(query=query, results=results)

    except Exception as e:
        print(f"搜索失败: {e}")
        return RAGSearchResponse(query=query, results=[])


@router.delete("/delete")
async def delete_by_source(source: str):
    """
    根据来源删除数据

    - **source**: 文件来源路径
    """
    if not source:
        raise HTTPException(status_code=400, detail="Source cannot be empty")

    try:
        rag = _get_rag()
        count = rag.delete_by_source(source)
        return {
            "status": "ok",
            "deleted_count": count,
            "source": source
        }
    except Exception as e:
        print(f"删除失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def rag_health():
    """检查 RAG 服务健康状态"""
    try:
        rag = _get_rag()
        stats = rag.get_stats()
        return {
            "status": "healthy",
            "initialized": rag.vector_store is not None,
            "total_chunks": stats.get("total", 0)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
