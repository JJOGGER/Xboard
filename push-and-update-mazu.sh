#!/bin/bash
# 同步当前仓库到 mazu 分支：提交本地更改、推送到远端、再拉取最新代码

set -euo pipefail

TARGET_BRANCH="mazu"
DEFAULT_COMMIT_MSG="chore: sync local changes to ${TARGET_BRANCH} $(date +%Y-%m-%d_%H-%M-%S)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -d .git ]; then
    echo -e "${RED}✗ 当前目录不是 Git 仓库，请在 Xboard 根目录执行该脚本${NC}"
    exit 1
fi

if [ ! -f artisan ]; then
    echo -e "${YELLOW}⚠ 未检测到 artisan，确保你位于 Xboard 根目录（包含 artisan 文件）${NC}"
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}当前分支: ${CURRENT_BRANCH}${NC}"

if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
    echo -e "${BLUE}切换到 ${TARGET_BRANCH} 分支...${NC}"
    if git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
        git checkout "$TARGET_BRANCH"
    elif git show-ref --verify --quiet "refs/remotes/origin/${TARGET_BRANCH}"; then
        git checkout -b "$TARGET_BRANCH" "origin/${TARGET_BRANCH}"
    else
        echo -e "${YELLOW}⚠ 远端不存在 ${TARGET_BRANCH} 分支，将在本地创建${NC}"
        git checkout -b "$TARGET_BRANCH"
    fi
fi

echo -e "${BLUE}拉取最新的 ${TARGET_BRANCH} 分支引用...${NC}"
git fetch origin "$TARGET_BRANCH" || git fetch origin

STATUS_OUTPUT=$(git status --short)
if [ -z "$STATUS_OUTPUT" ]; then
    echo -e "${GREEN}✓ 没有需要提交的本地更改${NC}"
else
    echo -e "${YELLOW}检测到以下本地更改，将提交并推送到 ${TARGET_BRANCH}:${NC}"
    echo "$STATUS_OUTPUT"
    read -p "输入提交信息 (默认: '${DEFAULT_COMMIT_MSG}'): " COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-$DEFAULT_COMMIT_MSG}
    git add -A
    git commit -m "$COMMIT_MSG"
fi

echo -e "${BLUE}推送到 origin/${TARGET_BRANCH}...${NC}"
git push origin "$TARGET_BRANCH"

echo -e "${BLUE}从 origin/${TARGET_BRANCH} 拉取最新代码并 rebase...${NC}"
git pull --rebase origin "$TARGET_BRANCH"

echo -e "${GREEN}✓ 本地与 origin/${TARGET_BRANCH} 同步完成${NC}"
