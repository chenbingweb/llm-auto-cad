# Text-to-3D 部署文档

## 环境要求

### 开发环境
- Node.js >= 18.0.0
- Python >= 3.10
- MySQL >= 8.0
- npm 或 yarn

### 生产环境
- 2核 CPU / 4GB 内存 最小配置
- 推荐 4核 CPU / 8GB 内存

---

## 开发环境快速启动

### 一键启动（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd text-to-3d

# 2. 启动 MySQL（如果未运行）
mysql.server start  # macOS
brew services start mysql  # macOS with Homebrew

# 3. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS text_to_3d CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. 启动后端
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填入 MINIMAX_API_KEY
uvicorn app.main:app --reload --port 8000

# 5. 启动前端（新终端窗口）
cd frontend
npm install
npm run dev
```

### 详细步骤

#### 步骤 1：环境检查

```bash
# 检查 Node.js
node --version  # 需要 >= 18.0.0

# 检查 Python
python3 --version  # 需要 >= 3.10

# 检查 MySQL
mysql --version
mysql.server start  # 启动 MySQL 服务
```

#### 步骤 2：数据库初始化

```bash
mysql -u root -p

# 在 MySQL 命令行中执行
CREATE DATABASE IF NOT EXISTS text_to_3d CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### 步骤 3：后端设置

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
```

编辑 `backend/.env` 文件：

```env
DATABASE_URL=mysql+pymysql://root:@localhost:3306/text_to_3d
MINIMAX_API_KEY=你的MiniMax_API密钥
MINIMAX_API_URL=https://api.minimax.chat/v1/text/chatcompletion_v2
MINIMAX_MODEL=MiniMax-Text-01
```

启动后端服务：

```bash
uvicorn app.main:app --reload --port 8000
```

验证后端运行：

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

#### 步骤 4：前端设置

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 `http://localhost:3000`，会自动代理 `/api` 请求到后端。

### 开发工具

#### 调试后端 API

```bash
# 测试会话创建
curl -X POST http://localhost:8000/api/session

# 测试聊天接口
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input":"创建一个圆柱","scene_context":[],"session_id":"test-session-id"}'
```

#### 查看数据库

```bash
mysql -u root -p text_to_3d

# 查看表
SHOW TABLES;

# 查看会话数据
SELECT * FROM sessions;
SELECT * FROM scenes;
```

### 常见问题

**问题：后端启动报 `ModuleNotFoundError`**

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**问题：前端无法连接后端**

确认后端正在运行：`curl http://localhost:8000/health`

检查 Vite 代理配置：`frontend/vite.config.js`

**问题：MySQL 连接失败**

```bash
# 检查 MySQL 服务
mysql.server status

# 重启 MySQL
mysql.server restart
```

**问题：MiniMax API 调用失败**

确认 `.env` 中的 `MINIMAX_API_KEY` 正确且有效。

---

## 后端部署

### 1. 环境准备

```bash
# 安装 Python 3.10+
python3 --version

# 安装 MySQL
brew install mysql  # macOS
# Ubuntu: sudo apt install mysql-server
# Windows: 下载 MySQL Installer
```

### 2. 数据库配置

```bash
# 启动 MySQL
mysql.server start  # macOS
# sudo service mysql start  # Linux

# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE text_to_3d CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'text3d'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON text_to_3d.* TO 'text3d'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 安装依赖

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
cp .env.example .env

# 编辑 .env 文件，填入实际配置
vim .env
```

```env
DATABASE_URL=mysql+pymysql://text3d:your_password@localhost:3306/text_to_3d
MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_API_URL=https://api.minimax.chat/v1/text/chatcompletion_v2
MINIMAX_MODEL=MiniMax-Text-01
```

### 5. 初始化数据库

```bash
# 自动创建表（FastAPI 启动时会自动创建）
# 或使用 Alembic 手动管理
alembic revision --autogenerate -m "init"
alembic upgrade head
```

### 6. 运行服务

**开发环境：**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**生产环境：**
```bash
# 使用 gunicorn + uvicorn workers
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**使用 systemd（Linux）：**
```bash
# /etc/systemd/system/text-to-3d.service
[Unit]
Description=Text-to-3D Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/backend/venv/bin"
ExecStart=/path/to/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable text-to-3d
sudo systemctl start text-to-3d
sudo systemctl status text-to-3d
```

### 7. 验证部署

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## 前端部署

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 配置 API 地址

开发环境使用 Vite 代理（已配置），生产环境需修改 `src/services/api.js`：

```javascript
// src/services/api.js
const api = axios.create({
  baseURL: 'https://your-api-domain.com/api',  // 修改为实际 API 地址
  timeout: 30000
})
```

### 3. 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 4. 部署方式

**方式一：静态托管（如 Nginx）**

```nginx
# /etc/nginx/sites-available/text-to-3d
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/text-to-3d /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**方式二：Docker 部署**

```dockerfile
# frontend/Dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
docker build -t text-to-3d-frontend ./frontend
docker run -d -p 3000:80 text-to-3d-frontend
```

**方式三：Vercel / Netlify**

```bash
# vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-api.com/api/$1" }
  ]
}
```

```bash
npm install -g vercel
vercel --prod
```

---

## Docker Compose 完整部署

推荐使用 Docker Compose 一键部署前后端 + MySQL：

```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: text_to_3d
      MYSQL_USER: text3d
      MYSQL_PASSWORD: your_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: mysql+pymysql://text3d:your_password@mysql:3306/text_to_3d
      MINIMAX_API_KEY: your_api_key
    depends_on:
      mysql:
        condition: service_healthy
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

```bash
# backend/Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker-compose up -d
```

---

## HTTPS 配置

生产环境必须使用 HTTPS：

```nginx
# /etc/nginx/sites-available/text-to-3d-ssl
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

```bash
# 使用 Let's Encrypt 免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 环境变量清单

### 后端 (.env)

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | MySQL 连接地址 | `mysql+pymysql://user:pass@localhost:3306/text_to_3d` |
| `MINIMAX_API_KEY` | MiniMax API 密钥 | 从 MiniMax 控制台获取 |
| `MINIMAX_API_URL` | MiniMax API 地址 | `https://api.minimax.chat/v1/text/chatcompletion_v2` |
| `MINIMAX_MODEL` | 使用的模型 | `MiniMax-Text-01` |

### 前端

无需额外环境变量，API 地址在 `src/services/api.js` 中配置。

---

## 目录结构

```
text-to-3d/
├── frontend/
│   ├── src/
│   │   ├── components/    # Vue 组件
│   │   ├── services/      # API 服务
│   │   ├── stores/        # Pinia 状态
│   │   ├── App.vue
│   │   └── main.js
│   ├── dist/              # 构建产物
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── models/        # SQLAlchemy 模型
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # 业务服务
│   │   ├── core/          # 核心配置
│   │   └── main.py
│   ├── alembic/           # 数据库迁移
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
└── docs/
    └── deployment.md
```

---

## 故障排查

### 后端启动失败

```bash
# 检查数据库连接
mysql -u text3d -p text_to_3d -e "SELECT 1"

# 查看日志
tail -f /var/log/text-to-3d.log
```

### 前端无法连接后端

```bash
# 检查 API 是否正常
curl http://localhost:8000/api/session

# 检查 Nginx 代理
tail -f /var/log/nginx/error.log
```

### MiniMax API 错误

```bash
# 检查 API Key 是否正确
curl -H "Authorization: Bearer YOUR_KEY" https://api.minimax.chat/v1/text/chatcompletion_v2 \
  -H "Content-Type: application/json" \
  -d '{"model":"MiniMax-Text-01","messages":[{"role":"user","content":"hi"}]}'
```

---

## 监控与日志

### 应用日志

```python
# backend/app/core/config.py 添加
import logging
logging.basicConfig(level=logging.INFO)
```

### Nginx 日志

```nginx
access_log /var/log/nginx/text-to-3d-access.log;
error_log /var/log/nginx/text-to-3d-error.log;
```

### Docker 日志

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```