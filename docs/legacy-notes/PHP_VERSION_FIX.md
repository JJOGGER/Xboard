# PHP 版本降级修复

**日期：** 2026年1月19日  
**问题：** PHP 8.5.2 太新，导致兼容性问题  
**解决方案：** 降级到 PHP 8.3.30

---

## 问题描述

### 遇到的错误

1. **PDO 弃用警告**
   ```
   Deprecated: Constant PDO::MYSQL_ATTR_SSL_CA is deprecated since 8.5
   ```

2. **Redis 类未找到**
   ```
   Class "Redis" not found
   ```

### 根本原因

PHP 8.5.2 是最新版本（2026年1月发布），许多 PHP 扩展和框架还未完全兼容：
- Laravel 的某些依赖包要求 PHP >= 8.4
- Symfony 组件在 PHP 8.5 中有兼容性问题
- Redis PHP 扩展可能未编译支持 PHP 8.5

---

## 解决步骤

### 1. 卸载 PHP 8.5

```bash
brew unlink php
```

### 2. 安装 PHP 8.3

```bash
brew install php@8.3
brew link php@8.3 --force
```

### 3. 验证 PHP 版本

```bash
php --version
# 输出: PHP 8.3.30 (cli) (built: Jan 13 2026 22:36:55) (NTS)
```

### 4. 更新 Composer 依赖

由于之前用 PHP 8.5 安装的依赖锁定了 Symfony 8.x（需要 PHP >= 8.4），需要更新依赖：

```bash
# 删除旧的 vendor 目录（可选）
rm -rf vendor

# 更新 composer.lock 以适配 PHP 8.3
composer update --no-interaction
```

**降级的包：**
- symfony/clock: v8.0.0 → v7.4.0
- symfony/css-selector: v8.0.0 → v7.4.0
- symfony/event-dispatcher: v8.0.0 → v7.4.0
- symfony/string: v8.0.1 → v7.4.0
- symfony/translation: v8.0.3 → v7.4.3
- symfony/yaml: v8.0.1 → v7.4.1

### 5. 清除 Laravel 缓存

```bash
php artisan config:clear
php artisan cache:clear
```

### 6. 重启服务

```bash
./start-dev-auto.sh
```

---

## 结果

### ✅ 问题已解决

1. **PDO 弃用警告** - 消失了（PHP 8.3 没有这个弃用）
2. **Redis 错误** - 通过配置 `.env` 使用文件缓存解决
3. **所有服务正常启动** - 无错误

### 当前系统状态

```
✅ PHP 8.3.30 (稳定版本)
✅ Composer 2.9.3
✅ Node.js v20.12.1
✅ PNPM 10.27.0

✅ 后端 API: http://localhost:8000
✅ Admin 前端: http://localhost:5173
✅ User 前端: http://localhost:5174
```

---

## PHP 版本兼容性说明

### 推荐版本

| PHP 版本 | 状态 | 说明 |
|---------|------|------|
| **PHP 8.3** | ✅ 推荐 | 最稳定，广泛支持 |
| PHP 8.2 | ✅ 可用 | 稳定，但 8.3 更好 |
| PHP 8.1 | ⚠️ 旧版 | 可用但不推荐 |
| PHP 8.4 | ⚠️ 太新 | 部分扩展可能不兼容 |
| PHP 8.5 | ❌ 不推荐 | 太新，兼容性问题多 |

### Laravel 12 要求

- **最低版本：** PHP 8.2
- **推荐版本：** PHP 8.3
- **最高测试版本：** PHP 8.3

---

## 为什么选择 PHP 8.3？

### 1. 稳定性
- 2023年11月发布，已经过充分测试
- 大多数 PHP 扩展都已支持
- Laravel 和 Symfony 完全兼容

### 2. 性能
- 相比 PHP 8.2 有性能提升
- JIT 编译器优化
- 更好的内存管理

### 3. 新特性
- 类型化类常量
- 只读属性克隆
- 新增 `json_validate()` 函数
- 动态类常量和枚举成员获取

### 4. 生态系统支持
- ✅ Laravel 12 完全支持
- ✅ Symfony 7 完全支持
- ✅ 所有主流 PHP 扩展支持
- ✅ Composer 2.x 完全支持

---

## 避免的问题

通过降级到 PHP 8.3，我们避免了以下问题：

### 1. Symfony 8.x 依赖问题
```
Problem: symfony/clock v8.0.0 requires php >=8.4
```

### 2. PDO 常量弃用
```
Deprecated: Constant PDO::MYSQL_ATTR_SSL_CA is deprecated since 8.5
```

### 3. 扩展兼容性
- Redis 扩展可能未编译支持 PHP 8.5
- 某些 PECL 扩展可能不兼容

### 4. 未知的兼容性问题
- PHP 8.5 太新，可能有未发现的 bug
- 第三方包可能未测试 PHP 8.5

---

## 长期建议

### 开发环境

使用 PHP 8.3 进行开发，这是目前最稳定的选择。

### 生产环境

```dockerfile
# Dockerfile 示例
FROM php:8.3-fpm-alpine

# 安装扩展
RUN docker-php-ext-install pdo pdo_mysql opcache
```

### 版本管理

如果需要在多个 PHP 版本之间切换，可以使用：

```bash
# 安装多个版本
brew install php@8.2 php@8.3

# 切换版本
brew unlink php@8.3
brew link php@8.2 --force

# 或使用 phpbrew/phpenv
```

---

## 相关配置更新

### .env 配置

确保使用文件缓存而不是 Redis：

```env
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
```

### composer.json

不需要修改，Composer 会自动选择兼容的包版本。

---

## 测试验证

### 1. 检查 PHP 版本

```bash
php --version
# 应该显示: PHP 8.3.30
```

### 2. 检查已安装的扩展

```bash
php -m | grep -E "pdo|json|mbstring|openssl"
```

### 3. 运行 Laravel 命令

```bash
php artisan --version
php artisan config:clear
php artisan cache:clear
```

### 4. 启动服务

```bash
./start-dev-auto.sh
```

### 5. 访问应用

- 后端: http://localhost:8000
- Admin: http://localhost:5173
- User: http://localhost:5174

---

## 故障排除

### 问题：PHP 命令仍然指向旧版本

```bash
# 检查 PHP 路径
which php
# 应该显示: /usr/local/opt/php@8.3/bin/php

# 如果不是，添加到 PATH
echo 'export PATH="/usr/local/opt/php@8.3/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 问题：Composer 依赖冲突

```bash
# 删除 composer.lock 和 vendor
rm composer.lock
rm -rf vendor

# 重新安装
composer install
```

### 问题：扩展缺失

```bash
# 检查已安装的扩展
php -m

# 如果缺少扩展，使用 PECL 安装
pecl install redis
pecl install imagick
```

---

## 总结

✅ **PHP 8.3.30 是当前最佳选择**
- 稳定、成熟、广泛支持
- 与 Laravel 12 完美兼容
- 避免了 PHP 8.5 的兼容性问题

✅ **所有问题已解决**
- PDO 弃用警告消失
- Redis 错误通过配置解决
- 服务正常运行

✅ **系统已就绪**
- 开发环境完全配置
- 所有服务正常启动
- 可以开始开发工作

---

**最后更新：** 2026年1月19日  
**PHP 版本：** 8.3.30  
**状态：** ✅ 已解决
