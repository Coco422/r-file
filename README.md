# R-File 文件中转站

一个轻量级的文件中转站，支持临时文本分享和 P2P 文件传输。

## 功能特性

### 文本分享
- 支持最大 10KB 的文本内容
- 可设置过期时间：30 分钟 / 1 小时 / 24 小时
- 可选密码保护
- 生成短链接访问码（如 `AB3KX9`）
- 过期自动清理

### P2P 文件传输
- 基于 WebRTC 的点对点传输
- 文件不经过服务器，直接在浏览器间传输
- 支持任意大小文件
- 实时传输进度显示
- 6 位房间码，简单易分享

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| 实时通信 | WebSocket (ws) + WebRTC |
| 包管理 | pnpm (monorepo) |

## 项目结构

```
r-file/
├── packages/
│   ├── client/          # 前端 React 应用
│   ├── server/          # 后端 Express 服务
│   └── shared/          # 共享类型和常量
├── deploy/              # 部署配置文件
│   ├── nginx.conf.example
│   ├── r-file.service
│   └── deploy.sh
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone <repo-url>
cd r-file

# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装依赖
pnpm install
```

### 开发模式

```bash
# 同时启动前端和后端
pnpm dev

# 或分别启动
pnpm dev:server  # 后端: http://localhost:3000
pnpm dev:client  # 前端: http://localhost:5173
```

### 构建

```bash
pnpm build
```

### 启动生产服务

```bash
pnpm start
```

## 配置

后端配置通过环境变量设置，可创建 `packages/server/.env` 文件：

```env
# 服务器端口
PORT=3000

# 数据库路径
DATABASE_PATH=./data/r-file.db

# 客户端 URL（用于 CORS）
CLIENT_URL=http://localhost:5173

# 文本最大大小（字节）
MAX_TEXT_SIZE=10240

# 默认过期时间（分钟）
DEFAULT_EXPIRES_MINUTES=60

# P2P 房间码长度
ROOM_CODE_LENGTH=6

# P2P 房间过期时间（分钟）
ROOM_EXPIRES_MINUTES=60
```

## 安全特性

系统内置多层安全防护：

### HTTP 层
| 防护措施 | 说明 |
|----------|------|
| Helmet | 安全 HTTP 响应头（XSS、点击劫持等防护） |
| CORS | 跨域请求限制，仅允许配置的域名 |
| Rate Limit | API 速率限制（100 次/15 分钟/IP） |
| 请求体限制 | 最大 50KB，防止大请求攻击 |
| Zod 验证 | 严格的输入参数校验 |

### WebSocket 层
| 防护措施 | 说明 |
|----------|------|
| 连接数限制 | 每 IP 最多 5 个并发连接 |
| 消息速率限制 | 每 IP 60 条消息/分钟 |
| 房间枚举防护 | 连续 5 次加入失败，封禁 5 分钟 |

### 数据层
| 防护措施 | 说明 |
|----------|------|
| 密码哈希 | bcrypt 加密存储 |
| 参数化查询 | 防止 SQL 注入 |
| 自动过期 | 数据定时清理 |

### 生产环境建议
- 启用 HTTPS（Let's Encrypt 免费证书）
- 配置 nginx 防火墙规则
- 可选配置 fail2ban 进一步防护
- 定期检查日志监控异常访问

## 生产部署

### 架构说明

```
用户请求 → nginx (80/443) → 静态文件 / API代理 / WebSocket代理
                                ↓
                         Node.js (3000)
```

### 部署步骤

1. **构建项目**
   ```bash
   pnpm build
   ```

2. **部署前端**
   ```bash
   sudo mkdir -p /var/www/r-file/client
   sudo cp -r packages/client/dist/* /var/www/r-file/client/
   ```

3. **部署后端**
   ```bash
   sudo mkdir -p /var/www/r-file/server
   sudo cp -r packages/server/{dist,package.json,node_modules} /var/www/r-file/server/
   # 复制并编辑环境配置
   sudo cp packages/server/.env.production.example /var/www/r-file/server/.env
   ```

4. **配置 nginx**
   ```bash
   sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/r-file
   # 编辑配置，修改域名
   sudo vim /etc/nginx/sites-available/r-file
   sudo ln -s /etc/nginx/sites-available/r-file /etc/nginx/sites-enabled/
   sudo nginx -t && sudo nginx -s reload
   ```

5. **启动后端服务**

   使用 pm2：
   ```bash
   pm2 start /var/www/r-file/server/dist/index.js --name r-file
   pm2 save
   pm2 startup
   ```

   或使用 systemd：
   ```bash
   sudo cp deploy/r-file.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable r-file
   sudo systemctl start r-file
   ```

### nginx 配置要点

```nginx
# API 代理
location /api {
    proxy_pass http://127.0.0.1:3000;
}

# WebSocket 代理（重要！）
location /ws {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}

# SPA 路由
location / {
    try_files $uri $uri/ /index.html;
}
```

## P2P 实现原理

### 连接流程

```
┌─────────┐     WebSocket      ┌─────────┐     WebSocket      ┌─────────┐
│ 浏览器 A │ ←───────────────→ │  服务器  │ ←───────────────→ │ 浏览器 B │
└────┬────┘      (信令)        └─────────┘      (信令)        └────┬────┘
     │                                                              │
     │                    WebRTC DataChannel                        │
     └──────────────────────────────────────────────────────────────┘
                           (直接 P2P 连接)
```

### 握手过程

1. **创建房间**：用户 A 创建房间，服务器返回 6 位房间码
2. **加入房间**：用户 B 输入房间码加入
3. **ICE 协商**：
   - B 创建 Offer (SDP) → 服务器转发 → A
   - A 创建 Answer (SDP) → 服务器转发 → B
   - 双方交换 ICE Candidates（网络候选地址）
4. **建立连接**：ICE 协商成功后，DataChannel 打开
5. **文件传输**：通过 DataChannel 直接传输，文件分片为 16KB 块

### 关键技术

- **WebSocket**：信令服务器，用于交换 SDP 和 ICE Candidates
- **RTCPeerConnection**：WebRTC 连接管理
- **RTCDataChannel**：P2P 数据通道
- **STUN 服务器**：NAT 穿透，获取公网地址

## API 接口

### 文本分享

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/text` | 创建文本分享 |
| GET | `/api/text/:code` | 获取文本内容 |
| GET | `/api/text/:code/check` | 检查是否需要密码 |

### WebSocket 消息

| 类型 | 方向 | 说明 |
|------|------|------|
| `create-room` | C→S | 创建房间 |
| `room-created` | S→C | 房间创建成功 |
| `join-room` | C→S | 加入房间 |
| `room-joined` | S→C | 加入成功 |
| `peer-joined` | S→C | 对方加入 |
| `offer` | 双向 | WebRTC Offer |
| `answer` | 双向 | WebRTC Answer |
| `ice-candidate` | 双向 | ICE 候选 |
| `error` | S→C | 错误信息 |

## 许可证

MIT
