#!/bin/bash
# Xboard 环境准备脚本（aaPanel 环境）
# 用于检查、安装、更新必要的 PHP 扩展和运行条件

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Xboard 环境准备脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否在正确的目录
if [ ! -f "artisan" ]; then
    echo -e "${RED}✗ 错误：未找到 artisan 文件${NC}"
    echo "请确保在 Xboard 根目录执行此脚本"
    echo "例如: cd /www/wwwroot/xboard && ./setup-environment.sh"
    exit 1
fi

# 获取当前目录
CURRENT_DIR=$(pwd)
echo -e "${GREEN}✓ 当前目录: $CURRENT_DIR${NC}"

# 检查 PHP 版本
PHP_VERSION=$(php -v | head -n 1)
echo -e "${GREEN}✓ PHP 版本: $PHP_VERSION${NC}"
echo ""

PHP_VER=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;" 2>/dev/null || echo "8.2")

# 检查并安装 PHP 扩展的函数
check_and_install_php_ext() {
    local ext=$1
    local ext_name=$2
    local package_name=${3:-$ext}
    
    # 检查扩展是否已加载
    if php -m | grep -qi "^${ext}$"; then
        echo -e "${GREEN}✓ ${ext_name} 扩展已安装${NC}"
        return 0
    fi
    
    # 对于 dom，检查 libxml
    if [ "$ext" = "dom" ]; then
        if php -m | grep -qi "libxml"; then
            echo -e "${GREEN}✓ ${ext_name} 扩展已安装（通过 libxml）${NC}"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}⚠ 未检测到 ${ext_name} 扩展，尝试自动安装...${NC}"
    
    if command -v apt-get >/dev/null 2>&1; then
        if apt-get install -y "php${PHP_VER}-${package_name}" >/dev/null 2>&1; then
            if php -m | grep -qi "^${ext}$" || ([ "$ext" = "dom" ] && php -m | grep -qi "libxml"); then
                echo -e "${GREEN}✓ ${ext_name} 扩展安装成功${NC}"
                return 0
            fi
        fi
    fi
    
    echo -e "${RED}✗ ${ext_name} 扩展安装失败${NC}"
    echo "   请在 aaPanel > PHP ${PHP_VER} > 设置 > 安装扩展 中手动安装"
    echo "   或运行: apt install php${PHP_VER}-${package_name} -y"
    return 1
}

# 检查必需的 PHP 扩展
echo -e "${BLUE}[步骤 1] 检查并安装 PHP 扩展${NC}"
echo "----------------------------------------"
MISSING_EXTS=0

if ! check_and_install_php_ext "fileinfo" "fileinfo"; then
    MISSING_EXTS=$((MISSING_EXTS + 1))
fi

if ! check_and_install_php_ext "curl" "curl"; then
    MISSING_EXTS=$((MISSING_EXTS + 1))
fi

if ! check_and_install_php_ext "dom" "dom" "xml"; then
    MISSING_EXTS=$((MISSING_EXTS + 1))
fi

if ! check_and_install_php_ext "pdo_mysql" "pdo_mysql" "mysql"; then
    MISSING_EXTS=$((MISSING_EXTS + 1))
fi

if ! check_and_install_php_ext "mbstring" "mbstring"; then
    MISSING_EXTS=$((MISSING_EXTS + 1))
fi

if ! check_and_install_php_ext "redis" "redis"; then
    echo -e "${YELLOW}⚠ Redis 扩展未安装，将使用 Predis（纯 PHP 实现）${NC}"
fi

# 检查 Swoole（Octane 需要）
echo ""
echo -e "${BLUE}检查 Swoole 扩展（Octane 需要）${NC}"
echo "----------------------------------------"
SWOOLE_INSTALLED=false

# 检查 Swoole 是否已安装
if php -m 2>/dev/null | grep -qi "^swoole$"; then
    SWOOLE_VERSION=$(php -r "echo phpversion('swoole');" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Swoole 扩展已安装 (版本: $SWOOLE_VERSION)${NC}"
    SWOOLE_INSTALLED=true
else
    echo -e "${YELLOW}⚠ 未检测到 Swoole 扩展${NC}"
    
    # 检查 PHP 扫描目录配置
    SCAN_DIR=$(php --ini 2>/dev/null | grep "Scan for additional" | awk -F: '{print $2}' | xargs)
    if [ -z "$SCAN_DIR" ] || [ "$SCAN_DIR" = "(none)" ]; then
        echo -e "${YELLOW}⚠ PHP 未配置扫描目录，conf.d 中的配置不会被加载${NC}"
        echo "  将直接在主配置文件中添加 Swoole 配置..."
        
        # 查找主配置文件
        PHP_CLI_INI=""
        if [ -f "/www/server/php/${PHP_VER//./}/etc/php-cli.ini" ]; then
            PHP_CLI_INI="/www/server/php/${PHP_VER//./}/etc/php-cli.ini"
        elif [ -f "/etc/php/${PHP_VER}/cli/php.ini" ]; then
            PHP_CLI_INI="/etc/php/${PHP_VER}/cli/php.ini"
        fi
        
        if [ -n "$PHP_CLI_INI" ] && [ -f "$PHP_CLI_INI" ]; then
            # 检查扩展文件是否存在
            PHP_EXT_DIR=$(php -r "echo ini_get('extension_dir');" 2>/dev/null)
            if [ -f "$PHP_EXT_DIR/swoole.so" ]; then
                # 检查主配置文件中是否已有正确的配置
                if ! grep -q "^extension=swoole.so" "$PHP_CLI_INI" 2>/dev/null; then
                    # 清理格式错误的配置
                    sed -i '/^[^;]*extension.*swoole[^.]*$/s/^/; /' "$PHP_CLI_INI" 2>/dev/null
                    # 添加正确的配置
                    if ! grep -q "extension=swoole.so" "$PHP_CLI_INI" 2>/dev/null; then
                        echo "" >> "$PHP_CLI_INI"
                        echo "; Swoole extension (added by setup script)" >> "$PHP_CLI_INI"
                        echo "extension=swoole.so" >> "$PHP_CLI_INI"
                        echo -e "${GREEN}✓ 已在主配置文件中添加 Swoole 配置${NC}"
                    fi
                fi
            fi
        fi
    else
        # PHP 配置了扫描目录，检查 conf.d 中的配置
        CONF_D_DIR="$SCAN_DIR"
        if [ -d "$CONF_D_DIR" ]; then
            SWOOLE_INI=$(find "$CONF_D_DIR" -name "*swoole*.ini" 2>/dev/null | head -1)
            if [ -n "$SWOOLE_INI" ] && [ -f "$SWOOLE_INI" ]; then
                # 确保配置格式正确
                if ! grep -q "^extension=swoole.so$" "$SWOOLE_INI" 2>/dev/null; then
                    echo "修复 conf.d 中的 Swoole 配置..."
                    echo "extension=swoole.so" > "$SWOOLE_INI"
                    echo -e "${GREEN}✓ 已修复 conf.d 中的配置${NC}"
                fi
            else
                # 创建配置文件
                echo "在 conf.d 中创建 Swoole 配置..."
                echo "extension=swoole.so" > "$CONF_D_DIR/20-swoole.ini"
                echo -e "${GREEN}✓ 已创建配置文件${NC}"
            fi
        fi
    fi
    
    # 尝试通过 apt 安装（如果扩展文件不存在）
    PHP_EXT_DIR=$(php -r "echo ini_get('extension_dir');" 2>/dev/null)
    if [ ! -f "$PHP_EXT_DIR/swoole.so" ]; then
        if command -v apt-get >/dev/null 2>&1; then
            echo "Swoole 扩展文件不存在，尝试通过 apt 安装..."
            if apt-get install -y "php${PHP_VER}-swoole" >/dev/null 2>&1; then
                sleep 2
            fi
        fi
    fi
    
    # 重新检查
    sleep 1
    if php -m 2>/dev/null | grep -qi "^swoole$"; then
        SWOOLE_VERSION=$(php -r "echo phpversion('swoole');" 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓ Swoole 扩展现在已加载 (版本: $SWOOLE_VERSION)${NC}"
        SWOOLE_INSTALLED=true
    else
        # 检查主配置文件中的格式错误
        if [ -n "$PHP_CLI_INI" ] && [ -f "$PHP_CLI_INI" ]; then
            # 检查是否有格式错误的配置（包含注释内容）
            if grep -q "extension.*swoole.*#" "$PHP_CLI_INI" 2>/dev/null; then
                echo "发现格式错误的 Swoole 配置，正在修复..."
                # 注释掉所有格式错误的行
                sed -i '/^[^;]*extension.*swoole.*#/s/^/; /' "$PHP_CLI_INI"
                # 确保有正确的配置
                if ! grep -q "^extension=swoole.so" "$PHP_CLI_INI" 2>/dev/null; then
                    echo "" >> "$PHP_CLI_INI"
                    echo "extension=swoole.so" >> "$PHP_CLI_INI"
                fi
                echo -e "${GREEN}✓ 已修复格式错误的配置${NC}"
                
                # 再次检查
                sleep 1
                if php -m 2>/dev/null | grep -qi "^swoole$"; then
                    SWOOLE_VERSION=$(php -r "echo phpversion('swoole');" 2>/dev/null || echo "unknown")
                    echo -e "${GREEN}✓ Swoole 扩展现在已加载 (版本: $SWOOLE_VERSION)${NC}"
                    SWOOLE_INSTALLED=true
                fi
            fi
        fi
    fi
    
    # 如果仍未安装，提供详细说明
    if [ "$SWOOLE_INSTALLED" = false ]; then
        echo -e "${YELLOW}⚠ Swoole 扩展安装失败${NC}"
        echo ""
        echo "安装方法："
        echo "  方法 1（推荐）：通过 aaPanel 安装"
        echo "    1. 登录 aaPanel"
        echo "    2. 进入：App Store > PHP ${PHP_VER} > 设置 > 安装扩展"
        echo "    3. 找到 'swoole' 扩展，点击安装"
        echo "    4. 安装完成后重启 PHP-FPM"
        echo ""
        echo "  方法 2：手动安装"
        echo "    apt install php${PHP_VER}-swoole -y"
        echo ""
        echo "  方法 3：使用 RoadRunner 替代（如果无法安装 Swoole）"
        echo "    在 .env 文件中设置：OCTANE_SERVER=roadrunner"
        echo ""
        echo "验证安装："
        echo "    php -m | grep swoole"
        echo ""
    fi
fi

echo ""

# 检查 Redis 服务
echo -e "${BLUE}[步骤 2] 检查 Redis 服务${NC}"
echo "----------------------------------------"
if ! command -v redis-cli >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Redis 未安装，尝试自动安装...${NC}"
    if command -v apt-get >/dev/null 2>&1; then
        if apt-get install -y redis-server >/dev/null 2>&1; then
            systemctl enable redis-server 2>/dev/null || systemctl enable redis 2>/dev/null || true
            systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
            sleep 2
            if redis-cli ping >/dev/null 2>&1; then
                echo -e "${GREEN}✓ Redis 安装并启动成功${NC}"
            else
                echo -e "${YELLOW}⚠ Redis 安装成功但启动失败，将使用 Predis${NC}"
                if [ -f .env ]; then
                    if ! grep -q "^REDIS_CLIENT=" .env; then
                        echo "REDIS_CLIENT=predis" >> .env
                        echo -e "${GREEN}✓ 已在 .env 中添加 REDIS_CLIENT=predis${NC}"
                    fi
                fi
            fi
        else
            echo -e "${YELLOW}⚠ Redis 自动安装失败，将使用 Predis${NC}"
            if [ -f .env ]; then
                if ! grep -q "^REDIS_CLIENT=" .env; then
                    echo "REDIS_CLIENT=predis" >> .env
                    echo -e "${GREEN}✓ 已在 .env 中添加 REDIS_CLIENT=predis${NC}"
                fi
            fi
        fi
    else
        echo -e "${YELLOW}⚠ 无法自动安装 Redis，将使用 Predis${NC}"
    fi
else
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis 服务正在运行${NC}"
    else
        echo -e "${YELLOW}⚠ Redis 服务未运行，尝试启动...${NC}"
        systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || service redis-server start 2>/dev/null || service redis start 2>/dev/null || true
        sleep 2
        if redis-cli ping >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Redis 服务已启动${NC}"
        else
            echo -e "${YELLOW}⚠ Redis 服务启动失败，自动切换到 Predis${NC}"
            if [ -f .env ]; then
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
            fi
        fi
    fi
fi

echo ""

# 检查 Composer
echo -e "${BLUE}[步骤 3] 检查并准备 Composer${NC}"
echo "----------------------------------------"
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
echo ""

# 检查文件权限
echo -e "${BLUE}[步骤 4] 检查文件权限${NC}"
echo "----------------------------------------"
if [ -f "/etc/init.d/bt" ]; then
    PHP_USER="www"
    echo "检测到 aaPanel 环境，PHP 用户: $PHP_USER"
    chown -R "$PHP_USER":"$PHP_USER" storage bootstrap/cache 2>/dev/null || true
    echo -e "${GREEN}✓ 文件权限已设置${NC}"
else
    echo -e "${YELLOW}⚠ 未检测到 aaPanel 环境，跳过权限设置${NC}"
fi

echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  环境检查完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $MISSING_EXTS -gt 0 ]; then
    echo -e "${YELLOW}⚠ 检测到 $MISSING_EXTS 个缺失的必需扩展${NC}"
    echo "请手动安装缺失的扩展后重新运行此脚本"
    echo ""
    echo "安装命令："
    echo "  apt install php${PHP_VER}-fileinfo php${PHP_VER}-curl php${PHP_VER}-xml php${PHP_VER}-mysql php${PHP_VER}-mbstring php${PHP_VER}-redis php${PHP_VER}-swoole -y"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ 所有必需的 PHP 扩展已安装${NC}"
    
    # 检查 Swoole 状态
    if [ "$SWOOLE_INSTALLED" = false ]; then
        echo -e "${YELLOW}⚠ Swoole 扩展未安装（可选，但推荐安装以使用 Octane）${NC}"
    fi
    
    echo -e "${GREEN}✓ 环境准备完成，可以运行 update-xboard.sh 进行代码更新${NC}"
    echo ""
fi

