# XBoard 端口配置说明

## 🔌 正确的端口配置

### 后端
- **Laravel API**: `http://localhost:8000`
- 配置文件: 无需配置，使用 `php artisan serve`

### 前端

| 应用 | 端口 | URL | 配置文件 |
|------|------|-----|----------|
| **用户前端** | 5173 | http://localhost:5173 | `packages/user/vite.config.ts` |
| **管理后台** | 5174 | http://localhost:5174 | `packages/admin/vite.config.ts` |

## ✅ 已修复的端口配置

### 修复前（错误）
- 用户前端: 5174 ❌
- 管理后台: 5174 ❌
- **问题**: 两个应用使用相同端口，会冲突

### 修复后（正确）
- 用户前端: 5173 ✅
- 管理后台: 5174 ✅
- **结果**: 两个应用可以同时运行

## 🚀 启动命令

### 分别启动（推荐用于开发）

```bash
# 终端 1: 用户前端
cd xboard-frontend
pnpm dev:user
# 运行在 http://localhost:5173

# 终端 2: 管理后台
cd xboard-frontend
pnpm dev:admin
# 运行在 http://localhost:5174
```

### 一键启动（推荐用于测试）

```bash
./start-all.sh
# 自动启动所有服务
```

## 📋 访问地址总结

### 开发环境

| 服务 | URL | 用途 |
|------|-----|------|
| 后端 API | http://localhost:8000 | API 接口 |
| 用户前端 | http://localhost:5173 | 用户注册、登录、购买套餐 |
| 管理后台 | http://localhost:5174 | 管理员管理系统 |

### API 端点示例

**用户 API**:
```
http://localhost:8000/api/v1/user/info
http://localhost:8000/api/v1/user/plan/fetch
http://localhost:8000/api/v1/passport/auth/login
```

**管理员 API**:
```
http://localhost:8000/api/v2/{secure_path}/admin/user/fetch
http://localhost:8000/api/v2/{secure_path}/admin/plan/fetch
http://localhost:8000/api/v2/{secure_path}/passport/auth/login
```

## 🔧 如何修改端口

### 修改用户前端端口

编辑 `xboard-frontend/packages/user/vite.config.ts`:

```typescript
server: {
  port: 5173,  // 修改这里
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

### 修改管理后台端口

编辑 `xboard-frontend/packages/admin/vite.config.ts`:

```typescript
server: {
  port: 5174,  // 修改这里
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

### 修改后端端口

```bash
# 方法 1: 命令行参数
php artisan serve --port=8080

# 方法 2: 修改启动脚本
# 编辑 start-dev-auto.sh 或 start-all.sh
```

## ⚠️ 端口冲突问题

### 症状
- 启动时报错: `Port 5173 is already in use`
- 或者: `EADDRINUSE: address already in use`

### 解决方法

#### 方法 1: 停止占用端口的进程

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9
lsof -ti:5174 | xargs kill -9

# 或者使用 stop-all.sh
./stop-all.sh
```

#### 方法 2: 修改端口

如上所述，修改 `vite.config.ts` 中的端口号。

## 🔍 检查端口占用

### macOS/Linux

```bash
# 检查端口是否被占用
lsof -i :5173
lsof -i :5174
lsof -i :8000

# 查看所有监听的端口
netstat -an | grep LISTEN
```

### 查看进程

```bash
# 查看 Node 进程
ps aux | grep node

# 查看 PHP 进程
ps aux | grep php
```

## 📝 配置文件位置

```
xboard-frontend/
├── packages/
│   ├── user/
│   │   └── vite.config.ts      # 用户前端配置 (端口 5173)
│   └── admin/
│       └── vite.config.ts      # 管理后台配置 (端口 5174)
```

## 🎯 验证配置

### 1. 检查配置文件

```bash
# 用户前端
grep "port:" xboard-frontend/packages/user/vite.config.ts

# 管理后台
grep "port:" xboard-frontend/packages/admin/vite.config.ts
```

应该输出：
```
packages/user/vite.config.ts:    port: 5173,
packages/admin/vite.config.ts:    port: 5174,
```

### 2. 启动并验证

```bash
# 启动服务
./start-all.sh

# 检查端口
curl http://localhost:5173  # 应该返回用户前端 HTML
curl http://localhost:5174  # 应该返回管理后台 HTML
curl http://localhost:8000/api/v1/guest/comm/config  # 应该返回 JSON
```

## 🐛 常见问题

### Q1: 为什么我访问 5174 看到的是用户前端？

**A**: 端口配置错误。检查并修正 `vite.config.ts` 文件。

### Q2: 两个前端可以使用相同端口吗？

**A**: 不可以。必须使用不同的端口，否则会冲突。

### Q3: 我可以修改默认端口吗？

**A**: 可以，但需要同时修改：
1. `vite.config.ts` 中的端口
2. 所有文档中的端口引用
3. 告知团队成员新的端口

### Q4: 生产环境需要这些端口吗？

**A**: 不需要。生产环境通常：
- 前端构建为静态文件，通过 Nginx 提供
- 后端通过 PHP-FPM + Nginx 运行
- 使用标准的 80/443 端口

## 📚 相关文档

- `START_HERE.md` - 快速开始指南
- `ADMIN_LOGIN_FIX.md` - 管理后台登录修复
- `FIXED_SETUP_GUIDE.md` - 完整设置指南

---

**最后更新**: 2026-01-20  
**状态**: ✅ 端口配置已修正

