#!/bin/bash
# Xboard 代码更新脚本（aaPanel 环境）
# 用于拉取 Git 代码、更新依赖、执行数据库迁移等

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 进程检测辅助函数
check_process() {
    local pattern=$1
    if pgrep -f "$pattern" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# 确保脚本具有执行权限
chmod +x "$(basename "$0")" >/dev/null 2>&1

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Xboard 代码更新脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否在正确的目录
if [ ! -f "artisan" ]; then
    echo -e "${RED}✗ 错误：未找到 artisan 文件${NC}"
    echo "请确保在 Xboard 根目录执行此脚本"
    echo "例如: cd /www/wwwroot/xboard && ./update-xboard.sh"
    exit 1
fi

# 检查 Git
if [ ! -d ".git" ]; then
    echo -e "${RED}✗ 错误：当前目录不是 Git 仓库${NC}"
    echo "请确保 Xboard 是通过 Git 部署的"
    exit 1
fi

# 获取当前目录
CURRENT_DIR=$(pwd)
echo -e "${GREEN}✓ 当前目录: $CURRENT_DIR${NC}"

# 检查 PHP 版本
PHP_VERSION=$(php -v | head -n 1)
echo -e "${GREEN}✓ PHP 版本: $PHP_VERSION${NC}"
echo ""

# 检查 vendor/autoload.php 是否存在
if [ ! -f "vendor/autoload.php" ]; then
    echo -e "${RED}✗ vendor/autoload.php 不存在${NC}"
    echo "请先运行 setup-environment.sh 准备环境"
    exit 1
fi

# 备份提示
echo -e "${YELLOW}⚠ 重要提示：${NC}"
echo "  更新前请确保已备份："
echo "    1. 数据库（MySQL 或 SQLite）"
echo "    2. .env 配置文件"
echo ""
read -p "是否已备份? (y/n): " BACKUP_CONFIRM
if [[ ! "$BACKUP_CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠ 建议先备份，然后再执行更新${NC}"
    read -p "是否继续? (y/n): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}[步骤 1] 检查 Git 状态${NC}"
echo "----------------------------------------"

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠ 检测到未提交的本地更改${NC}"
    git status --short
    
    echo ""
    read -p "如何处理? (1=暂存并继续, 2=放弃更改, 3=取消): " HANDLE_CHANGES
    
    case $HANDLE_CHANGES in
        1)
            echo "暂存本地更改..."
            git stash
            STASH_APPLY=true
            ;;
        2)
            echo -e "${YELLOW}⚠ 放弃所有本地更改（谨慎操作！）${NC}"
            read -p "确认? (yes/no): " CONFIRM_RESET
            if [ "$CONFIRM_RESET" = "yes" ]; then
                git reset --hard HEAD
            else
                echo "取消更新"
                exit 0
            fi
            ;;
        3)
            echo "取消更新"
            exit 0
            ;;
        *)
            echo "无效选择，取消更新"
            exit 0
            ;;
    esac
else
    echo -e "${GREEN}✓ 工作目录干净${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 2] 拉取最新代码${NC}"
echo "----------------------------------------"

# 配置 Git 安全目录（如果需要）
git config --global --add safe.directory "$CURRENT_DIR" 2>/dev/null

# 拉取最新代码
echo "正在拉取最新代码..."
git fetch --all

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git fetch 失败${NC}"
    exit 1
fi

echo "正在合并更改..."
git pull origin master

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git pull 失败${NC}"
    echo ""
    echo -e "${YELLOW}可能原因：${NC}"
    echo "  1. 代码冲突"
    echo "  2. 网络问题"
    echo "  3. 权限问题"
    echo ""
    echo "可以尝试："
    echo "  git reset --hard origin/master"
    echo "  或手动解决冲突后重新运行脚本"
    
    # 如果之前暂存了更改，恢复
    if [ "$STASH_APPLY" = true ]; then
        git stash pop
    fi
    
    exit 1
fi

# 显示更新的文件
echo ""
echo "更新的文件："
git log --oneline -5

echo ""
echo -e "${GREEN}✓ 代码更新成功${NC}"

# 恢复暂存的更改
if [ "$STASH_APPLY" = true ]; then
    echo ""
    echo "恢复之前暂存的更改..."
    git stash pop
fi

echo ""
echo -e "${BLUE}[步骤 3] 更新 Composer 依赖${NC}"
echo "----------------------------------------"

# 检查是否需要更新依赖
NEED_UPDATE=false

if [ ! -f "composer.lock" ]; then
    echo -e "${YELLOW}⚠ composer.lock 文件不存在，需要安装依赖${NC}"
    NEED_UPDATE=true
elif [ "composer.json" -nt "composer.lock" ]; then
    echo -e "${YELLOW}⚠ composer.json 有更新，需要更新依赖${NC}"
    NEED_UPDATE=true
else
    echo -e "${GREEN}✓ 依赖已是最新，检查是否需要更新...${NC}"
fi

# 确保使用最新版本的 composer.phar
if [ ! -f "composer.phar" ]; then
    echo "下载最新版 composer.phar..."
    wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar 2>/dev/null || \
    curl -L https://getcomposer.org/download/latest-stable/composer.phar -o composer.phar 2>/dev/null
    if [ -f "composer.phar" ]; then
        chmod +x composer.phar
        echo -e "${GREEN}✓ composer.phar 下载成功${NC}"
    else
        echo -e "${RED}✗ 无法下载 composer.phar${NC}"
        exit 1
    fi
else
    echo "更新 composer.phar 到最新版本..."
    php -d disable_functions= composer.phar self-update 2>&1 || \
    wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar 2>/dev/null || \
    curl -L https://getcomposer.org/download/latest-stable/composer.phar -o composer.phar 2>/dev/null
    chmod +x composer.phar
fi

COMPOSER_VERSION=$(php -d disable_functions= composer.phar --version 2>&1 | head -n 1 || echo "unknown")
echo "Composer 版本: $COMPOSER_VERSION"

if [ "$NEED_UPDATE" = true ]; then
    echo ""
    echo "更新 Composer 依赖..."
    # 忽略缺失的扩展要求
    IGNORE_EXTS="--ignore-platform-req=ext-fileinfo --ignore-platform-req=ext-curl --ignore-platform-req=ext-dom --ignore-platform-req=ext-xml"
    
    if php -d disable_functions= -d allow_url_fopen=On ./composer.phar update --no-dev --optimize-autoloader --no-interaction $IGNORE_EXTS 2>&1; then
        COMPOSER_SUCCESS=true
    elif php -d disable_functions= -d allow_url_fopen=On ./composer.phar update --no-dev --no-interaction $IGNORE_EXTS 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar update --no-dev --optimize-autoloader --no-interaction $IGNORE_EXTS 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar update --no-dev --no-interaction $IGNORE_EXTS 2>&1; then
        COMPOSER_SUCCESS=true
    else
        COMPOSER_SUCCESS=false
    fi

    if [ "$COMPOSER_SUCCESS" != "true" ]; then
        echo -e "${YELLOW}⚠ Composer 更新失败，尝试重新安装...${NC}"
        rm -rf vendor composer.lock 2>/dev/null
        IGNORE_EXTS="--ignore-platform-req=ext-fileinfo --ignore-platform-req=ext-curl --ignore-platform-req=ext-dom --ignore-platform-req=ext-xml"
        if php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --optimize-autoloader --no-interaction $IGNORE_EXTS 2>&1; then
            COMPOSER_SUCCESS=true
        elif php ./composer.phar install --no-dev --optimize-autoloader --no-interaction $IGNORE_EXTS 2>&1; then
            COMPOSER_SUCCESS=true
        else
            COMPOSER_SUCCESS=false
        fi
    fi
    
    # 验证 vendor/autoload.php 是否存在
    if [ ! -f "vendor/autoload.php" ]; then
        echo -e "${RED}✗ vendor/autoload.php 不存在！请检查 Composer 错误信息${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 依赖已更新${NC}"
else
    echo -e "${GREEN}✓ 依赖无需更新${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 4] 检查 Redis 配置${NC}"
echo "----------------------------------------"

# 检查 Redis 服务是否运行，如果未运行则切换到 Predis
if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis 服务正在运行${NC}"
    else
        echo -e "${YELLOW}⚠ Redis 服务未运行，尝试启动...${NC}"
        systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || service redis-server start 2>/dev/null || service redis start 2>/dev/null || true
        sleep 2
        if redis-cli ping >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Redis 服务已启动${NC}"
        else
            echo -e "${RED}✗ Redis 服务启动失败${NC}"
            echo ""
            echo -e "${YELLOW}重要提示：${NC}"
            echo "  Predis 仍然需要 Redis 服务运行（只是不需要 phpredis 扩展）"
            echo "  请先修复 Redis 服务，然后重新运行此脚本"
            echo ""
            echo "诊断步骤："
            echo "  1. 查看 Redis 服务状态: systemctl status redis-server"
            echo "  2. 查看 Redis 错误日志: journalctl -xeu redis-server.service"
            echo "  3. 尝试手动启动: systemctl start redis-server"
            echo ""
            echo "如果 Redis 服务无法修复，可以运行修复脚本："
            echo "  ./fix-redis.sh"
            echo ""
            echo -e "${YELLOW}⚠ 继续执行可能会失败，因为 Redis 服务未运行${NC}"
            read -p "是否继续? (y/n): " CONTINUE_REDIS
            if [[ ! "$CONTINUE_REDIS" =~ ^[Yy]$ ]]; then
                exit 1
            fi
            
            # 即使继续，也修复配置
            if [ -f .env ]; then
                # 设置 REDIS_CLIENT 为 predis
                if ! grep -q "^REDIS_CLIENT=" .env; then
                    echo "REDIS_CLIENT=predis" >> .env
                    echo -e "${GREEN}✓ 已在 .env 中添加 REDIS_CLIENT=predis${NC}"
                elif grep -q "^REDIS_CLIENT=phpredis" .env; then
                    sed -i 's/^REDIS_CLIENT=phpredis/REDIS_CLIENT=predis/' .env
                    echo -e "${GREEN}✓ 已更新 .env 中的 REDIS_CLIENT 为 predis${NC}"
                fi
                
                # 修复 REDIS_HOST（如果是 Docker socket 路径，改为 127.0.0.1）
                if grep -q "^REDIS_HOST=/data/redis.sock" .env || grep -q "^REDIS_HOST=/var/run/redis" .env; then
                    sed -i 's|^REDIS_HOST=.*|REDIS_HOST=127.0.0.1|' .env
                    echo -e "${GREEN}✓ 已修复 REDIS_HOST 为 127.0.0.1${NC}"
                elif ! grep -q "^REDIS_HOST=" .env; then
                    echo "REDIS_HOST=127.0.0.1" >> .env
                    echo -e "${GREEN}✓ 已添加 REDIS_HOST=127.0.0.1${NC}"
                fi
                
                # 修复 REDIS_PORT（如果是 0 或不存在，设置为 6379）
                if grep -q "^REDIS_PORT=" .env; then
                    REDIS_PORT=$(grep "^REDIS_PORT=" .env | cut -d'=' -f2)
                    if [ "$REDIS_PORT" = "0" ] || [ -z "$REDIS_PORT" ]; then
                        sed -i 's/^REDIS_PORT=.*/REDIS_PORT=6379/' .env
                        echo -e "${GREEN}✓ 已修复 REDIS_PORT 为 6379${NC}"
                    fi
                else
                    echo "REDIS_PORT=6379" >> .env
                    echo -e "${GREEN}✓ 已添加 REDIS_PORT=6379${NC}"
                fi
                
                # 清除配置缓存，使新配置生效
                php artisan config:clear 2>/dev/null || true
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠ Redis 未安装，使用 Predis（纯 PHP 实现）${NC}"
    if [ -f .env ]; then
        if ! grep -q "^REDIS_CLIENT=" .env; then
            echo "REDIS_CLIENT=predis" >> .env
            echo -e "${GREEN}✓ 已在 .env 中添加 REDIS_CLIENT=predis${NC}"
        fi
        
        # 修复 REDIS_HOST
        if grep -q "^REDIS_HOST=/data/redis.sock" .env || grep -q "^REDIS_HOST=/var/run/redis" .env; then
            sed -i 's|^REDIS_HOST=.*|REDIS_HOST=127.0.0.1|' .env
            echo -e "${GREEN}✓ 已修复 REDIS_HOST 为 127.0.0.1${NC}"
        elif ! grep -q "^REDIS_HOST=" .env; then
            echo "REDIS_HOST=127.0.0.1" >> .env
            echo -e "${GREEN}✓ 已添加 REDIS_HOST=127.0.0.1${NC}"
        fi
        
        # 确保 REDIS_PORT 正确
        if ! grep -q "^REDIS_PORT=" .env; then
            echo "REDIS_PORT=6379" >> .env
            echo -e "${GREEN}✓ 已添加 REDIS_PORT=6379${NC}"
        fi
        
        php artisan config:clear 2>/dev/null || true
    fi
fi

echo ""
echo -e "${BLUE}[步骤 5] 运行数据库迁移和更新${NC}"
echo "----------------------------------------"

# 确保 vendor/autoload.php 存在
if [ ! -f "vendor/autoload.php" ]; then
    echo -e "${RED}✗ vendor/autoload.php 不存在，无法执行 artisan 命令${NC}"
    exit 1
fi

php artisan xboard:update

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ 更新命令执行失败${NC}"
    echo "请查看上面的错误信息"
    exit 1
fi

echo -e "${GREEN}✓ 数据库迁移完成${NC}"

echo ""
echo -e "${BLUE}[步骤 6] 清除缓存${NC}"
echo "----------------------------------------"

php artisan optimize:clear

if [ $? -eq 0 ]; then
    php artisan optimize
    echo -e "${GREEN}✓ 缓存已清除并优化${NC}"
else
    echo -e "${YELLOW}⚠ 清除缓存失败，可以稍后手动执行${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 7] 设置文件权限${NC}"
echo "----------------------------------------"
if [ -f "/etc/init.d/bt" ]; then
    PHP_USER="www"
    chown -R "$PHP_USER":"$PHP_USER" "$CURRENT_DIR" 2>/dev/null
    echo -e "${GREEN}✓ 文件权限已设置${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  更新完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}后续操作：${NC}"
echo "  1. 访问网站验证功能是否正常"
echo "  2. 查看 Laravel 日志：tail -f storage/logs/laravel.log"
echo "  3. 测试核心功能（登录、订阅等）"
echo ""

# 显示版本信息
if php artisan --version &> /dev/null; then
    echo -e "${BLUE}当前版本：${NC}"
    php artisan --version
fi

echo ""

