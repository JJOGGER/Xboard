#!/bin/bash

# XBoard 一键启动脚本
# 自动启动后端、用户前端和管理后台

set -e

echo "================================"
echo "  XBoard 一键启动脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "artisan" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: pnpm 未安装${NC}"
    echo "请运行: npm install -g pnpm"
    exit 1
fi

# 检查前端目录
if [ ! -d "xboard-frontend" ]; then
    echo -e "${RED}错误: xboard-frontend 目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境检查通过${NC}"
echo ""

# 启动后端
echo -e "${YELLOW}[1/3] 启动后端服务...${NC}"
php artisan serve --host=0.0.0.0 --port=8000 > storage/logs/serve.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ 后端已启动 (PID: $BACKEND_PID)${NC}"
echo "  - API: http://localhost:8000"
echo ""

# 等待后端启动
sleep 2

# 启动队列
echo -e "${YELLOW}启动队列工作进程...${NC}"
php artisan queue:work > storage/logs/queue.log 2>&1 &
QUEUE_PID=$!
echo -e "${GREEN}✓ 队列已启动 (PID: $QUEUE_PID)${NC}"
echo ""

# 启动调度器
echo -e "${YELLOW}启动调度器...${NC}"
php artisan schedule:work > storage/logs/schedule.log 2>&1 &
SCHEDULE_PID=$!
echo -e "${GREEN}✓ 调度器已启动 (PID: $SCHEDULE_PID)${NC}"
echo ""

# 启动用户前端
echo -e "${YELLOW}[2/3] 启动用户前端...${NC}"
cd xboard-frontend
pnpm dev:user > ../storage/logs/user-frontend.log 2>&1 &
USER_PID=$!
cd ..
echo -e "${GREEN}✓ 用户前端已启动 (PID: $USER_PID)${NC}"
echo "  - URL: http://localhost:5173"
echo ""

# 等待用户前端启动
sleep 3

# 启动管理后台
echo -e "${YELLOW}[3/3] 启动管理后台...${NC}"
cd xboard-frontend
pnpm dev:admin > ../storage/logs/admin-frontend.log 2>&1 &
ADMIN_PID=$!
cd ..
echo -e "${GREEN}✓ 管理后台已启动 (PID: $ADMIN_PID)${NC}"
echo "  - URL: http://localhost:5174"
echo ""

# 保存 PID 到文件
cat > .xboard.pid << EOF
BACKEND_PID=$BACKEND_PID
QUEUE_PID=$QUEUE_PID
SCHEDULE_PID=$SCHEDULE_PID
USER_PID=$USER_PID
ADMIN_PID=$ADMIN_PID
EOF

echo "================================"
echo -e "${GREEN}✓ 所有服务已启动！${NC}"
echo "================================"
echo ""
echo "访问地址:"
echo "  - 用户前端: http://localhost:5173"
echo "  - 管理后台: http://localhost:5174"
echo "  - 后端 API: http://localhost:8000"
echo ""
echo "日志文件:"
echo "  - 后端: storage/logs/serve.log"
echo "  - 队列: storage/logs/queue.log"
echo "  - 调度: storage/logs/schedule.log"
echo "  - 用户前端: storage/logs/user-frontend.log"
echo "  - 管理后台: storage/logs/admin-frontend.log"
echo ""
echo "停止所有服务:"
echo "  ./stop-all.sh"
echo ""
echo -e "${YELLOW}提示: 如果还没有管理员账号，请运行:${NC}"
echo "  php artisan user:create-admin"
echo ""

