#!/bin/bash
set -e

MODE=${1:-dev}
cd "$(dirname "$0")"

echo "=== 瞬知·KnowSense 启动 ($MODE) ==="

if [ "$MODE" = "prod" ]; then
    echo "构建并启动..."
    docker compose up -d --build
    echo ""
    echo "  应用: http://localhost:18080"
    echo "  健康: http://localhost:18080/api/v1/health"
    echo ""
    echo "停止: docker compose down"
else
    echo "[1/2] 启动基础设施..."
    docker compose up -d postgres redis minio
    sleep 5

    echo "[2/2] 启动后端 + 前端..."
    cd backend
    source ../venv/bin/activate 2>/dev/null || true
    uvicorn app.main:app --host 0.0.0.0 --port 18000 &
    cd ..
    cd frontend && npm run dev -- --host &
    cd ..

    echo ""
    echo "  前端: http://localhost:15173"
    echo "  API:  http://localhost:18000/api/v1/health"
    echo ""
    echo "停止: ./stop.sh"
fi

wait
