# 瞬知·KnowSense

面向普通消费者的 AI 智能说明书问答助手。拍照上传说明书，用自然语言提问，AI 帮你找到答案。

---

## 10 秒快速启动

```bash
# 1. 打开终端，进入项目目录
cd "AI manual-reading assistant"

# 2. 一键启动（确保 Docker Desktop 正在运行）
docker compose up -d --build

# 3. 打开浏览器访问
open http://localhost:18080
```

> 需要先安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。
> 首次启动会自动下载镜像，大约需要 3-5 分钟。看到 `Container knowsense Started` 就表示成功了。

---

## 这是什么？

家里买了一台新的微波炉、一盒从来没吃过的药——说明书密密麻麻一大张纸，字小得像蚂蚁。你不想翻，翻了也看不懂。

**瞬知就是帮你解决这个问题的。**

1. **拍说明书** → 新建一个"说明书"，把每一页说明书都拍下来上传
2. **问问题** → 在聊天框里打字问，AI 会从你的说明书里找到对应内容回答
3. **看结果** → 回答会标明引用的是哪本说明书、哪一页，不会胡编乱造

---

## 使用指南

### 第一步：注册账号

打开 http://localhost:18080 ，点击"没有账号？点击注册"。

输入用户名、邮箱、密码（密码需要 6 位以上，包含字母和数字），完成注册后登录。

### 第二步：上传说明书

1. 登录后点击左侧导航栏的 **「我的说明书」**
2. 点击右上角 **「+ 新建说明书」**
3. 填写产品名称（必填），品牌和品类选填
4. 创建后进入说明书详情页，点击 **「+ 上传照片」**
5. 选择说明书的所有页面照片，确认上传

上传后系统会自动进行 OCR 文字识别、文本切块、向量化存储。你可以看到每页的处理进度。

处理完成后，这本说明书就可以被"提问"了。

### 第三步：提问

1. 点击左侧导航栏的 **「智能对话」**
2. 在输入框输入你的问题，比如"这个药一次吃多少"
3. AI 会流式返回答案，并标注信息来源（哪本说明书、哪一页）

可以创建多个对话，每个对话都是独立的。对话记录会自动保存，随时可以回看。

---

## 配置 AI 模型

项目默认使用以下 API（已在 `.env` 中预配置可直接使用）：

| 功能 | 服务商 | 模型 |
|-----|--------|------|
| 对话 | 阶跃星辰 (StepFun) | step-3.6 |
| 向量化 | Gitee AI | Qwen3-Embedding-0.6B |
| OCR | PaddleOCR | PaddleOCR-VL-1.5 |

> 如需更换模型，编辑项目根目录的 `.env` 文件，修改 `LLM_API_URL`、`LLM_API_KEY` 等字段，然后重新执行 `docker compose up -d --build` 重建容器。

---

## 常见操作

### 查看进度

上传说明书后，系统会在后台自动处理。处理状态会实时显示在说明书详情页。

### 预览图片

点击说明书详情页的图片卡片，可以全屏查看大图。支持键盘方向键翻页、缩放、缩略图跳转。

### 删除数据

- **删除图片**：在说明书详情页，鼠标悬停在图片卡片上，点击右上角垃圾桶图标
- **删除说明书**：在说明书列表页，鼠标悬停在卡片上，点击右上角 ✕
- **删除对话**：在对话页左侧列表，鼠标悬停在对话上，点击右侧垃圾桶图标

---

## 停止和重启

```bash
# 停止容器（数据不会丢失）
docker compose down

# 重新启动
docker compose up -d

# 停止并删除所有数据（慎用）
docker compose down -v
```

所有数据存储在 Docker volume 中，普通停止不会丢失。只有 `-v` 才会彻底清除。

## 从 GitHub Container Registry 部署

每次推送到 `main` 分支或打 `v*` 标签时，GitHub Actions 会自动构建镜像并推送到 `ghcr.io`。

```bash
# 拉取预构建镜像（无需本地编译）
docker pull ghcr.io/你的用户名/项目名:main

# 使用预构建镜像启动
docker run -d -p 18080:80 -v knowsense-data:/data ghcr.io/你的用户名/项目名:main
```

> CI/CD 配置文件在 `.github/workflows/build.yml`，推送到 GitHub 后自动生效。

---

## 技术栈

| 层 | 技术 |
|---|-----|
| 前端 | React + TypeScript + Tailwind CSS |
| 后端 | FastAPI (Python) |
| 数据库 | PostgreSQL + pgvector（向量检索） |
| 缓存 | Redis |
| 文件存储 | MinIO |
| OCR | PaddleOCR API |
| 分词 | jieba |
| 部署 | Docker 单镜像 |

所有组件打包在一个 Docker 镜像中，不依赖外部服务。`docker compose up -d --build` 一键启动全部。

---

## 常见问题

**Q: 启动后访问不了？**

先等 10 秒让服务完全启动。如果还是不行，确认 Docker Desktop 正在运行（菜单栏有 🐳 图标）。

**Q: 上传了说明书但 AI 回答"请先上传说明书"？**

检查说明书的状态是否是「已完成」。如果是「处理中」，等待处理完成。如果是「失败」，删除后重新上传。

**Q: 对话没反应？**

确认 `.env` 文件中的 LLM API 地址和密钥填写正确。如果 API 不配置，系统会返回 mock 回复用于测试。

**Q: 想用自己的 API Key 怎么办？**

编辑项目根目录的 `.env` 文件，替换对应的 `LLM_API_KEY`、`EMBEDDING_API_KEY` 等字段，然后重建容器。

**Q: 数据存在哪里？**

所有数据通过 Docker volume 持久化。`docker compose down` 不会删除数据。如需完全清除，使用 `docker compose down -v`。

---

## License

MIT
