# 新后台 API 404 错误修复说明

## 问题

你在新后台看到的所有 API 都报 404 错误：

```
❌ GET /api/v2/admin/stat/getOverride - 404 Not Found
❌ GET /api/v2/admin/stat/getOrder - 404 Not Found  
❌ GET /api/v2/admin/order/fetch - 404 Not Found
❌ GET /api/v2/admin/user/fetch - 404 Not Found
```

## 原因

后端的管理员 API 路由有一个 **secure_path** 前缀保护：

```
实际路径: /api/v2/144b73d9/admin/...
新后台调用: /api/v2/admin/...  ← 缺少 secure_path!
```

这是一个安全特性，用来隐藏管理员 API 的真实路径。

## 解决方案

我已经修复了这个问题，修改了 3 个文件：

### 1. API 客户端自动添加 secure_path

**文件**: `xboard-frontend/packages/shared/src/api/client.ts`

现在 API 客户端会自动为所有 V2 API 添加 secure_path 前缀。

### 2. 环境变量配置

**文件**: `xboard-frontend/packages/admin/.env.local` (新建)

```env
VITE_SECURE_PATH=144b73d9
```

### 3. 示例配置

**文件**: `xboard-frontend/packages/admin/.env.example`

添加了 `VITE_SECURE_PATH` 的说明。

## 如何使用

### 步骤 1: 重启新后台开发服务器

```bash
cd xboard-frontend
npm run dev:admin
```

### 步骤 2: 访问新后台

打开浏览器访问: `http://localhost:5174`

### 步骤 3: 登录

使用管理员账号登录，现在所有 API 应该都能正常工作了！

## 验证修复

打开浏览器开发者工具 (F12)，查看网络面板，你应该看到：

```
✅ GET /api/v2/144b73d9/admin/stat/getOverride - 200 OK
✅ GET /api/v2/144b73d9/admin/stat/getOrder - 200 OK
✅ GET /api/v2/144b73d9/admin/order/fetch - 200 OK
✅ GET /api/v2/144b73d9/admin/user/fetch - 200 OK
```

注意路径中现在包含了 `144b73d9`！

## 可选: 测试 API

如果你想在命令行测试 API 是否正常：

```bash
./test-admin-api.sh
```

这个脚本会测试登录和几个管理员 API。

## 重要说明

1. **旧后台不受影响**: 旧后台一直都是正确的，因为它的代码已经包含了 secure_path
2. **用户端不受影响**: 用户端使用 V1 API，不需要 secure_path
3. **登录 API 不受影响**: 登录/注册 API 不需要 secure_path
4. **只影响管理员 API**: 只有 `/api/v2/admin/*` 的 API 需要 secure_path

## 如果 secure_path 不是 144b73d9

如果你的后端使用了不同的 secure_path，需要修改：

1. 编辑 `xboard-frontend/packages/admin/.env.local`
2. 修改 `VITE_SECURE_PATH=你的secure_path`
3. 重启开发服务器

你可以在后端的 `.env` 文件中查看 secure_path：

```bash
grep SECURE_PATH .env
```

或者在数据库中查看：

```bash
php artisan tinker
>>> admin_setting('secure_path')
```

---

**修复完成**: ✅  
**需要重启**: 是，需要重启新后台开发服务器  
**影响范围**: 仅新后台管理员 API
