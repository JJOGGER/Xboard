#!/bin/bash
# Xboard 快速升级脚本（aaPanel 环境）

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
echo -e "${BLUE}[步骤 3] 清理并安装依赖${NC}"
echo "----------------------------------------"

echo "1. 删除旧的 vendor 和 composer.lock..."
rm -rf vendor composer.lock 2>/dev/null
echo -e "${GREEN}✓ 已删除${NC}"

echo ""
echo "2. 安装 Composer 依赖..."
if command -v composer &> /dev/null; then
    echo "使用系统 composer..."
    composer install --no-dev --optimize-autoloader
else
    echo "使用 composer.phar..."
    if [ ! -f "composer.phar" ]; then
        echo "下载 composer.phar..."
        wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar 2>/dev/null
        if [ ! -f "composer.phar" ]; then
            echo -e "${RED}✗ 无法下载 composer.phar${NC}"
            exit 1
        fi
    fi
    php composer.phar install --no-dev --optimize-autoloader
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Composer 安装失败${NC}"
    echo "请检查 PHP 版本和网络连接"
    exit 1
fi

echo -e "${GREEN}✓ 依赖安装成功${NC}"

echo ""
echo "3. 运行数据库迁移和更新命令..."
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
echo -e "${BLUE}[步骤 5] 清除缓存${NC}"
echo "----------------------------------------"

php artisan optimize:clear

if [ $? -eq 0 ]; then
    php artisan optimize
    echo -e "${GREEN}✓ 缓存已清除${NC}"
else
    echo -e "${YELLOW}⚠ 清除缓存失败，可以稍后手动执行${NC}"
fi

echo ""
echo -e "${BLUE}[步骤 6] 检查服务${NC}"
echo "----------------------------------------"

# 检查 Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx 正在运行${NC}"
else
    echo -e "${YELLOW}⚠ Nginx 未运行${NC}"
fi

# 检查 PHP-FPM
PHP_FPM_SERVICE=$(systemctl list-units --type=service | grep -o "php-fpm[0-9.]*" | head -1)
if [ -n "$PHP_FPM_SERVICE" ]; then
    if systemctl is-active --quiet "$PHP_FPM_SERVICE" 2>/dev/null; then
        echo -e "${GREEN}✓ PHP-FPM ($PHP_FPM_SERVICE) 正在运行${NC}"
    else
        echo -e "${YELLOW}⚠ PHP-FPM 未运行${NC}"
    fi
fi

# 检查 Octane（如果使用）
if supervisorctl status octane &> /dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}⚠ 检测到 Octane 服务${NC}"
    echo "  请在 aaPanel 中重启 Octane："
    echo "  App Store > Tools > Supervisor > Restart Octane"
    echo ""
    read -p "是否现在重启 Octane? (y/n): " RESTART_OCTANE
    if [[ "$RESTART_OCTANE" =~ ^[Yy]$ ]]; then
        supervisorctl restart octane
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Octane 已重启${NC}"
        else
            echo -e "${YELLOW}⚠ Octane 重启失败，请手动重启${NC}"
        fi
    fi
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
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  升级完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}后续操作：${NC}"
echo "  1. 访问网站验证功能是否正常"
echo "  2. 检查日志是否有错误："
echo "     tail -f storage/logs/laravel.log"
echo "  3. 如果使用 Octane，确认已重启"
echo "  4. 测试核心功能（登录、订阅等）"
echo ""

# 显示版本信息
if php artisan --version &> /dev/null; then
    echo -e "${BLUE}当前版本：${NC}"
    php artisan --version
fi

echo ""

