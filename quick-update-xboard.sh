#!/bin/bash
# Xboard 快速升级脚本（aaPanel 环境）

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

# 确保脚本与诊断工具具有执行权限
chmod 777 "$(basename "$0")" >/dev/null 2>&1
[ -f "post-deploy-diagnose.sh" ] && chmod 777 post-deploy-diagnose.sh >/dev/null 2>&1

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Xboard 升级脚本（aaPanel 环境）${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否在正确的目录
if [ ! -f "artisan" ]; then
    echo -e "${RED}✗ 错误：未找到 artisan 文件${NC}"
    echo "请确保在 Xboard 根目录执行此脚本"
    echo "例如: cd /www/wwwroot/your-domain && ./quick-update-xboard.sh"
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

# 检查 fileinfo 扩展
if php -m | grep -qi fileinfo; then
    echo -e "${GREEN}✓ fileinfo 扩展已安装${NC}"
else
    echo -e "${RED}✗ 未检测到 fileinfo 扩展${NC}"
    echo "请在 aaPanel > PHP 8.2 > 设置 > 安装扩展 中启用 fileinfo，并重启 PHP-FPM 后再次运行本脚本。"
    exit 1
fi

# 备份提示
echo -e "${YELLOW}⚠ 重要提示：${NC}"
echo "  升级前请确保已备份："
echo "    1. 数据库（MySQL 或 SQLite）"
echo "    2. .env 配置文件"
echo ""
read -p "是否已备份? (y/n): " BACKUP_CONFIRM
if [[ ! "$BACKUP_CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠ 建议先备份，然后再执行升级${NC}"
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
                echo "取消升级"
                exit 0
            fi
            ;;
        3)
            echo "取消升级"
            exit 0
            ;;
        *)
            echo "无效选择，取消升级"
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
echo -e "${BLUE}[步骤 3] 检查并安装依赖${NC}"
echo "----------------------------------------"

# 检查是否需要重新安装依赖
NEED_INSTALL=false

if [ ! -d "vendor" ]; then
    echo -e "${YELLOW}⚠ vendor 目录不存在，需要安装依赖${NC}"
    NEED_INSTALL=true
elif [ ! -f "composer.lock" ]; then
    echo -e "${YELLOW}⚠ composer.lock 文件不存在，需要重新安装依赖${NC}"
    NEED_INSTALL=true
else
    # 检查 composer.json 是否有更新
    if [ "composer.json" -nt "composer.lock" ]; then
        echo -e "${YELLOW}⚠ composer.json 有更新，需要更新依赖${NC}"
        NEED_INSTALL=true
    else
        echo -e "${GREEN}✓ 依赖已安装，检查是否需要更新...${NC}"
        NEED_INSTALL=false
    fi
fi

# 确保使用最新版本的 composer.phar（优先使用项目目录下的，避免系统旧版本）
echo ""
echo "准备 Composer..."
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

# 验证 composer.phar 版本
COMPOSER_VERSION=$(php -d disable_functions= composer.phar --version 2>&1 | head -n 1 || echo "unknown")
echo "Composer 版本: $COMPOSER_VERSION"

if [ "$NEED_INSTALL" = true ]; then
    echo ""
    echo "1. 清理旧的依赖..."
    rm -rf vendor composer.lock 2>/dev/null
    echo -e "${GREEN}✓ 已清理${NC}"

    echo ""
    echo "2. 安装 Composer 依赖..."
    # 优先使用 composer.phar（最新版本），使用 php -d disable_functions= 绕过 putenv 被禁用的问题
    if php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    elif php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar install --no-dev --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    else
        COMPOSER_SUCCESS=false
    fi

    if [ "$COMPOSER_SUCCESS" != "true" ]; then
        echo -e "${RED}✗ Composer 安装失败${NC}"
        echo "提示：可能是 PHP putenv 函数被禁用，请在 aaPanel 中启用 putenv 函数"
        exit 1
    fi

    # 验证 vendor/autoload.php 是否存在
    if [ ! -f "vendor/autoload.php" ]; then
        echo -e "${RED}✗ vendor/autoload.php 不存在！Composer install 可能未成功完成${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 依赖安装成功${NC}"
else
    echo ""
    echo "2. 更新 Composer 依赖..."
    # 优先使用 composer.phar（最新版本）
    if php -d disable_functions= -d allow_url_fopen=On ./composer.phar update --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    elif php -d disable_functions= -d allow_url_fopen=On ./composer.phar update --no-dev --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar update --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar update --no-dev --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
        COMPOSER_SUCCESS=true
    else
        COMPOSER_SUCCESS=false
    fi

    if [ "$COMPOSER_SUCCESS" != "true" ]; then
        echo -e "${YELLOW}⚠ Composer 更新失败，尝试重新安装...${NC}"
        rm -rf vendor composer.lock 2>/dev/null
        if php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
            COMPOSER_SUCCESS=true
        elif php ./composer.phar install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-fileinfo 2>&1; then
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
fi

echo ""
echo "3. 运行数据库迁移和更新命令..."

# 确保 vendor/autoload.php 存在
if [ ! -f "vendor/autoload.php" ]; then
    echo -e "${RED}✗ vendor/autoload.php 不存在，无法执行 artisan 命令${NC}"
    echo "请先确保 Composer 依赖安装成功"
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
echo "4. 设置文件权限（aaPanel 环境）..."
if [ -f "/etc/init.d/bt" ]; then
    chown -R www:www "$CURRENT_DIR" 2>/dev/null
    echo -e "${GREEN}✓ 文件权限已设置${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 4] 清除缓存${NC}"
echo "----------------------------------------"

# 确保 vendor/autoload.php 存在
if [ ! -f "vendor/autoload.php" ]; then
    echo -e "${RED}✗ vendor/autoload.php 不存在，无法执行 artisan 命令${NC}"
    exit 1
fi

php artisan optimize:clear

if [ $? -eq 0 ]; then
    php artisan optimize
    echo -e "${GREEN}✓ 缓存已清除${NC}"
else
    echo -e "${YELLOW}⚠ 清除缓存失败，可以稍后手动执行${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 5] 检查服务${NC}"
echo "----------------------------------------"

# 检查 Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx 正在运行${NC}"
else
    if check_process "nginx: master process" || check_process "/www/server/nginx"; then
        echo -e "${GREEN}✓ 检测到 Nginx 进程（aaPanel 管理）${NC}"
    else
        echo -e "${YELLOW}⚠ Nginx 未运行${NC}"
    fi
fi

# 检查 PHP-FPM
PHP_FPM_SERVICE=$(systemctl list-units --type=service | grep -o "php-fpm[0-9.]*" | head -1)
if [ -n "$PHP_FPM_SERVICE" ]; then
    if systemctl is-active --quiet "$PHP_FPM_SERVICE" 2>/dev/null; then
        echo -e "${GREEN}✓ PHP-FPM ($PHP_FPM_SERVICE) 正在运行${NC}"
    else
        if check_process "php-fpm" || check_process "php-cgi"; then
            echo -e "${GREEN}✓ 检测到 PHP-FPM 进程（aaPanel 管理）${NC}"
        else
            echo -e "${YELLOW}⚠ PHP-FPM 未运行${NC}"
        fi
    fi
elif check_process "php-fpm" || check_process "php-cgi"; then
    echo -e "${GREEN}✓ 检测到 PHP-FPM 进程（aaPanel 管理）${NC}"
fi

# 检查 Horizon（如果使用）
if supervisorctl status xboard &> /dev/null 2>&1 || supervisorctl status horizon &> /dev/null 2>&1; then
    HORIZON_SERVICE=$(supervisorctl status 2>/dev/null | grep -E "xboard|horizon" | grep -oE "xboard|horizon" | head -1)
    if [ -n "$HORIZON_SERVICE" ]; then
        echo ""
        echo -e "${YELLOW}⚠ 检测到 Horizon 队列服务${NC}"
        echo "  通常在 xboard:update 命令中已自动重启"
        echo "  如果队列未正常工作，请在 aaPanel 中重启"
    fi
fi

echo ""
echo -e "${BLUE}[步骤 6] 运行部署后自检${NC}"
echo "----------------------------------------"
if [ -f "post-deploy-diagnose.sh" ]; then
    ./post-deploy-diagnose.sh
else
    echo -e "${YELLOW}⚠ 未找到 post-deploy-diagnose.sh，建议添加以便快速排查${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 7] 自动重启 Octane 并生成日志${NC}"
echo "----------------------------------------"
LOG_DIR="/var/log/xboard"
mkdir -p "$LOG_DIR"
if pkill -f "octane:start" >/dev/null 2>&1; then
    echo "旧的 Octane 进程已停止"
fi
nohup php artisan octane:start --server=swoole --host=0.0.0.0 --port=7001 > "$LOG_DIR/octane.log" 2>&1 &
sleep 3
if check_process "octane:start"; then
    echo -e "${GREEN}✓ Octane 已重启，日志路径：$LOG_DIR/octane.log${NC}"
else
    echo -e "${YELLOW}⚠ Octane 重启失败，请检查 $LOG_DIR/octane.log${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  升级完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}后续操作：${NC}"
echo "  1. 访问网站验证功能是否正常"
echo "  2. 查看 Laravel 日志：tail -f storage/logs/laravel.log"
echo "  3. 查看 Octane 日志：tail -f $LOG_DIR/octane.log"
echo "  4. 测试核心功能（登录、订阅等）"
echo ""

# 显示版本信息
if php artisan --version &> /dev/null; then
    echo -e "${BLUE}当前版本：${NC}"
    php artisan --version
fi

echo ""

