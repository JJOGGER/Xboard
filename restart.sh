#!/bin/bash

# ==========================================
# Xboard Octane 重启脚本
# 功能：修改 .env 配置后重启 Octane 服务，使配置生效
# 支持：aaPanel Supervisor 管理的 Octane
# ==========================================

set -uo pipefail
# 注意：不使用 set -e，因为某些命令可能失败但不应该终止整个脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# 确保脚本具有执行权限
chmod +x "$0" >/dev/null 2>&1 || true

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测端口是否被占用
check_port_in_use() {
    local port=$1
    if command -v ss >/dev/null 2>&1; then
        ss -tuln 2>/dev/null | grep -q ":${port}" && return 0
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tuln 2>/dev/null | grep -q ":${port}" && return 0
    fi
    return 1
}

# 获取占用端口的进程 PID
get_port_pid() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti :"${port}" 2>/dev/null || echo ""
    elif command -v fuser >/dev/null 2>&1; then
        fuser "${port}/tcp" 2>/dev/null | awk '{print $1}' || echo ""
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":${port}" | grep -oP 'pid=\K[0-9]+' | head -1 || echo ""
    fi
}

# 强制杀死占用端口的进程
kill_port_process() {
    local port=$1
    local max_attempts=3
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if ! check_port_in_use "$port"; then
            return 0
        fi
        
        log_warn "端口 ${port} 仍被占用，尝试释放 (第 $((attempt + 1)) 次)..."
        
        # 方法1: 使用 fuser
        if command -v fuser >/dev/null 2>&1; then
            fuser -k "${port}/tcp" 2>/dev/null || true
            sleep 1
        fi
        
        # 方法2: 使用 lsof
        if command -v lsof >/dev/null 2>&1; then
            local pids=$(lsof -ti :"${port}" 2>/dev/null || true)
            if [ -n "$pids" ]; then
                echo "$pids" | xargs kill -9 2>/dev/null || true
                sleep 1
            fi
        fi
        
        # 方法3: 查找并杀死 swoole/octane 相关进程
        if check_port_in_use "$port"; then
            local pids=$(ps aux | grep -E '[s]woole|[o]ctane:start' | awk '{print $2}' || true)
            if [ -n "$pids" ]; then
                echo "$pids" | xargs kill -9 2>/dev/null || true
                sleep 1
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    # 最终检查
    if check_port_in_use "$port"; then
        log_error "无法释放端口 ${port}，请手动检查"
        return 1
    fi
    
    return 0
}

# 检测 Octane 端口（从运行进程或默认值）
detect_octane_port() {
    local default_port=7001
    
    # 优先从运行中的进程检测
    if pgrep -f "octane:start" >/dev/null 2>&1; then
        # 方法1: 从进程命令行参数读取
        local pids=$(pgrep -f "octane:start" 2>/dev/null || echo "")
        if [ -n "$pids" ]; then
            local first_pid=$(echo "$pids" | head -1)
            local cmd=$(ps -p "$first_pid" -o args= 2>/dev/null || ps aux | grep "[o]ctane:start" | head -1 | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
            if echo "$cmd" | grep -qE '--port[= ]([0-9]+)'; then
                local detected_port=$(echo "$cmd" | grep -oE '--port[= ]([0-9]+)' | grep -oE '[0-9]+' | head -1)
                if [ -n "$detected_port" ] && [[ "$detected_port" =~ ^[0-9]+$ ]]; then
                    echo "$detected_port"
                    return 0
                fi
            fi
        fi
    fi
    
    # 方法2: 检测常用端口中是否有 Octane 在监听
    for port in 7001 7010 8000; do
        if check_port_in_use "$port"; then
            local pid=$(get_port_pid "$port")
            if [ -n "$pid" ]; then
                local cmd=$(ps -p "$pid" -o args= 2>/dev/null || ps aux | grep "^[^ ]* *${pid} " | head -1)
                if echo "$cmd" | grep -qE 'octane|swoole'; then
                    echo "$port"
                    return 0
                fi
            fi
        fi
    done
    
    # 返回默认端口
    echo "$default_port"
}

# 检测 Supervisor 进程名称
detect_supervisor_process_name() {
    # 常见的 Supervisor 进程名称
    local possible_names=("xboard-octane" "octane" "Octane" "xboard:octane")
    
    if command -v supervisorctl >/dev/null 2>&1; then
        # 尝试获取所有进程列表
        local processes=$(supervisorctl status 2>/dev/null | grep -i octane | awk '{print $1}' || echo "")
        
        if [ -n "$processes" ]; then
            # 取第一个匹配的进程名
            echo "$processes" | head -1
            return 0
        fi
        
        # 如果无法获取，尝试常见名称
        for name in "${possible_names[@]}"; do
            if supervisorctl status "$name" >/dev/null 2>&1; then
                echo "$name"
                return 0
            fi
        done
    fi
    
    echo ""
}

# 查找 PHP 可执行文件
find_php_bin() {
    # 常见的 PHP 路径（aaPanel）
    local possible_paths=(
        "/www/server/php/82/bin/php"
        "/www/server/php/81/bin/php"
        "/www/server/php/80/bin/php"
        "/usr/bin/php82"
        "/usr/bin/php81"
        "/usr/bin/php80"
        "/usr/bin/php"
        "php"
    )
    
    for path in "${possible_paths[@]}"; do
        if command -v "$path" >/dev/null 2>&1 && "$path" -v >/dev/null 2>&1; then
            echo "$path"
            return 0
        fi
    done
    
    # 如果都没找到，使用 php（可能在 PATH 中）
    echo "php"
}

# 清除 Laravel 缓存
clear_laravel_cache() {
    log_info "清除 Laravel 缓存..."
    
    local php_bin=$(find_php_bin)
    
    if [ ! -f "artisan" ]; then
        log_error "未找到 artisan 文件，请确保在项目根目录执行脚本"
        return 1
    fi
    
    "$php_bin" artisan config:clear >/dev/null 2>&1 || true
    "$php_bin" artisan cache:clear >/dev/null 2>&1 || true
    "$php_bin" artisan route:clear >/dev/null 2>&1 || true
    "$php_bin" artisan view:clear >/dev/null 2>&1 || true
    
    log_success "缓存已清除"
}

# 停止 Octane（优雅停止）
stop_octane_gracefully() {
    local supervisor_name=$1
    
    if [ -n "$supervisor_name" ] && command -v supervisorctl >/dev/null 2>&1; then
        log_info "通过 Supervisor 停止 Octane (${supervisor_name})..."
        
        # 先尝试停止
        if supervisorctl stop "$supervisor_name" >/dev/null 2>&1; then
            sleep 2
            if ! pgrep -f "octane:start" >/dev/null 2>&1; then
                log_success "Octane 已通过 Supervisor 停止"
                return 0
            fi
        fi
    fi
    
    # 如果 Supervisor 停止失败，尝试 pkill
    log_info "尝试优雅停止 Octane 进程..."
    pkill -f "octane:start" 2>/dev/null || true
    sleep 2
    
    return 0
}

# 重启 Octane（通过 Supervisor）
restart_octane_supervisor() {
    local supervisor_name=$1
    local port=$2
    
    if [ -z "$supervisor_name" ] || ! command -v supervisorctl >/dev/null 2>&1; then
        return 1
    fi
    
    log_info "通过 Supervisor 重启 Octane (${supervisor_name})..."
    
    # 先停止（确保端口释放）
    log_info "停止 Supervisor 进程..."
    supervisorctl stop "$supervisor_name" >/dev/null 2>&1 || true
    
    # 等待进程完全停止
    local wait_count=0
    local max_wait=10
    while [ $wait_count -lt $max_wait ]; do
        if ! pgrep -f "octane:start" >/dev/null 2>&1 && ! check_port_in_use "$port"; then
            break
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    # 如果端口仍被占用，强制释放
    if check_port_in_use "$port"; then
        log_warn "端口 ${port} 仍被占用，强制释放..."
        kill_port_process "$port" || true
        sleep 1
    fi
    
    # 确保进程已停止
    if pgrep -f "octane:start" >/dev/null 2>&1; then
        log_warn "Octane 进程仍在运行，强制停止..."
        pkill -9 -f "octane:start" 2>/dev/null || true
        sleep 1
    fi
    
    # 重新加载 Supervisor 配置（如果需要）
    supervisorctl reread >/dev/null 2>&1 || true
    supervisorctl update >/dev/null 2>&1 || true
    
    # 启动
    log_info "启动 Supervisor 进程..."
    if supervisorctl start "$supervisor_name" >/dev/null 2>&1; then
        # 等待启动
        sleep 3
        
        # 检查 Supervisor 状态
        local status=$(supervisorctl status "$supervisor_name" 2>/dev/null || echo "")
        if echo "$status" | grep -q "RUNNING"; then
            log_success "Octane 已通过 Supervisor 重启"
            return 0
        else
            log_warn "Supervisor 状态异常: $status"
            return 1
        fi
    else
        log_error "Supervisor 启动命令失败"
        return 1
    fi
}

# 手动启动 Octane（非 Supervisor 模式）
start_octane_manually() {
    local port=$1
    local php_bin=$(find_php_bin)
    
    log_info "手动启动 Octane (端口: ${port})..."
    
    # 确保端口已释放
    if check_port_in_use "$port"; then
        log_warn "端口 ${port} 被占用，强制释放..."
        kill_port_process "$port" || true
        sleep 1
    fi
    
    # 启动 Octane
    local server_type="swoole"
    if [ -f ".env" ]; then
        local env_server=$(grep -E '^OCTANE_SERVER=' .env 2>/dev/null | cut -d'=' -f2 | tr -d ' \r\n' || echo "")
        [ -n "$env_server" ] && server_type="$env_server"
    fi
    
    nohup "$php_bin" artisan octane:start --server="$server_type" --host=0.0.0.0 --port="$port" >/tmp/octane.log 2>&1 &
    
    sleep 3
    
    if pgrep -f "octane:start" >/dev/null 2>&1; then
        log_success "Octane 已手动启动"
        return 0
    fi
    
    return 1
}

# 验证 Octane 运行状态
verify_octane_status() {
    local port=$1
    local supervisor_name=$2
    
    log_info "验证 Octane 运行状态..."
    
    # 检查进程
    if ! pgrep -f "octane:start" >/dev/null 2>&1; then
        log_error "Octane 进程未运行"
        return 1
    fi
    
    # 检查端口
    if ! check_port_in_use "$port"; then
        log_warn "端口 ${port} 未监听"
        return 1
    fi
    
    # 如果使用 Supervisor，检查 Supervisor 状态
    if [ -n "$supervisor_name" ] && command -v supervisorctl >/dev/null 2>&1; then
        local status=$(supervisorctl status "$supervisor_name" 2>/dev/null || echo "")
        if echo "$status" | grep -q "RUNNING"; then
            log_success "Octane 运行正常 (Supervisor: ${supervisor_name}, 端口: ${port})"
            return 0
        elif echo "$status" | grep -q "FATAL\|EXITED"; then
            log_error "Supervisor 报告 Octane 状态异常"
            supervisorctl status "$supervisor_name"
            return 1
        fi
    else
        log_success "Octane 运行正常 (端口: ${port})"
    fi
    
    return 0
}

# 主函数
main() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   Xboard Octane 重启脚本${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # 1. 检测 Octane 端口
    local octane_port=$(detect_octane_port)
    log_info "检测到 Octane 端口: ${octane_port}"
    
    # 2. 检测 Supervisor 进程名称
    local supervisor_name=$(detect_supervisor_process_name)
    if [ -n "$supervisor_name" ]; then
        log_info "检测到 Supervisor 进程: ${supervisor_name}"
    else
        log_info "未检测到 Supervisor 管理，将使用手动模式"
    fi
    
    # 3. 清除缓存
    clear_laravel_cache
    
    # 4. 停止 Octane
    if pgrep -f "octane:start" >/dev/null 2>&1 || check_port_in_use "$octane_port"; then
        stop_octane_gracefully "$supervisor_name"
        
        # 如果端口仍被占用，强制释放
        if check_port_in_use "$octane_port"; then
            log_warn "端口 ${octane_port} 仍被占用，强制释放..."
            kill_port_process "$octane_port"
        fi
    else
        log_info "Octane 未运行，跳过停止步骤"
    fi
    
    # 5. 重启 Octane
    if [ -n "$supervisor_name" ]; then
        # 使用 Supervisor 重启
        if ! restart_octane_supervisor "$supervisor_name" "$octane_port"; then
            log_warn "Supervisor 重启失败，尝试手动启动..."
            if ! start_octane_manually "$octane_port"; then
                log_error "手动启动也失败，请检查日志"
                exit 1
            fi
        fi
    else
        # 手动启动
        if ! start_octane_manually "$octane_port"; then
            log_error "启动失败，请检查日志"
            exit 1
        fi
    fi
    
    # 6. 验证状态
    echo ""
    if verify_octane_status "$octane_port" "$supervisor_name"; then
        echo ""
        log_success "重启完成！"
        
        if [ -n "$supervisor_name" ]; then
            echo ""
            log_info "Supervisor 状态："
            supervisorctl status "$supervisor_name" 2>/dev/null || true
        fi
        
        echo ""
        log_info "提示："
        echo "  - 查看 Octane 日志: tail -f /tmp/octane.log"
        echo "  - 查看 Laravel 日志: tail -f storage/logs/laravel.log"
        if [ -n "$supervisor_name" ]; then
            echo "  - Supervisor 状态: supervisorctl status ${supervisor_name}"
        fi
    else
        echo ""
        log_error "重启后验证失败，请检查日志"
        exit 1
    fi
    
    echo ""
}

# 执行主函数
main "$@"

