# 节点服务器与主服务器交互接口分析

## 一、所有交互接口列表

### UniProxy 接口（主要使用）

节点服务器通过以下接口与主服务器通信：

1. **GET /api/v1/server/UniProxy/config**
   - 用途：获取节点配置信息（端口、协议设置、路由等）
   - 频率：定期拉取（根据 `pull_interval` 配置，默认 60 秒）
   - 数据量：中等（包含协议配置、路由规则等）
   - 认证：需要 `token` + `node_id` + `node_type`

2. **GET /api/v1/server/UniProxy/user**
   - 用途：获取可用用户列表
   - 频率：定期拉取（根据 `pull_interval` 配置，默认 60 秒）
   - 数据量：**中等**（每个用户约 100-150 字节，包含：id, uuid, speed_limit, device_limit）
     - 1000 用户：约 100-150 KB
     - 10000 用户：约 1-1.5 MB
     - 100000 用户：约 10-15 MB
   - 认证：需要 `token` + `node_id` + `node_type`
   - 特点：使用 ETag 缓存，支持 304 Not Modified

3. **GET /api/v1/server/UniProxy/alivelist**
   - 用途：获取在线用户列表（用于设备限制）
   - 频率：定期拉取
   - 数据量：中等
   - 认证：需要 `token` + `node_id` + `node_type`

4. **POST /api/v1/server/UniProxy/push**
   - 用途：提交用户流量数据
   - 频率：定期推送（根据 `push_interval` 配置，默认 60 秒）
   - 数据量：中等（用户流量统计）
   - 认证：需要 `token` + `node_id` + `node_type`

5. **POST /api/v1/server/UniProxy/alive**
   - 用途：提交在线用户数据
   - 频率：定期推送
   - 数据量：小
   - 认证：需要 `token` + `node_id` + `node_type`

6. **POST /api/v1/server/UniProxy/status**
   - 用途：提交节点负载状态（CPU、内存、磁盘等）
   - 频率：定期推送
   - 数据量：小
   - 认证：需要 `token` + `node_id` + `node_type`

### Tidalab 接口（较少使用）

- ShadowsocksTidalab: `user`, `submit`
- TrojanTidalab: `config`, `user`, `submit`

## 二、为什么接口服务器容易被墙？

### 1. **流量特征明显**

**问题：**
- `/api/v1/server/UniProxy/user` 接口返回大量数据（可能 30MB+）
- 定期高频请求（每 60 秒一次）
- 数据格式固定（JSON，包含大量用户 UUID、端口等信息）
- 请求路径特征明显（`/api/v1/server/UniProxy/*`）

**检测风险：**
- DPI（深度包检测）可以识别 JSON 结构
- 流量模式分析：固定时间间隔、固定大小的请求
- 行为分析：大量节点服务器同时请求同一接口

### 2. **请求频率过高**

**问题：**
- 每个节点每 60 秒请求一次 `config` 和 `user`
- 如果有 100 个节点，主服务器每秒收到约 3-4 个请求
- 请求时间集中，形成明显的流量模式

**检测风险：**
- 时间序列分析可以识别规律性请求
- 流量峰值明显

### 3. **数据特征明显**

**问题：**
- `user` 接口返回用户列表，包含 UUID、限速等数据
- JSON 结构固定，容易被识别
- 即使数据量不大（通常几MB），但数据格式特征明显

**检测风险：**
- 数据内容特征明显（UUID 格式、固定字段结构）
- JSON 结构可以被 DPI 识别
- 即使压缩后，数据模式仍然可识别

### 4. **域名和路径特征**

**问题：**
- API 路径包含 `server`、`UniProxy` 等关键词
- 如果使用独立接口域名，更容易被识别

**检测风险：**
- 域名特征分析
- 路径关键词匹配

### 5. **缺乏流量伪装**

**问题：**
- 直接 HTTP/HTTPS 请求，没有流量伪装
- 没有使用 CDN 或代理层
- 请求头特征明显

## 三、最佳解决方案

### 方案 A：使用 CDN + 域名分离（推荐）⭐⭐⭐⭐⭐

**架构：**
```
节点服务器 → CDN（Cloudflare/其他） → 主服务器
```

**优势：**
1. **流量伪装**：CDN 可以隐藏真实服务器 IP
2. **全球加速**：CDN 节点分布全球，降低延迟
3. **DDoS 防护**：CDN 自带防护能力
4. **HTTPS 加密**：CDN 提供免费 SSL 证书
5. **缓存优化**：CDN 可以缓存静态配置

**实施步骤：**

1. **配置 CDN**
   ```nginx
   # 在 CDN 配置中
   - 源站：主服务器 IP
   - 路径：/api/v1/server/*
   - 缓存策略：
     * /api/v1/server/UniProxy/config → 缓存 30 秒
     * /api/v1/server/UniProxy/user → 不缓存（动态数据）
     * /api/v1/server/UniProxy/alivelist → 缓存 10 秒
   ```

2. **使用普通域名**
   - 不要使用 `api-xxx.com` 这种明显特征
   - 使用普通业务域名，如 `cdn.example.com`
   - 域名可以解析到 CDN

3. **优化请求频率**
   ```php
   // 在 config 接口中返回动态间隔
   'pull_interval' => rand(50, 70), // 随机化，避免固定间隔
   ```

4. **数据压缩**
   ```nginx
   # 启用 gzip/brotli 压缩
   gzip on;
   gzip_types application/json;
   ```

**成本：** 低（Cloudflare 免费版可用）

---

### 方案 B：使用 WebSocket 长连接（推荐）⭐⭐⭐⭐

**架构：**
```
节点服务器 ←→ WebSocket 长连接 ←→ 主服务器
```

**优势：**
1. **减少连接数**：一个长连接替代多个 HTTP 请求
2. **流量特征不明显**：WebSocket 流量更像正常 Web 流量
3. **实时通信**：可以实时推送配置更新
4. **降低频率**：不需要定期轮询

**实施步骤：**

1. **实现 WebSocket 服务端**
   ```php
   // 使用 Laravel WebSockets 或 Swoole
   // 节点连接后，服务器主动推送配置和用户列表
   ```

2. **节点服务器改造**
   ```javascript
   // 节点服务器使用 WebSocket 客户端
   const ws = new WebSocket('wss://api.example.com/server');
   ws.on('message', (data) => {
       // 接收配置和用户列表更新
   });
   ```

3. **心跳机制**
   ```javascript
   // 定期发送心跳，保持连接
   setInterval(() => ws.send('ping'), 30000);
   ```

**成本：** 中等（需要开发工作）

---

### 方案 C：使用消息队列（推荐）⭐⭐⭐⭐⭐

**架构：**
```
节点服务器 → 消息队列（RabbitMQ/Redis） → 主服务器
```

**优势：**
1. **完全解耦**：节点和主服务器不直接通信
2. **流量特征不明显**：消息队列流量像正常业务流量
3. **高可用**：消息队列支持集群和故障转移
4. **灵活扩展**：可以轻松添加更多节点

**实施步骤：**

1. **部署消息队列**
   ```bash
   # 使用 Redis Streams 或 RabbitMQ
   docker run -d redis:latest
   ```

2. **节点服务器改造**
   ```php
   // 节点服务器订阅配置和用户列表更新
   $redis = new Redis();
   $redis->subscribe(['server:config:node_id', 'server:users:node_id'], function($message) {
       // 处理配置和用户列表更新
   });
   
   // 推送流量数据
   $redis->publish('server:traffic', json_encode($trafficData));
   ```

3. **主服务器改造**
   ```php
   // 主服务器监听节点数据
   // 当配置或用户变更时，推送到消息队列
   ```

**成本：** 低（Redis 免费，RabbitMQ 开源）

---

### 方案 D：域名轮换 + IP 白名单（简单方案）⭐⭐⭐

**架构：**
```
节点服务器 → 多个接口域名（轮换） → 主服务器
```

**优势：**
1. **实施简单**：只需配置多个域名
2. **分散风险**：多个域名分散流量
3. **快速恢复**：一个域名被封，自动切换

**实施步骤：**

1. **配置多个接口域名**
   ```env
   API_DOMAIN_1=https://api1.example.com
   API_DOMAIN_2=https://api2.example.com
   API_DOMAIN_3=https://api3.example.com
   ```

2. **节点服务器实现域名轮换**
   ```php
   $domains = ['api1.example.com', 'api2.example.com', 'api3.example.com'];
   $domain = $domains[array_rand($domains)];
   ```

3. **IP 白名单**
   ```nginx
   # 只允许节点服务器 IP 访问
   allow 1.2.3.4;  # 节点服务器 IP
   deny all;
   ```

**成本：** 低（只需多个域名）

---

### 方案 E：数据分片 + 增量更新（优化方案）⭐⭐⭐⭐

**架构：**
```
节点服务器 → 分片请求 → 主服务器
```

**优势：**
1. **减少单次数据量**：将 30MB 数据分成多个小请求
2. **增量更新**：只传输变更的用户数据
3. **降低检测风险**：小请求更容易伪装

**实施步骤：**

1. **实现分片接口**
   ```php
   // GET /api/v1/server/UniProxy/user?page=1&limit=100
   // 分页返回用户列表
   ```

2. **实现增量更新**
   ```php
   // GET /api/v1/server/UniProxy/user/delta?since=timestamp
   // 只返回变更的用户
   ```

3. **节点服务器改造**
   ```php
   // 首次全量拉取，后续增量更新
   $users = fetchAllUsers();
   while (true) {
       $delta = fetchDeltaUsers($lastUpdateTime);
       updateUsers($delta);
       sleep(60);
   }
   ```

**成本：** 低（主要是开发工作）

---

## 四、综合推荐方案

### 短期方案（快速实施）：方案 D + 方案 E

1. **配置多个接口域名**（方案 D）
2. **实现数据分片和增量更新**（方案 E）
3. **优化请求频率**：随机化间隔时间

**实施时间：** 1-2 天

### 长期方案（最佳实践）：方案 A + 方案 C

1. **使用 CDN 加速和流量伪装**（方案 A）
2. **逐步迁移到消息队列**（方案 C）
3. **保留 HTTP 接口作为备用**

**实施时间：** 1-2 周

---

## 五、立即可以实施的优化

### 1. 优化请求频率

```php
// app/Http/Controllers/V1/Server/UniProxyController.php
public function config(Request $request)
{
    // ...
    $response['base_config'] = [
        'push_interval' => rand(50, 70), // 随机化，避免固定间隔
        'pull_interval' => rand(50, 70)
    ];
    // ...
}
```

### 2. 启用数据压缩

```nginx
# nginx 配置
location /api/v1/server/ {
    gzip on;
    gzip_types application/json;
    gzip_min_length 1000;
    gzip_comp_level 6;  # 压缩级别
}
```

### 3. 实现用户列表分页（可选，如果用户数超过 5 万）

```php
// 修改 user 接口支持分页（仅在用户数很大时使用）
public function user(Request $request)
{
    $node = $this->getNodeInfo($request);
    $users = ServerService::getAvailableUsers($node);
    
    // 如果用户数超过 50000，考虑分页
    if ($users->count() > 50000) {
        $page = $request->input('page', 1);
        $limit = $request->input('limit', 10000);
        $users = $users->skip(($page - 1) * $limit)->take($limit);
    }
    
    $response['users'] = $users;
    // ...
}
```

### 4. 添加请求限流

```php
// 使用 Laravel Rate Limiting
Route::middleware(['throttle:60,1'])->group(function () {
    // 限制每个 IP 每分钟 60 次请求
});
```

### 5. 使用普通域名

- ❌ 避免：`api-vpn.com`, `node-api.com`
- ✅ 推荐：`cdn.example.com`, `static.example.com`

---

## 六、监控和告警

### 1. 监控指标

- 接口响应时间
- 请求失败率
- 数据量大小
- 请求频率

### 2. 告警规则

- 连续 3 次请求失败 → 告警
- 响应时间 > 5 秒 → 告警
- 数据量异常增长 → 告警

---

## 七、总结

**核心问题：**
1. 请求频率高（每 60 秒，固定间隔）
2. 流量特征明显（固定路径、固定 JSON 结构）
3. 缺乏伪装（直接 HTTP/HTTPS，没有 CDN 或代理层）
4. 数据格式特征明显（UUID 格式、固定字段结构）

**最佳方案：**
1. **短期**：多域名轮换 + 数据分片 + 随机化间隔
2. **长期**：CDN + 消息队列 + WebSocket

**优先级：**
1. ⭐⭐⭐⭐⭐ 立即实施：随机化请求间隔、启用压缩
2. ⭐⭐⭐⭐ 本周实施：多域名轮换、CDN 配置
3. ⭐⭐⭐ 本月实施：消息队列迁移、WebSocket 长连接

