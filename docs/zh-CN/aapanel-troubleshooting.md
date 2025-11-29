# aaPanel 环境问题排查指南

## 问题 1：fileinfo 扩展缺失

### 错误信息
```
PHP Startup: Unable to load dynamic library 'fileinfo'
```

### 解决方法

**方法 A：在 aaPanel 中安装 fileinfo 扩展（推荐）**

1. 登录 aaPanel
2. 进入：`App Store > Installed > PHP 8.2 > Settings > Install Extensions`
3. 找到 `fileinfo` 扩展，点击安装
4. 安装完成后重启 PHP-FPM

**方法 B：使用 Composer 忽略平台要求（临时方案）**

```bash
composer update --no-dev --optimize-autoloader --ignore-platform-req=ext-fileinfo
```

---

## 问题 2：PHP 模块重复加载警告

### 错误信息
```
PHP Warning: Module "pcntl" is already loaded
PHP Warning: Module "swoole" is already loaded
```

### 解决方法

编辑 PHP 配置文件，移除重复的扩展加载：

```bash
# 编辑 PHP CLI 配置
nano /www/server/php/82/etc/php-cli.ini

# 查找并注释掉重复的扩展加载行
# 例如，如果看到：
# extension=pcntl.so
# extension=swoole.so
# 确保每个扩展只加载一次
```

或者检查是否有多个配置文件加载了相同的扩展。

---

## 问题 3：Redis 连接错误

### 错误信息
```
In PhpRedisConnector.php line 181:
No such file or directory
```

### 解决方法

**检查 Redis 配置：**

```bash
# 1. 检查 Redis 是否运行
systemctl status redis

# 2. 检查 .env 文件中的 Redis 配置
cat .env | grep REDIS

# 3. 如果使用 Unix Socket，检查 socket 文件是否存在
ls -la /tmp/redis.sock
# 或
ls -la /var/run/redis/redis.sock
```

**修复 Redis 配置：**

编辑 `.env` 文件：

```bash
# 如果使用 TCP 连接（推荐）
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# 如果使用 Unix Socket，确保路径正确
# REDIS_HOST=/var/run/redis/redis.sock
# REDIS_PORT=0
```

**测试 Redis 连接：**

```bash
php artisan tinker
>>> Redis::connection()->ping();
```

---

## 问题 4：.user.ini 文件权限问题

### 错误信息
```
chown: changing ownership of './.user.ini': Operation not permitted
```

### 说明

这是正常的，`.user.ini` 是 aaPanel 保护的文件，无法更改所有者。不影响项目运行。

### 解决方法

可以忽略此错误，或者使用 `chattr` 命令：

```bash
# 移除不可变属性（如果需要）
chattr -i .user.ini
chown www:www .user.ini
chattr +i .user.ini
```

---

## 问题 5：Nginx 未运行

### 说明

如果使用 Octane，Nginx 可能不需要运行（Octane 直接处理请求）。但如果使用 PHP-FPM，需要 Nginx。

### 检查方法

```bash
# 检查是否使用 Octane
ps aux | grep octane

# 如果使用 Octane，Nginx 未运行是正常的
# 如果使用 PHP-FPM，需要启动 Nginx
```

---

## 完整修复步骤

### 1. 安装 fileinfo 扩展

```bash
# 在 aaPanel 中安装，或使用命令行
# 检查 fileinfo 是否已安装
php -m | grep fileinfo

# 如果没有，在 aaPanel 中安装
```

### 2. 修复 PHP 配置

```bash
# 编辑 PHP CLI 配置
nano /www/server/php/82/etc/php-cli.ini

# 确保扩展只加载一次，移除重复的 extension= 行
```

### 3. 修复 Redis 配置

```bash
# 编辑 .env 文件
nano .env

# 确保 Redis 配置正确
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
# REDIS_PASSWORD=null
```

### 4. 重新运行更新

```bash
# 使用忽略平台要求的方式更新
composer update --no-dev --optimize-autoloader --ignore-platform-req=ext-fileinfo

# 运行更新命令
php artisan xboard:update

# 清理缓存
php artisan optimize:clear
```

### 5. 重启服务

```bash
# 重启 Octane（如果使用）
supervisorctl restart octane

# 重启 Horizon
supervisorctl restart xboard
```

---

## 验证更新是否成功

```bash
# 1. 检查代码版本
git log --oneline -1

# 2. 检查 Laravel 版本
php artisan --version

# 3. 检查 Redis 连接
php artisan tinker
>>> Redis::connection()->ping();

# 4. 检查队列服务
php artisan horizon:status

# 5. 访问网站测试功能
```
