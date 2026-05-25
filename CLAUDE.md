# 瞬知·KnowSense

## 项目概述

**一句话定义：** 面向 C 端消费者的 AI 说明书智能问答平台——用户拍照上传说明书，通过自然语言对话查询说明书中任意内容。

**做什么（一期）：**
- 用户注册登录（JWT）
- 说明书分组管理：新建分组（产品名称必填，品牌/型号/品类可选）、增删照片、补充上传
- 照片上传：多选 → 编辑调整 → 确认，存 MinIO
- 处理进度：SSE 实时推送 OCR/向量化处理状态
- 后台处理流水线：OCR 文字提取 → 文本分块 → 向量化 → 混合检索入库
- 对话问答：单消息入口，SSE 流式返回，回答附带来源引用
- 对话管理：对话列表、消息历史

**不做什么：**
- B 端商家 SaaS（无后台、付费、数据分析、定制化）
- 方言识别（一期只做普通话）
- 多模态图文解析（一期只做 OCR 文字提取，示意图理解纳入后期）
- 小程序端（一期只做 Web）
- 不绑扣子（Coze）等第三方 AI 中台，从零自建

**技术栈：**

| 层 | 选型 |
|---|-----|
| 前端 | React（设计感要求高） |
| 后端 | FastAPI (Python) |
| 数据库 | PostgreSQL + pgvector |
| 缓存/队列/会话 | Redis |
| 对象存储 | MinIO |
| 分词 | jieba（默认词典，上线后按需补自定义词） |
| OCR | PaddleOCR API |
| LLM | 通用端点，不绑定厂商 |
| Embedding | 通用 Embedding API |
| 部署 | 单镜像 Docker 容器（内嵌 PG + Redis + MinIO + Nginx + FastAPI + Worker） |

**核心约束：**
- 1 人开发
- 先 Web，后小程序
- 一期快速交付，跑通核心链路

---

## 架构设计

### 应用架构模式

模块化单体：单一 FastAPI 应用，内部 7 个业务模块 + 1 个公共模块。每个模块自含 router / service / models 三层，模块间只能通过 service 接口解耦。小程序端接入时后端 API 不变，仅前端新增项目。

### 模块划分与依赖

```
common ────────────────────────────── 无依赖（基础模块）
  ├── auth ────────────────────────── 依赖 common
  ├── storage ─────────────────────── 依赖 common
  ├── knowledge ───────────────────── 依赖 common
  │     ├── manual ────────────────── 依赖 auth, common
  │     └── chat ──────────────────── 依赖 auth, knowledge, common
  └── pipeline ────────────────────── 依赖 storage, knowledge, common
```

| 模块 | 职责 | 允许 import |
|-----|------|------------|
| `common` | 全局配置、自定义异常类、公共 ORM 基类（Base）、中间件、SSE 工具 | 无外部模块 |
| `auth` | 注册、登录、JWT 签发/刷新、黑名单管理 | `common` |
| `manual` | 说明书分组的 CRUD、OCR 处理状态查询 | `auth`, `common` |
| `storage` | MinIO 文件上传/下载/删除 | `common` |
| `pipeline` | OCR → 分块 → 向量化 后台任务编排 | `storage`, `knowledge`, `common` |
| `knowledge` | pgvector 读写、tsvector 全文搜索、混合检索原语 | `common` |
| `chat` | 对话 SSE、Prompt 拼装、LLM 调用编排 | `auth`, `knowledge`, `common` |

无循环依赖。新增模块时必须先更新此依赖表确认无环。

### 目录结构与分层职责

```
backend/app/
├── main.py                         # FastAPI app 实例化、中间件注册、路由挂载
├── common/
│   ├── config.py                   # 所有环境变量集中读取
│   ├── exceptions.py               # 自定义异常类，统一错误码
│   ├── models.py                   # 仅放 Base = declarative_base() 和公共 mixin
│   ├── middleware.py               # 限流中间件、请求日志中间件
│   └── sse.py                      # SSE 消息封装
├── auth/
│   ├── router.py                   # POST /register, /login, /refresh, /logout
│   ├── service.py                  # register_user, authenticate_user, issue_token, revoke_token
│   ├── models.py                   # User ORM, TokenBlacklist ORM
│   └── jwt.py                      # create_access_token, decode_token
├── manual/
│   ├── router.py                   # CRUD /manuals, GET /manuals/{id}/progress
│   ├── service.py                  # create_manual, list_manuals, get_processing_status
│   └── models.py                   # Manual ORM
├── storage/
│   ├── router.py                   # 文件上传/下载/删除接口
│   ├── service.py                  # MinIO SDK 封装（upload, get_url, delete）
│   └── models.py                   # FileRecord ORM
├── knowledge/
│   ├── service.py                  # store_embeddings, hybrid_search, fulltext_search
│   ├── retriever.py                # 混合检索编排 + RRF 融合 + Top-K 截断
│   └── models.py                   # Chunk ORM（含 pgvector 列）
├── pipeline/
│   ├── worker.py                   # Redis Queue Worker 主循环，独立进程启动
│   ├── ocr.py                      # PaddleOCR API 调用
│   ├── chunker.py                  # 文本分块（按标题/段落）
│   ├── embedder.py                 # 调 Embedding API 生成向量
│   └── models.py
└── chat/
    ├── router.py                   # POST /conversations/{id}/messages（SSE）
    ├── service.py                  # 对话编排
    ├── prompt.py                   # Prompt 模板
    └── models.py                   # Conversation ORM, Message ORM
```

### 分层职责铁律

| 层 | 文件 | 允许做 | 禁止做 |
|---|------|--------|--------|
| 路由层 | `router.py` | 参数校验、调 service、返回响应 | 写任何业务条件判断或数据库查询 |
| 业务层 | `service.py` | 业务规则、流程编排、调用其他模块 service | 直接执行数据库/外部 API 调用 |
| 数据层 | `knowledge/service.py`、`storage/service.py` | 数据库 CRUD、MinIO 操作、外部 API HTTP 请求 | 写业务规则 |

### 跨模块调用铁律

**唯一入口：** 跨模块调用只能 `from <module>.service import <func>`。

**三项禁止：**
1. 禁止直接引用其他模块的 ORM Model
2. 禁止引用其他模块的内部工具模块
3. 禁止直接查询其他模块的数据库表

**数据传递：** 跨模块传数据统一用 Pydantic schema 或 Python dataclass，禁止直接传递 SQLAlchemy Model 实例跨模块边界。

### 外部依赖调用处理

所有外部 HTTP 调用统一使用 `httpx.AsyncClient`，使用 `tenacity` 实现重试。仅 `ConnectError`、`ReadTimeout`、`RemoteProtocolError` 触发重试；HTTP 4xx/5xx 直接向上传播。

| 外部服务 | 超时 | 重试策略 | 降级 |
|---------|------|---------|------|
| LLM API | connect=15s, read=30s | 网络错误重试 2 次；429 退避 5s 后重试 1 次；401/403/400 不重试 | SSE 推送 "服务繁忙，请稍后重试" |
| Embedding API | connect=10s, read=10s | 网络错误重试 1 次 | 单条失败 continue，不阻断整批 |
| PaddleOCR API | connect=30s, read=30s | 网络错误重试 1 次 | 任务标记 failed，用户可手动重试 |
| MinIO | connect=10s, read=10s | 网络错误重试 1 次 | 本地容器，假设稳定；耗尽抛异常 |

### Pipeline 企业级设计

**独立进程：** `pipeline/worker.py` 独立于 Uvicorn 主进程，由 Supervisor 管理。FastAPI 只负责任务入队。

**两阶段队列解耦：**
```
pipeline:ocr → (OCR + Chunker → Embed) → pipeline:embed → (Embedder → pgvector)
```
Worker 内两个循环：OCR loop BRPOP `pipeline:ocr`，Embed loop BRPOP `pipeline:embed`。阶段间不直接函数调用，只通过 Redis LIST 传递 task_id。

**关键设计：**
- 任务幂等：UUID task_id，处理前检查 Redis Hash 中 status == "done" 则跳过
- 进度上报：按页 `HSET pipeline:task:{task_id} progress "3/15"`，SSE 端点每 500ms 读 Hash 推前端
- 死信处理：重试 3 次后 `RPUSH pipeline:dead`，不自动重试，手动排查后重新入队
- OCR 回写：OCR 完成后 UPDATE image_page SET ocr_text + ocr_status
- 状态回调：所有 image_page OCR done → UPDATE manual SET status = 'done'
- jieba 分词：存入时 jieba 分词 → to_tsvector，检索时 jieba 分词 → plainto_tsquery
- 无检索结果降级：直接返回"请先上传说明书"，不调 LLM

### Redis 全部使用场景

| 场景 | 数据结构 | Key 格式 | 过期策略 |
|-----|---------|---------|---------|
| 对话上下文 | LIST | `chat:context:{conv_id}` | 对齐会话 TTL，LPUSH + LTRIM 保留 10 轮 |
| OCR 任务队列 | LIST | `pipeline:ocr` | 无过期 |
| 向量化任务队列 | LIST | `pipeline:embed` | 无过期 |
| 任务状态 | HASH | `pipeline:task:{task_id}` | 完成 1h 后过期 |
| 死信队列 | LIST | `pipeline:dead` | 无过期 |
| JWT 黑名单 | SET | `auth:blacklist:{jti}` | 对齐 JWT 剩余有效期 |
| 用户会话 | STRING | `auth:session:{user_id}` | SETEX 7 天，滑动刷新 |
| 限流（对话） | STRING | `rate:{user_id}:chat` | 窗口 1 分钟 |

---

## 部署与数据库规范

### 部署拓扑

**单镜像容器**——所有组件打包到一个 Docker 镜像，`docker compose up -d --build` 一键启动。

| 组件 | 运行方式 | 持久化 |
|------|---------|--------|
| PostgreSQL 17 + pgvector | entrypoint 脚本 init + start | `/data/pg` |
| Redis 7 | entrypoint 脚本 start | `/data/redis` |
| MinIO | entrypoint 脚本 start | `/data/minio` |
| Nginx | Supervisor 管理 | 无状态 |
| FastAPI | Supervisor 管理 | 无状态 |
| Pipeline Worker | Supervisor 管理 | 无状态 |

**对外端口：**

| 服务 | 端口 |
|-----|------|
| 应用（Nginx → 前端 + API） | 18080 |
| PostgreSQL | 15432 |
| Redis | 16379 |
| MinIO API | 19000 |
| MinIO Console | 19001 |

**请求链路（对话）：**
```
Browser → Nginx (:80 内) → FastAPI (:8000 内)
  → auth 中间件（Redis :6379 内 校验 JWT）
  → chat.service → knowledge.service（PG :5432 内 混合检索）
  → LLM API → SSE 流式返回
```

**请求链路（上传）：**
```
Browser → Nginx → FastAPI
  → manual.service（PG 写记录）
  → storage.service（MinIO :9000 内 存图）
  → Redis LPUSH 入队
  → Pipeline Worker（BRPOP → OCR → Chunk → Embed → pgvector）
  → SSE 推送进度
```

**容器内进程启动顺序：** entrypoint.sh → PostgreSQL init/start → Redis start → MinIO start → 就绪后 Supervisor 接管 Nginx + FastAPI + Worker。

### 数据库设计规范

- 主键：全部表使用 UUID v4，`DEFAULT gen_random_uuid()`
- 通用字段：每表必有 `id UUID PK`、`created_at TIMESTAMPTZ NOT NULL`、`updated_at TIMESTAMPTZ NOT NULL`、`deleted_at TIMESTAMPTZ`（软删除）
- NULL 处理：语义区分——字段不存在用 NULL，存在但空白用 `''`
- 枚举：`VARCHAR(n) NOT NULL` + 应用层校验，禁止使用 PostgreSQL ENUM 类型
- 外键：必须建 FOREIGN KEY 约束
- 字符集：UTF-8

### 6 张核心表

```sql
CREATE TABLE "user" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE "manual" (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES "user"(id),
    product_name VARCHAR(200) NOT NULL,
    brand        VARCHAR(100),
    model        VARCHAR(100),
    category     VARCHAR(100),
    total_pages  INTEGER DEFAULT 0,
    status       VARCHAR(20) DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE "image_page" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id   UUID NOT NULL REFERENCES "manual"(id),
    page_number INTEGER NOT NULL,
    minio_path  VARCHAR(500) NOT NULL,
    ocr_text    TEXT,
    ocr_status  VARCHAR(20) DEFAULT 'pending',
    ocr_error   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT uq_image_page_manual_page UNIQUE (manual_id, page_number)
);

CREATE TABLE "chunk" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id     UUID NOT NULL REFERENCES "manual"(id),
    image_page_id UUID REFERENCES "image_page"(id),
    chunk_index   INTEGER NOT NULL,
    content       TEXT NOT NULL,
    embedding     vector(1536),
    search_vector tsvector,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE "conversation" (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES "user"(id),
    title      VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE "message" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES "conversation"(id),
    role            VARCHAR(10) NOT NULL,
    content         TEXT NOT NULL,
    citations       JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
```

### 索引

```sql
-- User
CREATE UNIQUE INDEX uq_user_username ON "user"(username) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_user_email    ON "user"(email)    WHERE deleted_at IS NULL;

-- Manual
CREATE INDEX idx_manual_user_deleted ON "manual"(user_id, deleted_at);

-- ImagePage
CREATE UNIQUE INDEX idx_image_page_manual_page_number ON "image_page"(manual_id, page_number);
CREATE INDEX idx_image_page_ocr_status ON "image_page"(ocr_status) WHERE deleted_at IS NULL;

-- Chunk
CREATE INDEX idx_chunk_manual_deleted ON "chunk"(manual_id, deleted_at);
CREATE INDEX idx_chunk_embedding ON "chunk" USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chunk_search_vector ON "chunk" USING gin (search_vector);

-- Conversation
CREATE INDEX idx_conversation_user_deleted ON "conversation"(user_id, deleted_at);

-- Message
CREATE INDEX idx_message_conversation_created ON "message"(conversation_id, created_at);
```

### 索引设计原则

1. 软删除 `deleted_at` 必须进复合索引
2. 复合索引列顺序：等值条件列在前，范围/排序列在后
3. 唯一约束放在数据库层（UNIQUE 索引），不全靠应用代码
4. 大文本字段不建普通 B-Tree 索引，用 tsvector GIN 索引
5. 单表索引总数不超过 6 个

### 分页规范

| 场景 | 分页方式 | pageSize 默认 | pageSize 最大 | 额外规则 |
|------|----------|-------------|-------------|---------|
| 说明书列表 | 传统分页 | 20 | 100 | 最大 OFFSET=1000 |
| 对话列表 | 传统分页 | 20 | 100 | 最大 OFFSET=1000 |
| 对话消息 | 游标分页 | 20 | 100 | cursor=上页末条 id |

传统分页 COUNT 只在第一页查询，翻页不重复查。

### 大表增长预判

| 表 | 增长级别 | 应对策略 |
|----|---------|---------|
| chunk | 🔴 高 | 当前索引已建好；十万级时调优 IVFFlat 参数 |
| message | 🔴 高 | 游标分页避免大 OFFSET；后续可归档 6 个月以上数据 |
| image_page | 🟡 中 | 当前索引策略足够 |
| manual | 🟡 中 | 当前索引策略足够 |
| conversation | 🟢 低 | 当前索引策略足够 |
| user | 🟢 低 | 当前索引策略足够 |

---

## 接口规范与行为指令

### URL 风格

- RESTful 资源路由：`GET/POST/PUT/DELETE /api/v1/{resource}` 及 `/{id}`
- 非 CRUD 操作用动词路径：`POST /api/v1/auth/register`、`POST /api/v1/manuals/{id}/pages`
- SSE 流式接口：`GET /api/v1/manuals/{id}/progress`（处理进度）、`POST /api/v1/conversations/{id}/messages`（发送消息流式返回）

### 统一响应结构

```json
{"code": 200, "message": "success", "data": {}}
```

### 分页

传统分页：`{"list": [], "total": 100, "page": 1, "pageSize": 20}`
游标分页：`{"list": [], "nextCursor": "...", "hasMore": true, "pageSize": 20}`

### 空值返回

| 情况 | 返回 |
|-----|------|
| 列表为空 | `[]` |
| 字符串为空 | `""` |
| 对象不存在 | `{"code": 404, "message": "资源不存在"}` |
| 数字未设置 | `null` |

### 错误码分段

| 范围 | 模块 |
|------|------|
| 1000–1999 | 通用（参数校验、认证、系统异常） |
| 2000–2999 | 说明书（manual + storage） |
| 3000–3999 | 知识库/检索（knowledge） |
| 4000–4999 | 对话（chat） |
| 5000–5999 | Pipeline 处理 |

HTTP 状态码和业务码并存。

### AI 行为指令

**写代码时：**
1. 用最简单直接的方式实现。CRUD 就三层：router → service → data。不引入策略模式、工厂模式等，除非明确要求。
2. 不引入技术栈之外的依赖。需要加新库必须先说明理由。
3. 所有外部调用必须有超时设置。
4. 所有配置（连接信息、超时时间、LLM 端点等）放环境变量，不硬编码。
5. 一期不要求每功能都写测试，先保证能跑。

**改代码时：**
6. 不破坏已有接口契约。需要改接口参数结构时先说明影响范围。
7. 不顺手修改无关模块。
8. 改动前先说明影响范围。

**不确定时：**
9. 给出 2–3 个方案对比，列出优缺点，等用户拍板。不自创规则、不替用户决策。

### 前端设计系统

**设计方向：Luminous Knowledge** — 暗色基调 + 暖铜点缀 + 毛玻璃质感。

| 要素 | 规范 |
|-----|------|
| 底色 | `#08080a` 最深处，`#1e1e2a` 表面 |
| 强调色 | `#c49b4c`（铜色），`#e2b85c`（亮铜） |
| 毛玻璃 | `.glass`: `backdrop-filter: blur(20px)` + 半透明底 |
| 辉光 | `.glow-accent`: `box-shadow` 暖色扩散 |
| 字体 | Playfair Display（标题）+ Noto Sans SC（正文） |
| 入场 | `fadeUp` 动画 + `animation-delay` 错开 |
| 组件 | Toast 通知（Context + 3.5s 消失）、AuthGuard 路由守卫 |
| Markdown | `react-markdown` 渲染 AI 回复 |

**页面构成：**
- `ChatPage`：左侧对话列表 + 右侧消息区 + 底部输入框。SSE 流式（fetch + ReadableStream），ReactMarkdown 渲染，引用来源标签，AI 思考三点脉冲动画
- `ManualsPage`：卡片网格 + 创建面板 + 删除确认，分页
- `ManualDetailPage`：页码列表 + OCR 状态 + 上传多选 + SSE 进度条
- `AuthPage`：登录/注册切换 + 表单校验 + token localStorage 持久化

**开发模式端口：** 前端 `15173`，后端 `18000`。
**生产模式：** 单容器 `localhost:18080`，Nginx 托管前端 dist 并代理 API。
