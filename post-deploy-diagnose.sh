#!/bin/bash
# Xboard 部署后诊断脚本

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

section() {
    echo ""
    echo -e "${BLUE}[$1] $2${NC}"
    echo "----------------------------------------"
}

ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; }

require_root_dir() {
    if [ ! -f "artisan" ]; then
        err "未在 Xboard 根目录，请先执行: cd /www/wwwroot/your-domain"
        exit 1
    fi
}

run_or_warn() {
    local description=$1
    shift
    if output=$("$@" 2>&1); then
        ok "$description"
    else
        warn "$description 失败"
        echo "$output"
    fi
}

require_root_dir

section 1 "基础信息"
ok "当前目录: $(pwd)"
git rev-parse HEAD >/dev/null 2>&1 && ok "当前提交: $(git rev-parse --short HEAD)" || warn "Git 信息不可用"
php -v | head -n1

section 2 "PHP 扩展检查"
if php -m | grep -qi fileinfo; then
    ok "fileinfo 扩展可用"
else
    warn "fileinfo 扩展缺失，会导致 composer 安装失败。请在 aaPanel 中安装。"
fi
for ext in pcntl swoole; do
    count=$(php -m | grep -c "^$ext$")
    if [ "$count" -gt 1 ]; then
        warn "$ext 扩展可能重复加载，请检查 php.ini"
    else
        ok "$ext 扩展检测通过"
    fi
done

section 3 "日志与权限"
mkdir -p storage/logs
touch storage/logs/laravel.log 2>/dev/null
if [ $? -eq 0 ]; then
    ok "日志目录可写"
else
    err "无法写入 storage/logs，请检查权限 (chown -R www:www storage)"
fi

section 4 "Redis 连接"
REDIS_RESULT=$(php artisan tinker --execute="try { Redis::connection()->ping(); echo 'PONG'; } catch (\Exception \$e) { echo 'ERROR:' . \$e->getMessage(); }" 2>/dev/null)
if [[ "$REDIS_RESULT" == PONG* ]]; then
    ok "Redis 连接正常 ($REDIS_RESULT)"
else
    warn "Redis 连接异常: $REDIS_RESULT"
fi

section 5 "数据库连接"
DB_RESULT=$(php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'OK'; } catch (\Exception \$e) { echo 'ERROR:' . \$e->getMessage(); }" 2>/dev/null)
if [[ "$DB_RESULT" == OK* ]]; then
    ok "数据库连接正常"
else
    warn "数据库连接异常: $DB_RESULT"
fi

section 6 "配置读取"
SECURE_PATH=$(php artisan tinker --execute="try { echo admin_setting('secure_path', admin_setting('frontend_admin_path', hash('crc32b', config('app.key')))); } catch (\Exception \$e) { echo 'ERROR:' . \$e->getMessage(); }" 2>/dev/null)
if [[ "$SECURE_PATH" == ERROR:* ]]; then
    warn "无法读取 secure_path: $SECURE_PATH"
else
    ok "管理后台路径: /$SECURE_PATH"
fi

section 7 "Octane 状态"
if pgrep -f "octane:start" >/dev/null 2>&1; then
    OCTANE_PID=$(pgrep -f "octane:start" | head -1)
    ok "Octane 进程运行中 (PID $OCTANE_PID)"
    if ! ss -tlnp 2>/dev/null | grep -q ":7001"; then
        warn "未检测到 7001 端口监听，请确认 Octane 启动参数"
    fi
else
    warn "未检测到 Octane 进程，可通过以下命令启动："
    echo "    nohup php artisan octane:start --server=swoole --host=0.0.0.0 --port=7001 >/tmp/octane.log 2>&1 &"
fi

section 8 "Nginx / PHP-FPM 快速检测"
pgrep -f "nginx: master process" >/dev/null && ok "检测到 Nginx 进程" || warn "未检测到 Nginx 进程"
pgrep -f "php-fpm" >/dev/null && ok "检测到 PHP-FPM 进程" || warn "未检测到 PHP-FPM 进程"

section 9 "最近日志"
if [ -s storage/logs/laravel.log ]; then
    tail -n 40 storage/logs/laravel.log
else
    warn "日志文件为空或不存在"
fi

section 10 "常用恢复命令"
cat <<'EOF'
1) 重启 Octane：
   pkill -f "octane:start"
   nohup php artisan octane:start --server=swoole --host=0.0.0.0 --port=7001 >/tmp/octane.log 2>&1 &

2) 清理缓存：
   php artisan optimize:clear

3) 检查日志：
   tail -f storage/logs/laravel.log

4) 检查 Redis / DB：
   php artisan tinker --execute="Redis::connection()->ping();"
   php artisan tinker --execute="DB::connection()->getPdo();"
EOF

echo ""
echo -e "${GREEN}诊断完成。若仍有问题，请根据上面的警告逐项处理。${NC}"

