#!/bin/bash
echo "=== 瞬知·KnowSense 停止 ==="

pkill -f "uvicorn app.main" 2>/dev/null && echo "✓ 后端已停止" || echo "后端未运行"
pkill -f "vite" 2>/dev/null && echo "✓ 前端已停止" || echo "前端未运行"

echo ""
echo "容器保持运行（如需停止：docker compose down）"
echo "  全部停止并清理: docker compose down -v"
