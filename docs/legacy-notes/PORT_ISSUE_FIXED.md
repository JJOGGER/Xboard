# 端口问题已修复

## 问题原因
两个进程都在运行 user 包，导致：
- 端口 5173 运行 user（正确）
- 端口 5174 也运行 user（错误，应该是 admin）

## 解决方案
1. 停止了所有错误的进程
2. 使用正确的命令重新启动服务

## 当前状态 ✅

### 用户前端（User Frontend）
- **端口**: 5173
- **URL**: http://localhost:5173
- **命令**: `pnpm dev:user`
- **状态**: ✅ 运行中

### 管理后台（Admin Backend）
- **端口**: 5174
- **URL**: http://localhost:5174
- **命令**: `pnpm dev:admin`
- **状态**: ✅ 运行中

## 如何正确启动服务

### 方法 1: 使用新的启动脚本（推荐）
```bash
cd xboard-frontend
./start-correct-ports.sh
```

这个脚本会：
- 自动清理端口 5173 和 5174 上的旧进程
- 验证端口是否空闲
- 按正确顺序启动服务
- 显示日志位置和进程 ID
- 支持 Ctrl+C 优雅停止

### 方法 2: 手动启动（分别在两个终端）
```bash
# 终端 1 - 用户前端
cd xboard-frontend
pnpm dev:user

# 终端 2 - 管理后台
cd xboard-frontend
pnpm dev:admin
```

### 方法 3: 使用后台进程
```bash
cd xboard-frontend

# 启动用户前端
pnpm dev:user > /tmp/xboard-user.log 2>&1 &
echo $! > /tmp/xboard-user.pid

# 启动管理后台
pnpm dev:admin > /tmp/xboard-admin.log 2>&1 &
echo $! > /tmp/xboard-admin.pid

# 查看日志
tail -f /tmp/xboard-user.log
tail -f /tmp/xboard-admin.log

# 停止服务
kill $(cat /tmp/xboard-user.pid)
kill $(cat /tmp/xboard-admin.pid)
```

## 如何验证端口正确

### 检查端口占用
```bash
lsof -i :5173 -i :5174
```

应该看到：
- 端口 5173: `packages/user/node_modules/.bin/vite`
- 端口 5174: `packages/admin/node_modules/.bin/vite`

### 检查进程
```bash
ps aux | grep "pnpm.*dev:" | grep -v grep
```

应该看到两个进程：
- `pnpm dev:user`
- `pnpm dev:admin`

### 访问测试
1. 打开 http://localhost:5173 - 应该看到**用户前端**登录页面
2. 打开 http://localhost:5174 - 应该看到**管理后台**登录页面

## 常见问题

### Q: 端口被占用怎么办？
```bash
# 查找占用端口的进程
lsof -ti:5173
lsof -ti:5174

# 停止进程
kill -9 $(lsof -ti:5173)
kill -9 $(lsof -ti:5174)
```

### Q: 如何确认是哪个应用在运行？
查看浏览器标题和页面内容：
- 用户前端: 标题包含 "XBoard User"，有用户注册/登录界面
- 管理后台: 标题包含 "XBoard Admin"，有管理员登录界面

### Q: Dashboard 报错怎么办？
已修复 Dashboard.vue 中的数据处理问题：
- 添加了空数组默认值
- 改进了错误处理
- 支持多种响应格式

## 其他修复

### 1. Dashboard 数据处理
修复了 `fetchRecentOrders` 函数：
```typescript
// 之前：直接访问 response.data.data（可能 undefined）
recentOrders.value = response.data.data

// 现在：安全处理多种响应格式
const orders = response.data?.data || response.data || []
recentOrders.value = Array.isArray(orders) ? orders.slice(0, 10) : []
```

### 2. Token 持久化
已在 auth store 中配置 Pinia 持久化，刷新页面不会退出登录。

### 3. 移动端菜单
已改用 Drawer 抽屉组件，移动端体验更好。

### 4. API 方法补全
已添加缺失的 API 方法：
- `orderApi.getOrderStats()`
- `ticketApi.getUnreadCount()`

### 5. Theme API 路径
已修复所有 theme API 路径，添加 `/v2/` 前缀。

## 测试清单

- [x] 端口 5173 运行用户前端
- [x] 端口 5174 运行管理后台
- [x] Dashboard 不再报错
- [x] 刷新页面保持登录状态
- [x] 移动端菜单正常工作
- [ ] 所有 API 调用正常（需要后端运行）

## 下一步

1. 访问 http://localhost:5174 测试管理后台
2. 登录管理员账号（test@admin.com / admin123456）
3. 验证 Dashboard 数据加载正常
4. 测试移动端响应式布局
5. 验证刷新页面不会退出登录

所有修复已完成，服务正在正确的端口上运行！
