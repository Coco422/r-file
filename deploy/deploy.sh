#!/bin/bash

# 生产环境部署脚本
# 使用方法: ./deploy.sh

set -e

echo "=== 开始部署 r-file ==="

# 1. 安装依赖
echo "[1/4] 安装依赖..."
pnpm install --frozen-lockfile

# 2. 构建项目
echo "[2/4] 构建项目..."
pnpm build

# 3. 复制前端文件到部署目录
echo "[3/4] 复制前端文件..."
DEPLOY_DIR="/var/www/r-file"
sudo mkdir -p $DEPLOY_DIR/client
sudo cp -r packages/client/dist/* $DEPLOY_DIR/client/

# 4. 重启后端服务
echo "[4/4] 重启后端服务..."
# 如果使用 pm2:
# pm2 restart r-file || pm2 start packages/server/dist/index.js --name r-file

# 如果使用 systemd:
# sudo systemctl restart r-file

echo "=== 部署完成 ==="
echo ""
echo "前端文件: $DEPLOY_DIR/client"
echo "后端入口: packages/server/dist/index.js"
echo ""
echo "请确保:"
echo "1. nginx 配置正确并已重载 (sudo nginx -t && sudo nginx -s reload)"
echo "2. 后端服务已启动 (pm2 start 或 systemctl start)"
