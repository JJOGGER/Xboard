# API 域名迁移指南

当 API 域名（`API_DOMAIN`）被墙后，需要迁移到新域名的完整指南。

## 快速迁移（推荐）

使用自动化脚本：

```bash
chmod +x migrate-api-domain.sh
./migrate-api-domain.sh
```

脚本会自动完成：
1. 备份当前配置
2. 更新 `.env` 文件
3. 配置 Nginx
4. 清除缓存
5. 重启服务
6. 验证配置

## 手动迁移步骤

### 步骤 1: 准备新域名

1. **购买/准备新域名**
   - 建议使用与旧域名不同的后缀（如 `.com` 替换 `.xyz`）
   - 避免明显的 VPN 相关词汇

2. **DNS 解析配置**
   - 将新域名 A 记录指向当前服务器 IP
   - 等待 DNS 生效（通常几分钟到几小时）

3. **验证 DNS 解析**
   ```bash
   dig @8.8.8.8 新域名
   nslookup 新域名
   ```

### 步骤 2: 在同一服务器上创建新站点

如果新域名指向同一服务器：

#### 2.1 使用宝塔面板

1. 登录宝塔面板
2. 进入"网站" → "添加站点"
3. 填写新域名（例如: `mazuvpn.com`）
4. 选择"不创建数据库"（API 域名不需要数据库）
5. 点击"提交"

#### 2.2 配置 Nginx

编辑新站点的 Nginx 配置文件（通常在 `/www/server/panel/vhost/nginx/新域名.conf`）：

```nginx
server
{
    listen 80;
    server_name 新域名;
    
    # SSL 配置（如果已申请证书）
    # listen 443 ssl http2;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # 禁止访问敏感文件
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md)
    {
        return 404;
    }

    # SSL 证书验证目录
    location ~ \.well-known{
        allow all;
    }

    # API 路径配置
    location ~ ^/api/ {
        # CORS 配置
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With, Accept, Origin" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age "3600" always;
        
        # 处理 OPTIONS 预检请求
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin $http_origin always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With, Accept, Origin" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Access-Control-Max-Age "3600" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        # 代理到 Octane
        proxy_pass http://127.0.0.1:7001;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_cache off;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 其他请求返回 404
    location / {
        return 404;
    }

    # 日志配置
    access_log  /www/wwwlogs/新域名.log;
    error_log  /www/wwwlogs/新域名.error.log;
}
```

#### 2.3 测试并重载 Nginx

```bash
nginx -t
nginx -s reload
```

### 步骤 3: 更新 Xboard 配置

#### 3.1 备份当前配置

```bash
cd /www/wwwroot/Xboard
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

#### 3.2 更新 .env 文件

编辑 `.env` 文件，更新 `API_DOMAIN`：

```env
# 旧配置
# API_DOMAIN=https://mazuvpn.xyz

# 新配置
API_DOMAIN=https://mazuvpn.com
```

**注意**：
- 如果使用 HTTPS，确保包含 `https://`
- 不要包含尾部斜杠 `/`
- 不要包含路径，只包含域名和协议

#### 3.3 清除缓存

```bash
cd /www/wwwroot/Xboard
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

#### 3.4 重启服务

**重启 Octane**（如果使用 Supervisor）：
```bash
supervisorctl restart xboard-octane
```

**或手动重启**：
```bash
pkill -f "octane:start"
php artisan octane:start --server=swoole --host=0.0.0.0 --port=7001 &
```

**重启 Horizon**（如果使用）：
```bash
supervisorctl restart xboard-horizon
```

### 步骤 4: 更新节点服务器配置

这是**最关键**的步骤！所有节点服务器都需要更新 API 地址。

#### 4.1 在 Xboard 管理面板中更新

1. 登录 Xboard 管理后台
2. 进入"节点管理"
3. 编辑每个节点
4. 更新"API 地址"字段为新域名（例如: `mazuvpn.com`）
5. 保存

#### 4.2 在节点服务器上手动更新

如果节点服务器使用 V2bX：

1. 登录节点服务器
2. 编辑 V2bX 配置文件（通常在 `/etc/v2bx/config.yaml` 或 `/usr/local/v2bx/config.yaml`）
3. 找到 `ApiHost` 配置项
4. 更新为新的 API 域名：

```yaml
# 旧配置
ApiHost: https://mazuvpn.xyz

# 新配置
ApiHost: https://mazuvpn.com
```

5. 重启 V2bX 服务：
```bash
systemctl restart v2bx
# 或
supervisorctl restart v2bx
```

#### 4.3 验证节点连接

检查节点服务器日志，确认能正常连接到新的 API 地址：

```bash
# V2bX 日志
tail -f /var/log/v2bx/v2bx.log

# 应该看到类似：
# Get node info success
# Get user list success
```

### 步骤 5: 申请 SSL 证书（如果使用 HTTPS）

如果新域名需要使用 HTTPS：

```bash
# 使用 certbot 申请 Let's Encrypt 证书
certbot certonly --nginx -d 新域名

# 或使用宝塔面板申请
# 网站 → SSL → Let's Encrypt → 申请
```

申请证书后，更新 Nginx 配置启用 HTTPS（参考步骤 2.2）。

### 步骤 6: 验证迁移

#### 6.1 测试 API 端点

```bash
# 测试新域名 API
curl -I https://新域名/api/v2/user/info

# 应该返回 200 或 401（401 表示 API 正常，只是需要认证）
```

#### 6.2 检查配置

```bash
cd /www/wwwroot/Xboard
php artisan tinker
>>> config('app.api_domain')
# 应该输出新域名
```

#### 6.3 测试前端

1. 清除浏览器缓存
2. 访问前端页面
3. 打开浏览器开发者工具（F12）
4. 查看 Network 标签，确认 API 请求使用新域名

#### 6.4 检查节点连接

1. 查看节点服务器日志，确认连接正常
2. 在 Xboard 管理面板检查节点状态
3. 测试用户订阅链接是否正常

## 常见问题

### Q1: 新域名是否需要创建新的站点？

**A:** 取决于新域名是否指向同一服务器：
- **同一服务器**：需要创建新站点，配置 Nginx
- **不同服务器**：需要在新服务器上配置反向代理，或直接部署 Xboard

### Q2: 是否需要重新部署整个应用？

**A:** 不需要。只需要：
1. 更新 `.env` 中的 `API_DOMAIN`
2. 清除缓存
3. 重启服务
4. 更新节点服务器配置

### Q3: 旧域名站点可以删除吗？

**A:** 建议保留一段时间（如 1-2 周），确保：
- 所有节点服务器已更新
- 没有遗漏的配置
- 可以随时回滚

### Q4: 节点服务器更新后多久生效？

**A:** 通常立即生效。如果使用 V2bX：
- 配置文件更新后需要重启服务
- 或者等待 V2bX 自动重载配置（通常 1-5 分钟）

### Q5: 迁移过程中服务会中断吗？

**A:** 会有短暂中断（通常几秒到几分钟）：
- 更新 `.env` 和清除缓存：几秒
- 重启 Octane：几秒
- 更新节点配置：取决于节点数量

建议在低峰期进行迁移。

### Q6: 如何回滚？

**A:** 如果迁移出现问题：

1. 恢复 `.env` 备份：
   ```bash
   cp .env.backup.时间戳 .env
   ```

2. 清除缓存并重启：
   ```bash
   php artisan config:clear
   php artisan cache:clear
   supervisorctl restart xboard-octane
   ```

3. 恢复节点服务器配置

## 最佳实践

1. **提前准备**
   - 提前购买/准备新域名
   - 提前配置 DNS 解析
   - 在测试环境验证流程

2. **备份**
   - 备份 `.env` 文件
   - 备份 Nginx 配置
   - 记录当前节点配置

3. **分步执行**
   - 先配置新域名站点
   - 再更新 Xboard 配置
   - 最后更新节点配置

4. **验证**
   - 每步完成后立即验证
   - 确认无误后再进行下一步

5. **监控**
   - 迁移后持续监控 24-48 小时
   - 检查节点连接状态
   - 检查用户反馈

## 相关文件

- `migrate-api-domain.sh` - 自动化迁移脚本
- `API_DOMAIN_CONFIG.md` - API 域名配置说明
- `nginx-api-domain-config.conf` - Nginx 配置模板


