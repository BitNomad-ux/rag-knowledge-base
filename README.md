各部分职责：

- NestJS：登录鉴权、知识库和文档管理、任务调度、向量检索、调用 AI API、返回问答结果。
- Python：解析 PDF、DOCX 等文档，尽量返回正文、标题和页码等结构化信息。
- Redis + BullMQ：排队执行耗时任务，记录失败和重试。
- PostgreSQL：保存用户、文档、文档片段、向量、会话和消息。
- 本地文件系统：保存原始文件；后续部署到多实例环境时，再考虑对象存储。

## 本地数据库

本地配置 PostgreSQL：

- `docker-compose.yml`：PostgreSQL 17、数据持久化和健康检查

- `init.sql`：首次初始化时启用 `pgvector`，为后续向量检索做准备

安装并启动 Docker Desktop 后，在项目根目录执行：

```bash
docker compose up -d # 启动服务
docker compose ps # 查看容器名称和状态
```

首次启动会下载镜像。等待 `postgres` 状态显示为 `healthy` 后，可以检查数据库及 pgvector 扩展：

```bash
docker compose exec postgres psql -U rag -d rag_knowledge_base -c "SELECT version();"
docker compose exec postgres psql -U rag -d rag_knowledge_base -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

本地连接信息：主机 `localhost`，端口 `5432`，数据库 `rag_knowledge_base`，用户名 `rag`，密码 `rag_local_dev`。这些凭据仅供本地开发使用。数据库数据保存在 Docker 命名卷 `postgres_data` 中；`docker compose down` 停止服务时不会删除数据。

初始化 SQL 只在数据卷首次创建时运行。若复用已有数据卷且没有 `vector` 扩展，可手动执行：

```bash
docker compose exec postgres psql -U rag -d rag_knowledge_base -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

停止服务：

```bash
docker compose down
```

`docker compose up -d` 执行后做的事情：

1. Docker 读取 docker-compose.yml
2. Docker 找到 pgvector/pgvector 镜像
3. Docker 根据镜像创建一个容器
4. 容器启动 PostgreSQL
5. PostgreSQL 创建 rag 用户
6. PostgreSQL 创建 rag_knowledge_base 数据库
7. 数据库等待应用程序连接

```bash
docker compose exec postgres bash # 进入 PostgreSQL 容器，进入后可以像操作普通 Linux 一样查看
```
