# 端口自动释放功能说明

## 功能概述

启动脚本现在支持**自动检测并释放被占用的端口**，无需手动停止旧进程。

## 工作原理

当运行启动脚本时，脚本会：

1. **检测端口占用**：检查 8000、5173、5174 端口是否被占用
2. **自动停止进程**：如果端口被占用，自动停止占用该端口的进程
3. **释放端口**：等待端口完全释放
4. **继续启动**：在干净的端口上启动新服务

## 使用方法

### 自动启动脚本（推荐）

```bash
./start-dev-auto.sh
```

**输出示例：**
```
[INFO] 检查并释放端口...
[WARNING] 端口 8000 已被占用 (后端)
[INFO] 正在停止占用端口 8000 的进程 (PID: 12345)...
[SUCCESS] 端口 8000 已释放
[WARNING] 端口 5173 已被占用 (Admin前端)
[INFO] 正在停止占用端口 5173 的进程 (PID: 12346)...
[SUCCESS] 端口 5173 已释放
[WARNING] 端口 5174 已被占用 (User前端)
[INFO] 正在停止占用端口 5174 的进程 (PID: 12347)...
[SUCCESS] 端口 5174 已释放
[SUCCESS] 端口检查完成
```

### 交互式启动脚本

```bash
./start-dev.sh
```

同样支持自动端口释放功能。

## 涉及的端口

| 端口 | 服务 | 说明 |
|------|------|------|
| 8000 | 后端 API | Laravel 开发服务器 |
| 5173 | Admin 前端 | 管理后台界面 |
| 5174 | User 前端 | 用户前端界面 |

## 优势

### ✅ 之前的问题

```bash
./start-dev-auto.sh
[ERROR] 后端端口 8000 已被占用，请先停止占用该端口的进程
# 需要手动执行：
pkill -f "php artisan serve"
pkill -f "vite"
# 然后再次运行脚本
```

### ✅ 现在的解决方案

```bash
./start-dev-auto.sh
# 自动检测并释放所有被占用的端口
# 无需任何手动操作
# 直接启动成功！
```

## 技术实现

### 端口检测

使用 `lsof` 命令检测端口占用：
```bash
lsof -Pi :8000 -sTCP:LISTEN -t
```

### 进程停止

使用 `kill -9` 强制停止占用端口的进程：
```bash
kill -9 $pid
```

### 等待释放

停止进程后等待 1 秒，确保端口完全释放：
```bash
sleep 1
```

## 安全性

- ✅ **只停止占用指定端口的进程**：不会影响其他进程
- ✅ **显示被停止的进程 PID**：便于追踪和调试
- ✅ **确认端口释放**：在启动新服务前确保端口可用
- ✅ **详细日志输出**：每个步骤都有清晰的状态提示

## 常见场景

### 场景 1：重复运行启动脚本

```bash
# 第一次运行
./start-dev-auto.sh
# 服务启动成功

# 忘记停止，再次运行
./start-dev-auto.sh
# ✅ 自动停止旧服务，启动新服务
```

### 场景 2：端口被其他程序占用

```bash
# 其他程序占用了 8000 端口
./start-dev-auto.sh
# ✅ 自动停止占用 8000 端口的程序
# ✅ 启动 XBoard 后端服务
```

### 场景 3：部分服务崩溃

```bash
# 后端崩溃了，但前端还在运行
./start-dev-auto.sh
# ✅ 自动停止前端服务
# ✅ 重新启动所有服务
```

## 手动端口管理（可选）

如果您想手动管理端口，可以使用以下命令：

### 查看端口占用

```bash
# 查看所有端口占用
lsof -Pi :8000 -sTCP:LISTEN
lsof -Pi :5173 -sTCP:LISTEN
lsof -Pi :5174 -sTCP:LISTEN

# 或使用 netstat
netstat -an | grep LISTEN | grep -E "8000|5173|5174"
```

### 手动停止进程

```bash
# 停止所有 XBoard 相关进程
pkill -f "php artisan serve"
pkill -f "vite"

# 或停止特定端口的进程
kill -9 $(lsof -Pi :8000 -sTCP:LISTEN -t)
kill -9 $(lsof -Pi :5173 -sTCP:LISTEN -t)
kill -9 $(lsof -Pi :5174 -sTCP:LISTEN -t)
```

## 故障排除

### 问题：端口仍然被占用

**可能原因：**
- 进程没有完全停止
- 系统延迟

**解决方法：**
```bash
# 等待几秒后重试
sleep 3
./start-dev-auto.sh
```

### 问题：权限不足

**错误信息：**
```
kill: (12345) - Operation not permitted
```

**解决方法：**
```bash
# 使用 sudo 运行（不推荐）
sudo ./start-dev-auto.sh

# 或手动停止进程
sudo kill -9 12345
```

### 问题：lsof 命令不存在

**解决方法：**
```bash
# macOS
brew install lsof

# Linux (Ubuntu/Debian)
sudo apt-get install lsof

# Linux (CentOS/RHEL)
sudo yum install lsof
```

## 更新日志

### v1.1.0 (2026-01-19)

- ✅ 添加自动端口释放功能
- ✅ 改进日志输出，显示被停止的进程 PID
- ✅ 添加端口释放确认机制
- ✅ 更新 `start-dev.sh` 和 `start-dev-auto.sh`

### v1.0.0 (2026-01-19)

- ✅ 初始版本
- ✅ 基本的端口检查功能
- ✅ 手动停止提示

## 相关文档

- [QUICK_START.md](./QUICK_START.md) - 快速启动指南
- [README_STARTUP.md](./README_STARTUP.md) - 启动脚本完整文档
- [SETUP_FIXES_SUMMARY.md](./SETUP_FIXES_SUMMARY.md) - 环境配置修复总结

---

**最后更新：** 2026年1月19日  
**功能状态：** ✅ 已实现并测试
