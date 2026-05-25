# ---- Stage 1: 前端构建 ----
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: 运行时 ----
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg lsb-release wget ca-certificates \
    && mkdir -p /usr/share/postgresql-common \
    && curl -s https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor > /usr/share/postgresql-common/pgdg.gpg \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    postgresql-17 postgresql-17-pgvector \
    redis-server \
    python3 python3-venv python3-pip \
    nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

# MinIO 二进制
RUN wget -q -O /usr/local/bin/minio https://dl.min.io/server/minio/release/linux-amd64/minio \
    && chmod +x /usr/local/bin/minio

WORKDIR /app

# 后端依赖
COPY backend/requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY backend/ .

# 前端产物
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html

# Nginx 配置
COPY nginx/nginx.prod.conf /etc/nginx/nginx.conf

# Supervisor 配置
COPY supervisord.conf /etc/supervisor/supervisord.conf

# 初始化脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
