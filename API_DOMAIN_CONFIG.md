# API 域名配置说明

## 问题说明

如果配置了 `API_DOMAIN` 但前端接口没有使用该域名，可能是因为：

1. **配置缓存问题**：Laravel 使用了配置缓存，导致 `env()` 函数在视图中不生效
2. **配置格式问题**：URL 格式不正确

## 解决方案

### 1. 配置 `.env` 文件

在 `.env` 文件中添加：

```env
API_DOMAIN=http://xiuxiuyunapi.cc
```

**注意**：
- 如果使用相对路径，可以设置为 `/`（默认值）
- 如果使用绝对 URL，建议以 `/` 结尾，例如：`http://xiuxiuyunapi.cc/`
- 不要包含路径，只包含域名和协议

### 2. 清除配置缓存

配置修改后，必须清除配置缓存：

```bash
cd /www/wwwroot/Xboard
php artisan config:clear
php artisan cache:clear
```

### 3. 如果使用了配置缓存

如果之前运行过 `php artisan config:cache`，需要重新生成配置缓存：

```bash
php artisan config:clear
php artisan config:cache
```

### 4. 重启服务

如果使用了 Octane，需要重启 Octane：

```bash
# 如果使用 Supervisor
supervisorctl restart xboard-octane

# 或手动重启
pkill -f "octane:start"
php artisan octane:start --server=swoole --host=0.0.0.0 --port=7001
```

## 验证配置

### 方法 1：检查页面源码

1. 打开浏览器开发者工具（F12）
2. 访问管理后台或前端页面
3. 查看页面源码，找到 `<script>` 标签中的 `window.settings` 或 `window.routerBase`
4. 确认 `base_url` 或 `routerBase` 的值是否正确

### 方法 2：使用 Artisan 命令

```bash
php artisan tinker
>>> config('app.api_domain')
```

应该输出：`"http://xiuxiuyunapi.cc"`

### 方法 3：检查网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 "Network"（网络）标签
3. 刷新页面并执行一些操作（如登录、加载数据）
4. 查看 API 请求的 URL，确认是否使用了配置的域名

## 常见问题

### Q: 配置后仍然使用原域名

**A:** 请按以下步骤检查：

1. 确认 `.env` 文件中的 `API_DOMAIN` 配置正确
2. 清除配置缓存：`php artisan config:clear`
3. 清除应用缓存：`php artisan cache:clear`
4. 如果使用 Octane，重启 Octane 服务
5. 清除浏览器缓存并刷新页面

### Q: 配置了域名但请求失败（CORS 错误）

**A:** 需要在 API 域名服务器上配置 CORS 头：

```nginx
# Nginx 配置示例
location /api {
    add_header Access-Control-Allow-Origin $http_origin;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    add_header Access-Control-Allow-Credentials true;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    proxy_pass http://127.0.0.1:7001;
    # ... 其他代理配置
}
```

### Q: 如何临时禁用 API 域名分离

**A:** 在 `.env` 文件中删除或注释掉 `API_DOMAIN` 配置：

```env
# API_DOMAIN=http://xiuxiuyunapi.cc
```

然后清除缓存并重启服务。

## 已更新的文件

以下文件已更新以支持 `API_DOMAIN` 配置：

1. `config/app.php` - 添加了 `api_domain` 配置项
2. `resources/views/admin.blade.php` - 管理后台使用配置的 API 域名
3. `theme/Xboard/dashboard.blade.php` - Xboard 主题使用配置的 API 域名
4. `theme/v2board/dashboard.blade.php` - v2board 主题使用配置的 API 域名

## 技术说明

- Laravel 最佳实践：不要在视图中直接使用 `env()`，而应该通过 `config()` 函数读取配置
- 配置缓存：如果使用了 `php artisan config:cache`，`env()` 函数在视图中将不会工作
- 解决方案：在 `config/app.php` 中定义配置项，然后在视图中使用 `config('app.api_domain')`

