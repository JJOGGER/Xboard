# aaPanel 环境 Xboard 更新指南

> 在 aaPanel 上更新 Xboard 项目的完整步骤

---

## 📋 更新前准备

### 1. 备份重要数据

**必须备份：**
- ✅ 数据库（MySQL/SQLite）
- ✅ `.env` 配置文件
- ✅ 自定义插件和主题

**备份方法：**

```bash
# 进入项目目录
cd /www/wwwroot/your-domain

# 备份数据库（在 aaPanel 中操作或使用命令行）
# aaPanel > Database > 选择数据库 > Backup

# 备份 .env 文件
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. 检查当前状态

```bash
# 进入项目目录
cd /www/wwwroot/your-domain

# 查看当前 Git 状态
git status

# 查看当前版本
git log --oneline -1
```

---

## 🚀 方法一：使用快速更新脚本（推荐）

### 步骤

```bash
# 1. 进入项目目录
cd /www/wwwroot/your-domain

# 2. 确保脚本有执行权限
chmod +x quick-update-xboard.sh

# 3. 执行更新脚本
./quick-update-xboard.sh
```

### 脚本会自动执行：

1. ✅ 检查 Git 状态
2. ✅ 处理本地更改（暂存或放弃）
3. ✅ 拉取最新代码
4. ✅ 更新 Composer 依赖
5. ✅ 运行数据库迁移
6. ✅ 清理缓存
7. ✅ 设置文件权限
8. ✅ 提示重启服务

---

## 🔧 方法二：手动更新步骤

### 步骤 1：进入项目目录

```bash
cd /www/wwwroot/your-domain
```

### 步骤 2：处理本地更改

```bash
# 检查是否有未提交的更改
git status

# 如果有本地更改，选择处理方式：

# 方式 A：暂存本地更改（推荐）
git stash

# 方式 B：放弃本地更改（谨慎！）
git reset --hard HEAD
```

### 步骤 3：拉取最新代码

```bash
# 配置 Git 安全目录（如果需要）
git config --global --add safe.directory $(pwd)

# 拉取最新代码
git fetch --all
git reset --hard origin/master
git pull origin master
```

### 步骤 4：更新依赖

```bash
# 更新 Composer 依赖
php composer.phar update --no-dev --optimize-autoloader

# 或者如果没有 composer.phar，使用系统 composer
composer update --no-dev --optimize-autoloader
```

### 步骤 5：运行数据库迁移

```bash
# 运行 Xboard 更新命令
php artisan xboard:update

# 或者运行 Laravel 迁移
php artisan migrate --force
```

### 步骤 6：清理缓存

```bash
# 清理所有缓存
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 重新生成配置缓存（可选，提升性能）
php artisan config:cache
php artisan route:cache
```

### 步骤 7：设置文件权限

```bash
# 设置正确的文件权限（aaPanel 环境）
chown -R www:www $(pwd)
chmod -R 755 storage bootstrap/cache
```

---

## 🔄 方法三：使用简单更新脚本

如果项目中有 `update.sh` 脚本：

```bash
cd /www/wwwroot/your-domain
chmod +x update.sh
./update.sh
```

这个脚本会执行：
- Git 拉取代码
- 更新 Composer 依赖
- 运行 `php artisan xboard:update`
- 设置文件权限

---

## ⚙️ 更新后必须重启的服务

### 1. 重启 Octane（如果启用了）

**方法 A：通过 aaPanel 界面**
1. 登录 aaPanel
2. 进入：`App Store > Tools > Supervisor`
3. 找到 `Octane` 进程
4. 点击 `Restart` 重启

**方法 B：通过命令行**
```bash
# 查找 Octane 进程
ps aux | grep octane

# 重启 Supervisor 中的 Octane
supervisorctl restart octane
```

### 2. 重启 Horizon（队列服务）

**方法 A：通过 aaPanel 界面**
1. 进入：`App Store > Tools > Supervisor`
2. 找到 `Xboard` 或 `Horizon` 进程
3. 点击 `Restart` 重启

**方法 B：通过命令行**
```bash
supervisorctl restart xboard
# 或
supervisorctl restart horizon
```

### 3. 重启 Nginx（通常不需要，但如果有配置更改）

```bash
# 在 aaPanel 中重启
# 或使用命令行
nginx -s reload
```

---

## ✅ 更新后验证

### 1. 检查服务状态

```bash
# 检查 Octane 是否运行
ps aux | grep octane

# 检查 Horizon 是否运行
ps aux | grep horizon

# 检查队列任务
php artisan horizon:status
```

### 2. 检查网站是否正常

- 访问网站首页，确认正常加载
- 访问管理后台，确认可以登录
- 测试关键功能（创建订单、支付等）

### 3. 查看日志

```bash
# 查看 Laravel 日志
tail -f storage/logs/laravel.log

# 查看 Horizon 日志
tail -f storage/logs/horizon.log

# 查看 Nginx 错误日志
tail -f /www/wwwlogs/your-domain-error.log
```

---

## 🐛 常见问题处理

### 问题 1：更新后出现 500 错误

**解决方法：**
```bash
# 1. 清理缓存
php artisan cache:clear
php artisan config:clear

# 2. 检查 .env 配置
cat .env | grep -E "APP_KEY|DB_|REDIS_"

# 3. 检查文件权限
chown -R www:www storage bootstrap/cache
chmod -R 755 storage bootstrap/cache

# 4. 重启 Octane
supervisorctl restart octane
```

### 问题 2：数据库迁移失败

**解决方法：**
```bash
# 1. 检查数据库连接
php artisan tinker
>>> DB::connection()->getPdo();

# 2. 查看具体错误
php artisan migrate --force -vvv

# 3. 如果迁移失败，检查数据库备份
```

### 问题 3：插件无法加载

**解决方法：**
```bash
# 1. 清理插件缓存
php artisan plugin:clear

# 2. 重新初始化插件
php artisan plugin:init

# 3. 检查插件目录权限
chown -R www:www plugins/
```

### 问题 4：队列任务不执行

**解决方法：**
```bash
# 1. 检查 Horizon 是否运行
supervisorctl status

# 2. 重启 Horizon
supervisorctl restart xboard

# 3. 检查队列配置
php artisan horizon:status
```

---

## 📝 更新检查清单

更新完成后，请确认：

- [ ] 代码已成功拉取（`git log` 显示最新提交）
- [ ] Composer 依赖已更新（无错误信息）
- [ ] 数据库迁移成功（`php artisan migrate:status`）
- [ ] 缓存已清理
- [ ] 文件权限正确（`ls -la storage/`）
- [ ] Octane 已重启（如果启用）
- [ ] Horizon 已重启
- [ ] 网站可以正常访问
- [ ] 管理后台可以正常登录
- [ ] 关键功能测试通过

---

## 🔐 安全建议

1. **定期备份**：更新前务必备份数据库和配置文件
2. **测试环境**：建议先在测试环境更新，确认无误后再更新生产环境
3. **查看更新日志**：更新前查看 GitHub 的更新说明，了解变更内容
4. **监控日志**：更新后密切关注日志，及时发现问题

---

## 📞 获取帮助

如果更新过程中遇到问题：

1. 查看日志文件：`storage/logs/laravel.log`
2. 检查 GitHub Issues：https://github.com/cedar2025/Xboard/issues
3. 查看文档：`docs/zh-CN/` 目录下的相关文档

---

**更新完成后，记得重启 Octane 和 Horizon 服务！**
