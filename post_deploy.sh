#!/usr/bin/env bash
set -e

PROJECT_DIR="/www/wwwroot/xboard"
PHP_USER="www"                   # 按你的环境，当前 php/nginx 用户是 www
SUPERVISOR_CONF_DIR="/etc/supervisor/conf.d"

echo "== Xboard post deploy start =="

cd "$PROJECT_DIR"

echo "[1] 修复 storage / cache 权限..."
chown -R "$PHP_USER":"$PHP_USER" storage bootstrap/cache || true

echo "[2] 刷新配置 / 缓存..."
php artisan config:clear
php artisan cache:clear || true

echo "[3] 执行数据库迁移（如有新迁移）..."
php artisan migrate --force || true

echo "[4] 写入 Supervisor 队列配置 (xboard-queue)..."
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

echo "[5] 写入 Supervisor Horizon 配置 (xboard-horizon)..."
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

echo "[6] 让 Supervisor 生效并重启相关进程..."
supervisorctl reread
supervisorctl update
supervisorctl restart xboard-queue || true
supervisorctl restart xboard-horizon || true

echo "[7] 当前队列进程状态："
supervisorctl status xboard-queue || true
supervisorctl status xboard-horizon || true

echo "== Xboard post deploy done =="