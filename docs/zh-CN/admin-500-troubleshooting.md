# 管理后台 500 错误排查指南

> 当管理后台出现 500 错误，但用户前端正常时的排查步骤

---

## 🔍 快速诊断

### 1. 如果没有错误日志输出

如果执行 `tail -100 storage/logs/laravel.log | grep -A 20 "ERROR\|Exception\|Fatal"` 没有输出，说明错误可能发生在：
- 路由注册阶段（在日志记录之前）
- 视图渲染阶段（异常未被捕获）
- Octane 层面（错误被 Octane 捕获但未记录）

**立即执行诊断脚本：**

```bash
cd /www/wwwroot/xboard
chmod +x post-deploy-diagnose.sh
./post-deploy-diagnose.sh
```

脚本会检查 PHP 扩展、Redis、数据库、Octane、Nginx、日志权限等所有关键环节。

### 2. 检查错误日志

```bash
# SSH 登录服务器
cd /www/wwwroot/xboard

# 查看最新错误日志
tail -100 storage/logs/laravel.log | grep -A 20 "ERROR\|Exception\|Fatal"

# 如果上面没有输出，查看完整日志
tail -50 storage/logs/laravel.log

# 检查 Octane 日志（如果使用 Octane）
tail -50 storage/logs/octane.log 2>/dev/null || echo "Octane 日志不存在"

# 检查 Nginx 错误日志
tail -50 /www/wwwlogs/xiuxiujd.cc.error.log
```

**关键信息：** 日志中会有具体的错误信息，这是解决问题的关键！

---

## 🚨 常见原因及解决方案

### 原因 1：Redis 连接失败

**症状：**
- 管理后台 500 错误
- 用户前端正常（因为前端不依赖 Redis 缓存配置）
- 日志中出现 Redis 相关错误

**检查方法：**

```bash
# 检查 Redis 是否运行
systemctl status redis

# 测试 Redis 连接
php artisan tinker
>>> Redis::connection()->ping();
```

**解决方案：**

```bash
# 1. 检查 .env 中的 Redis 配置
cat .env | grep REDIS

# 应该类似：
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
# REDIS_PASSWORD=null

# 2. 如果 Redis 未运行，启动 Redis
systemctl start redis
systemctl enable redis

# 3. 如果 Redis 配置错误，编辑 .env
nano .env
# 修改 Redis 配置后保存

# 4. 清理配置缓存
php artisan config:clear
php artisan cache:clear

# 5. 重启 Octane
supervisorctl restart octane
```

---

### 原因 2：数据库连接问题

**症状：**
- 日志中出现数据库连接错误
- `admin_setting()` 函数无法读取配置

**检查方法：**

```bash
php artisan tinker
>>> DB::connection()->getPdo();
>>> admin_setting('secure_path');
```

**解决方案：**

```bash
# 1. 检查 .env 中的数据库配置
cat .env | grep DB_

# 2. 测试数据库连接
php artisan migrate:status

# 3. 如果数据库连接失败，检查：
#    - 数据库服务是否运行
#    - 数据库用户名密码是否正确
#    - 数据库是否存在
```

---

### 原因 3：配置读取失败

**症状：**
- `admin_setting()` 函数调用时出错
- 管理后台路径无法获取

**检查方法：**

```bash
php artisan tinker
>>> try {
...     $path = admin_setting('secure_path');
...     echo "路径: " . $path;
... } catch (\Exception $e) {
...     echo "错误: " . $e->getMessage();
... }
```

**解决方案：**

```bash
# 1. 清理所有缓存
php artisan optimize:clear

# 2. 重新生成配置缓存
php artisan config:cache

# 3. 检查配置表是否存在
php artisan tinker
>>> DB::table('v2_settings')->count();

# 4. 如果表不存在或为空，运行迁移
php artisan migrate --force
```

---

### 原因 4：Octane 缓存问题

**症状：**
- 代码已更新但仍然报错
- 重启后问题消失

**解决方案：**

```bash
# 1. 停止 Octane
supervisorctl stop octane

# 2. 清理所有缓存
php artisan optimize:clear

# 3. 清理 Octane 缓存
rm -rf storage/framework/octane/*

# 4. 重启 Octane
supervisorctl start octane

# 或者通过 aaPanel：
# App Store > Tools > Supervisor > Octane > Restart
```

---

### 原因 5：权限问题

**症状：**
- 日志中出现文件读写权限错误
- 缓存无法写入

**解决方案：**

```bash
# 设置正确的文件权限（aaPanel 环境）
chown -R www:www storage bootstrap/cache
chmod -R 755 storage bootstrap/cache
```

---

### 原因 6：PHP 扩展缺失

**症状：**
- 日志中出现类未找到或函数未定义的错误

**检查方法：**

```bash
# 检查 PHP 扩展
php -m | grep -E "redis|pdo|openssl|mbstring"
```

**解决方案：**

在 aaPanel 中安装缺失的扩展：
1. 进入：`App Store > Installed > PHP 8.2 > Settings > Install Extensions`
2. 安装缺失的扩展
3. 重启 PHP-FPM 或 Octane

---

## 🔧 完整修复步骤

按照以下步骤逐一执行：

```bash
# 1. 查看错误日志（最重要！）
tail -100 storage/logs/laravel.log

# 2. 检查 Redis 连接
php artisan tinker
>>> Redis::connection()->ping();
# 应该返回 "PONG"，如果不是，修复 Redis 配置

# 3. 检查数据库连接
php artisan tinker
>>> DB::connection()->getPdo();
# 应该返回 PDO 对象，如果不是，修复数据库配置

# 4. 清理所有缓存
php artisan optimize:clear

# 5. 检查配置读取
php artisan tinker
>>> admin_setting('secure_path');
# 应该返回管理后台路径

# 6. 重启 Octane
supervisorctl restart octane

# 7. 检查 Octane 状态
supervisorctl status octane
# 应该显示 RUNNING

# 8. 测试管理后台
# 访问 http://your-domain.com/{secure_path}
```

---

## 📝 一键排查脚本

执行以下命令运行排查脚本：

```bash
cd /www/wwwroot/xboard
chmod +x check-admin-500.sh
./check-admin-500.sh
```

脚本会自动检查：
- ✅ 最新错误日志
- ✅ 管理后台路径配置
- ✅ 数据库连接
- ✅ Redis 连接
- ✅ 管理员账户
- ✅ 路由配置
- ✅ Octane 状态

---

## 🐛 详细错误日志分析

### 示例 1：Redis 连接错误

```
[2025-11-24 16:20:15] local.ERROR: Connection refused {"exception":"[object] (Predis\\Connection\\ConnectionException(code: 0): Connection refused
```

**解决方法：** 启动 Redis 或检查 Redis 配置

---

### 示例 2：数据库连接错误

```
[2025-11-24 16:20:15] local.ERROR: SQLSTATE[HY000] [2002] Connection refused
```

**解决方法：** 检查数据库配置和服务状态

---

### 示例 3：配置表不存在

```
[2025-11-24 16:20:15] local.ERROR: SQLSTATE[42S02]: Base table or view not found: 1146 Table 'xboard.v2_settings' doesn't exist
```

**解决方法：** 运行数据库迁移

```bash
php artisan migrate --force
```

---

## 💡 预防措施

1. **定期备份数据库和配置文件**
2. **监控 Redis 和数据库服务状态**
3. **更新前检查日志，确保没有错误**
4. **使用 Supervisor 管理 Octane 和 Horizon，确保自动重启**

---

## 📞 获取帮助

如果以上方法都无法解决问题：

1. **查看完整错误日志：**
   ```bash
   cat storage/logs/laravel.log | tail -200
   ```

2. **检查 Octane 日志：**
   ```bash
   tail -100 storage/logs/octane.log
   ```

3. **检查 Nginx 错误日志：**
   ```bash
   tail -100 /www/wwwlogs/xiuxiujd.cc.error.log
   ```

4. **提供以下信息寻求帮助：**
   - 错误日志的最后 50 行
   - `.env` 配置（隐藏敏感信息）
   - `php artisan about` 的输出
   - Redis 和数据库连接测试结果

---

**记住：99% 的问题都能通过查看日志文件找到原因！**
