#!/bin/bash

# XBoard API 更新脚本
# 用途：在修改接口代码后，自动执行必要的更新操作

echo "=========================================="
echo "XBoard API 更新脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 清除路由缓存
echo -e "${YELLOW}[1/4] 清除路由缓存...${NC}"
docker compose exec -T web php artisan route:cache
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 路由缓存已清除${NC}"
else
    echo -e "${RED}✗ 路由缓存清除失败${NC}"
    exit 1
fi
echo ""

# 2. 清除配置缓存
echo -e "${YELLOW}[2/4] 清除配置缓存...${NC}"
docker compose exec -T web php artisan config:cache
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 配置缓存已清除${NC}"
else
    echo -e "${RED}✗ 配置缓存清除失败${NC}"
    exit 1
fi
echo ""

# 3. 清除视图缓存
echo -e "${YELLOW}[3/4] 清除视图缓存...${NC}"
docker compose exec -T web php artisan view:clear
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 视图缓存已清除${NC}"
else
    echo -e "${RED}✗ 视图缓存清除失败${NC}"
    exit 1
fi
echo ""

# 4. 重启 Web 容器
echo -e "${YELLOW}[4/4] 重启 Web 容器...${NC}"
docker compose restart web
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web 容器已重启${NC}"
else
    echo -e "${RED}✗ Web 容器重启失败${NC}"
    exit 1
fi
echo ""

# 等待容器启动
echo -e "${YELLOW}等待容器启动完成...${NC}"
sleep 8

# 验证服务状态
echo -e "${YELLOW}验证服务状态...${NC}"
for i in {1..5}; do
    if curl -s http://localhost:7001/api/v1/guest/comm/config > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务已启动并正常运行${NC}"
        break
    fi
    if [ $i -lt 5 ]; then
        echo -e "${YELLOW}服务未就绪，等待中... ($i/5)${NC}"
        sleep 2
    else
        echo -e "${RED}✗ 服务启动失败，请检查日志${NC}"
        docker compose logs web --tail 30
        exit 1
    fi
done
echo ""

echo -e "${GREEN}=========================================="
echo "✓ API 更新完成！"
echo "==========================================${NC}"
echo ""
echo "更新内容："
echo "  • 路由缓存已刷新"
echo "  • 配置缓存已刷新"
echo "  • 视图缓存已刷新"
echo "  • Web 容器已重启"
echo ""
