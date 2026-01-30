#!/bin/bash
# 一键部署 xboard-frontend 的构建产物到 aaPanel 环境
# 功能：自动安装 Node + pnpm、安装依赖、构建 admin/user 前端、同步到指定目录

set -euo pipefail

# ===== 可自定义变量 =====
NODE_VERSION="${NODE_VERSION:-20.11.1}"                                # 需要安装/使用的 Node.js 版本
XBOARD_ROOT="${XBOARD_ROOT:-/www/wwwroot/mazu}"                        # XBoard 项目根目录
PROJECT_DIR="${PROJECT_DIR:-${XBOARD_ROOT}/xboard-frontend}"           # xboard-frontend 源码目录
ADMIN_DIST_DIR="${ADMIN_DIST_DIR:-${XBOARD_ROOT}/public/mazu-admin}" # Admin 前端发布目录
USER_DIST_DIR="${USER_DIST_DIR:-${XBOARD_ROOT}/public/mazu-user}"   # User 前端发布目录
KEEP_NODE_ARCHIVE="${KEEP_NODE_ARCHIVE:-false}"                        # 设置为 true 可缓存 Node 安装包
PNPM_VERSION="${PNPM_VERSION:-9.12.0}"
BUILD_MODE="${BUILD_MODE:-relaxed}"                                    # relaxed=strict typecheck off, strict=run vue-tsc
CLEAN_BUILD="${CLEAN_BUILD:-true}"                                     # true=构建前清理 dist 目录
LOG_FILE="${LOG_FILE:-/www/wwwlogs/xboard-frontend-deploy.log}"

# ===== 辅助函数 =====
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

die() {
    log "ERROR: $*"
    exit 1
}

require_cmd() {
    local cmd=$1
    command -v "$cmd" >/dev/null 2>&1 || die "缺少命令 '$cmd'，请先安装"
}

ensure_dir() {
    local dir=$1
    mkdir -p "$dir"
}

run_app_build() {
    local pkg=$1
    local name=$2
    if [ "$BUILD_MODE" = "strict" ]; then
        log "构建 ${name} (严格模式: vue-tsc && vite build)"
        pnpm --filter "$pkg" build
    else
        log "构建 ${name} (宽松模式: 仅 vite build，跳过 vue-tsc 类型检查)"
        pnpm --filter "$pkg" exec vite build
    fi
}

# ===== 检查运行权限 =====
if [ "$(id -u)" -ne 0 ]; then
    die "请以 root 身份运行（aaPanel 计划任务/SSH）"
fi

log "==== 开始部署 xboard-frontend ===="

# ===== 1. 安装 Node.js =====
ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64) NODE_ARCH="linux-x64" ;;
    aarch64|arm64) NODE_ARCH="linux-arm64" ;;
    *) die "暂不支持架构: $ARCH" ;;
esac

NODE_TARBALL="node-v${NODE_VERSION}-${NODE_ARCH}.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"
NODE_INSTALL_DIR="/usr/local/lib/nodejs"
NODE_PREFIX="$NODE_INSTALL_DIR/node-v${NODE_VERSION}-${NODE_ARCH}"

install_node() {
    log "安装 Node.js v${NODE_VERSION} (${NODE_ARCH})"
    mkdir -p "$NODE_INSTALL_DIR"
    TMP_TARBALL="/tmp/${NODE_TARBALL}"
    if [ ! -f "$TMP_TARBALL" ] || [ "$KEEP_NODE_ARCHIVE" = false ]; then
        curl -fsSL "$NODE_URL" -o "$TMP_TARBALL" || die "下载 Node 失败"
    fi
    tar -xJf "$TMP_TARBALL" -C "$NODE_INSTALL_DIR" || die "解压 Node 失败"
    ln -sf "$NODE_PREFIX/bin/node" /usr/local/bin/node
    ln -sf "$NODE_PREFIX/bin/npm" /usr/local/bin/npm
    ln -sf "$NODE_PREFIX/bin/corepack" /usr/local/bin/corepack
    ln -sf "$NODE_PREFIX/bin/npx" /usr/local/bin/npx
}

if command -v node >/dev/null 2>&1; then
    CURRENT_NODE=$(node -v | sed 's/v//')
    if [ "$CURRENT_NODE" != "$NODE_VERSION" ]; then
        log "检测到 Node v$CURRENT_NODE，准备替换为 v$NODE_VERSION"
        install_node
    else
        log "✓ Node.js v$NODE_VERSION 已安装"
    fi
else
    install_node
fi

# ===== 2. 安装 pnpm =====
require_cmd node
require_cmd corepack

log "启用 corepack 并准备 pnpm@$PNPM_VERSION"
corepack enable >/dev/null 2>&1 || true
corepack prepare "pnpm@${PNPM_VERSION}" --activate

if ! command -v pnpm >/dev/null 2>&1; then
    die "pnpm 安装失败，请检查 corepack 输出"
fi
log "✓ pnpm $(pnpm -v) 可用"

# ===== 3. 准备项目目录 =====
if [ ! -d "$PROJECT_DIR" ]; then
    die "项目目录不存在: $PROJECT_DIR"
fi

cd "$PROJECT_DIR"
log "工作目录: $PROJECT_DIR"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 && log "当前 Git 分支：$(git rev-parse --abbrev-ref HEAD)"

# ===== 4. .env 检查 =====
setup_env_file() {
    local file=$1
    local example="$file.example"
    if [ ! -f "$file" ] && [ -f "$example" ]; then
        cp "$example" "$file"
        log "已从 $(basename "$example") 复制默认配置到 $(basename "$file") (请视需要修改)"
    fi
}

setup_env_file "$PROJECT_DIR/.env"
setup_env_file "$PROJECT_DIR/packages/admin/.env"
setup_env_file "$PROJECT_DIR/packages/user/.env"

# ===== 5. 安装依赖 & 构建 =====
log "安装依赖 (pnpm install)"
pnpm install --frozen-lockfile

log "部署模式: BUILD_MODE=$BUILD_MODE, CLEAN_BUILD=$CLEAN_BUILD"

if [ "$CLEAN_BUILD" = "true" ]; then
    log "清理旧构建产物 (dist)"
    rm -rf "$PROJECT_DIR/packages/shared/dist" \
           "$PROJECT_DIR/packages/admin/dist" \
           "$PROJECT_DIR/packages/user/dist" 2>/dev/null || true
fi

if [ "$BUILD_MODE" = "strict" ]; then
    # 严格模式下生成 shared 的 .d.ts（并进行类型检查）
    log "生成 @xboard/shared 类型声明 (tsc -p packages/shared/tsconfig.json)"
    pnpm exec tsc -p "$PROJECT_DIR/packages/shared/tsconfig.json"
else
    # 宽松模式：不做 shared 的类型检查/声明生成，避免 shared 包 TS 报错阻断一键部署
    log "跳过 @xboard/shared 类型声明生成（宽松模式）"
fi

run_app_build "@xboard/admin" "Admin 应用"

run_app_build "@xboard/user" "User 应用"

# ===== 6. 部署静态文件 =====
require_cmd rsync

sync_dist() {
    local src=$1 dest=$2 name=$3
    if [ ! -d "$src" ]; then
        die "未找到构建目录: $src"
    fi
    mkdir -p "$dest"
    rsync -a --delete "$src"/ "$dest"/
    log "✓ 已同步 $name 到 $dest"
}

sync_dist "$PROJECT_DIR/packages/admin/dist" "$ADMIN_DIST_DIR" "Admin 前端"
sync_dist "$PROJECT_DIR/packages/user/dist" "$USER_DIST_DIR" "User 前端"

# ===== 7. Nginx 提示 =====
cat <<'NGINX' | tee /tmp/xboard-frontend-nginx-snippet.txt >/dev/null
# 可用于 aaPanel 网站的通用伪静态配置（Vue History 模式）
location / {
    try_files $uri $uri/ /index.html;
}
NGINX
log "已生成 Nginx 伪静态示例: /tmp/xboard-frontend-nginx-snippet.txt"

log "==== 部署完成，访问 Admin: $ADMIN_DIST_DIR / User: $USER_DIST_DIR ===="
