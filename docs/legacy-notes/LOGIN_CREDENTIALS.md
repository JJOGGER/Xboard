# 登录凭据信息

## 问题原因

数据库中没有任何用户账号，所以无法登录。

## 解决方案

已成功创建管理员账号！

## 登录信息

### 管理员账号
- **邮箱**: `980328722@qq.com`
- **密码**: 你刚才输入的密码
- **角色**: 管理员 (Administrator)
- **用户ID**: 2

### 登录地址

**管理后台**:
- 开发环境: http://localhost:7001
- 生产环境: http://your-domain.com/admin

**用户前台**:
- 开发环境: http://localhost:7002
- 生产环境: http://your-domain.com

## 数据库信息

当前使用的是 **SQLite** 数据库：
- **开发数据库**: `database/database.sqlite` (持久化，不会被测试影响)
- **测试数据库**: `database/testing.sqlite` (仅用于测试，每次测试后重置)
- 连接类型: SQLite (不是 MySQL)

### ⚠️ 重要：数据库持久化问题已修复

之前存在一个问题：运行测试时会清空开发数据库，导致管理员账号丢失。

**现在已修复**：
- ✅ 开发数据库和测试数据库已分离
- ✅ 运行测试不会影响开发数据
- ✅ 管理员账号会持久保存

详细信息请查看: `DATABASE_PERSISTENCE_FIX.md`

### 如果想切换到 MySQL

如果你想使用 MySQL 而不是 SQLite，需要修改 `.env` 文件：

```env
# 将这些行：
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# 改为：
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=xboard
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

然后重新运行迁移：
```bash
php artisan migrate:fresh
php artisan user:create-admin
```

## 启动系统

### 方式一：使用自动启动脚本（推荐）
```bash
./start-dev-auto.sh
```

### 方式二：手动启动
```bash
# 1. 启动后端
php artisan octane:start --host=0.0.0.0 --port=8000

# 2. 启动前端（新终端）
cd xboard-frontend
pnpm dev
```

## 重要提示

⚠️ **首次登录后请立即修改密码！**

可以通过以下方式修改密码：
1. 登录管理后台
2. 进入"系统设置" → "个人资料"
3. 修改密码

## 如果忘记密码

可以使用命令重置密码：

```bash
php artisan tinker
```

然后执行：
```php
$user = App\Models\User::where('email', '980328722@qq.com')->first();
$user->password = bcrypt('your_new_password');
$user->save();
exit
```

或者重新创建管理员账号：
```bash
php artisan user:create-admin
```

## 验证登录

登录后你应该能看到：
- ✅ 管理后台仪表板
- ✅ 用户管理
- ✅ 套餐管理
- ✅ 订单管理
- ✅ 服务器管理
- ✅ 系统配置
- ✅ 共享订阅管理（新功能）

## 常见问题

### Q: 为什么之前能登录，现在不能了？
A: 可能是数据库文件被重置或删除了。SQLite 数据库存储在 `database/database.sqlite` 文件中，如果这个文件被删除，所有数据都会丢失。

### Q: 如何备份 SQLite 数据库？
A: 直接复制 `database/database.sqlite` 文件即可：
```bash
cp database/database.sqlite database/database.sqlite.backup
```

### Q: 如何恢复备份？
A: 将备份文件复制回来：
```bash
cp database/database.sqlite.backup database/database.sqlite
```

### Q: 推荐使用 SQLite 还是 MySQL？
A: 
- **SQLite**: 适合开发和小规模部署，无需额外配置
- **MySQL**: 适合生产环境和大规模部署，性能更好

## 技术支持

如果还有问题，请检查：
1. 后端日志: `storage/logs/laravel.log`
2. 前端控制台: 浏览器开发者工具
3. 数据库连接: 确保 `.env` 配置正确
