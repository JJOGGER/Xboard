#!/usr/bin/env bash
# 不使用 set -e，手动处理错误
# set -e

PROJECT_DIR="/www/wwwroot/xboard"
PHP_USER="www"                   # 按你的环境，当前 php/nginx 用户是 www
SUPERVISOR_CONF_DIR="/etc/supervisor/conf.d"

echo "== Xboard post deploy start =="

cd "$PROJECT_DIR"

echo "[1] 安装/更新 Composer 依赖..."

# 确保使用最新版本的 composer.phar（Laravel 12 需要 Composer 2.2+）
if [ ! -f "composer.phar" ]; then
    echo "下载最新版 Composer..."
    wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar || \
    curl -L https://getcomposer.org/download/latest-stable/composer.phar -o composer.phar
    chmod +x composer.phar
else
    echo "更新 composer.phar 到最新版本..."
    # 更新 composer.phar 自身
    php -d disable_functions= composer.phar self-update 2>&1 || \
    wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar || \
    curl -L https://getcomposer.org/download/latest-stable/composer.phar -o composer.phar
    chmod +x composer.phar
fi

# 验证 composer.phar 版本
echo "检查 Composer 版本..."
COMPOSER_VERSION=$(php -d disable_functions= composer.phar --version 2>&1 | head -n 1 || echo "unknown")
echo "Composer 版本: $COMPOSER_VERSION"

# 检查 vendor 目录是否存在，如果不存在则安装依赖
# 使用 php -d disable_functions= 来临时允许 putenv 等函数（解决 aaPanel 禁用函数的问题）
COMPOSER_SUCCESS=false

if [ ! -d "vendor" ] || [ ! -f "vendor/autoload.php" ]; then
    echo "vendor 目录不存在或 autoload.php 缺失，执行 composer install..."
    
    # 优先使用 composer.phar（最新版本），避免使用系统的旧版本 composer
    # 尝试多种方式运行 composer install
    if php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --optimize-autoloader --no-interaction 2>&1; then
        COMPOSER_SUCCESS=true
    elif php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --no-interaction 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar install --no-dev --optimize-autoloader --no-interaction 2>&1; then
        COMPOSER_SUCCESS=true
    elif php ./composer.phar install --no-dev --no-interaction 2>&1; then
        COMPOSER_SUCCESS=true
    else
        echo "尝试使用 --ignore-platform-reqs 选项..."
        if php -d disable_functions= -d allow_url_fopen=On ./composer.phar install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs 2>&1; then
            COMPOSER_SUCCESS=true
        elif php ./composer.phar install --no-dev --no-interaction --ignore-platform-reqs 2>&1; then
            COMPOSER_SUCCESS=true
        fi
    fi
    
    if [ "$COMPOSER_SUCCESS" = false ]; then
        echo "❌ Composer install 失败！请检查错误信息"
        echo "提示：可能是 PHP putenv 函数被禁用，请在 aaPanel 中启用 putenv 函数"
        exit 1
    fi
else
    echo "vendor 目录已存在，跳过 composer install"
    COMPOSER_SUCCESS=true
fi

# 验证 vendor/autoload.php 是否存在
if [ ! -f "vendor/autoload.php" ]; then
    echo "❌ vendor/autoload.php 不存在！Composer install 可能未成功完成"
    exit 1
fi

echo "✓ Composer 依赖安装成功"

echo "[2] 修复 storage / cache 权限..."
chown -R "$PHP_USER":"$PHP_USER" storage bootstrap/cache vendor || true

echo "[3] 刷新配置 / 缓存..."
# 确保 vendor 存在后再执行 artisan 命令
if [ ! -f "vendor/autoload.php" ]; then
    echo "❌ vendor/autoload.php 不存在，无法执行 artisan 命令"
    exit 1
fi
php artisan config:clear || true
php artisan cache:clear || true

echo "[4] 执行数据库迁移（如有新迁移）..."
php artisan migrate --force || true

echo "[5] 写入 Supervisor 队列配置 (xboard-queue)..."
cat > "$SUPERVISOR_CONF_DIR/xboard-queue.conf" <<EOF
[program:xboard-queue]
directory=$PROJECT_DIR
command=php artisan queue:work --queue=online_sync,traffic_fetch,stat_user,stat_server,default --sleep=3 --tries=3
autostart=true
autorestart=true
user=$PHP_USER
redirect_stderr=true
stdout_logfile=/var/log/xboard-queue.log
EOF

echo "[6] 写入 Supervisor Horizon 配置 (xboard-horizon)..."
cat > "$SUPERVISOR_CONF_DIR/xboard-horizon.conf" <<EOF
[program:xboard-horizon]
directory=$PROJECT_DIR
command=php artisan horizon
autostart=true
autorestart=true
user=$PHP_USER
redirect_stderr=true
stdout_logfile=/var/log/xboard-horizon.log
EOF

echo "[7] 让 Supervisor 生效并重启相关进程..."
supervisorctl reread
supervisorctl update
supervisorctl restart xboard-queue || true
supervisorctl restart xboard-horizon || true

echo "[8] 当前队列进程状态："
supervisorctl status xboard-queue || true
supervisorctl status xboard-horizon || true

echo "== Xboard post deploy done =="