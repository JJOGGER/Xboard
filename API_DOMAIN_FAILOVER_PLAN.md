# API 域名自动切换方案设计

## 方案概述

当前端 API 请求失败时，自动从备用域名服务获取可用域名列表，并自动切换到可用的 API 域名。

## 架构设计

### 1. 配置方案

**`.env` 配置：**
```env
# 主 API 域名（用于获取备用域名列表的入口）
API_DOMAIN=https://mazuvpn.icu

# 备用域名服务地址（可选，默认使用 API_DOMAIN + /api/api.json）
API_FAILOVER_URL=https://mazuvpn.icu/api/api.json
```

**备用域名 JSON 格式：**
```json
{
  "main_domain": "https://mazuvpn.com",
  "domain": [
    "https://mazucloud.icu"
  ],
  "update": 24
}
```

### 2. 工作流程

```
┌─────────────────┐
│  前端发起请求   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     成功      ┌──────────────┐
│ 使用当前 API 域名│ ────────────► │  请求成功    │
└────────┬────────┘               └──────────────┘
         │
         │ 失败（网络错误/超时/5xx）
         ▼
┌─────────────────┐
│ 检测到请求失败  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 调用备用域名服务获取域名列表    │
│ GET https://mazuvpn.icu/api/api.json │
└────────┬────────────────────────┘
         │
         │ 解析 JSON，获取 domain 数组
         ▼
┌─────────────────┐
│ 轮询测试域名    │
│ 1. https://mazuvpn.com          │
│ 2. https://mazucloud.icu         │
└────────┬────────┘
         │
         │ 找到第一个可用的
         ▼
┌─────────────────┐
│ 更新 API 域名   │
│ 保存到 localStorage │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 重试原始请求    │
└─────────────────┘
```

## 实现方案

### 方案 A：拦截 Axios 请求（推荐）

**优点：**
- 自动拦截所有 API 请求
- 无需修改现有代码
- 透明切换，用户无感知

**实现要点：**
1. 创建 Axios 拦截器
2. 在响应拦截器中检测失败
3. 自动获取备用域名并切换
4. 重试原始请求

### 方案 B：封装 API 请求函数

**优点：**
- 更精确的控制
- 可以添加更多逻辑

**缺点：**
- 需要修改现有代码
- 可能遗漏部分请求

### 方案 C：Service Worker（不推荐）

**优点：**
- 可以拦截所有网络请求

**缺点：**
- 实现复杂
- 需要 HTTPS
- 兼容性问题

## 详细设计

### 1. 备用域名服务接口

**URL：** `https://mazuvpn.icu/api/api.json`

**响应格式：**
```json
{
  "main_domain": "https://mazuvpn.com",
  "domain": [
    "https://mazucloud.icu",
    "https://mazuvpn.net"
  ],
  "update": 24
}
```

**字段说明：**
- `main_domain`: 主域名（可选，用于优先级）
- `domain`: 备用域名数组（必填）
- `update`: 更新间隔（小时，可选）

### 2. 域名可用性检测

**检测方法：**
- 发送 HEAD 请求到 `/api/v2/user/info` 或 `/api/v1/guest/config`
- 超时时间：3-5 秒
- 成功条件：状态码 200/401/403（401/403 表示 API 正常，只是需要认证）

**检测顺序：**
1. 优先使用 `main_domain`（如果存在）
2. 然后遍历 `domain` 数组
3. 找到第一个可用的即停止

### 3. 域名切换策略

**切换时机：**
- API 请求失败（网络错误、超时、5xx 错误）
- 连续失败 N 次（建议 2-3 次）后触发切换

**切换流程：**
1. 检查是否已有缓存的可用域名（localStorage）
2. 如果有，先尝试使用缓存的域名
3. 如果缓存域名也失败，获取新的域名列表
4. 测试并找到可用域名
5. 更新缓存和当前 API 域名
6. 重试原始请求

**缓存策略：**
- 使用 `localStorage` 存储当前可用域名
- 缓存有效期：根据 `update` 字段（默认 24 小时）
- 键名：`xboard_api_domain` 和 `xboard_api_domain_expire`

### 4. 重试机制

**重试策略：**
- 最多重试 3 次
- 每次重试间隔递增（1s, 2s, 3s）
- 如果所有备用域名都失败，显示错误提示

## 实现细节

### 1. Axios 拦截器实现

```javascript
// api-failover.js

(function() {
  'use strict';
  
  // 配置
  const CONFIG = {
    failoverUrl: window.settings?.api_failover_url || 'https://mazuvpn.icu/api/api.json',
    currentDomain: window.routerBase || window.settings?.base_url || '/',
    testEndpoint: '/api/v1/guest/config', // 用于测试域名可用性
    maxRetries: 3,
    timeout: 5000,
    cacheKey: 'xboard_api_domain',
    cacheExpireKey: 'xboard_api_domain_expire',
    cacheExpireHours: 24
  };
  
  // 获取缓存的域名
  function getCachedDomain() {
    const cached = localStorage.getItem(CONFIG.cacheKey);
    const expire = localStorage.getItem(CONFIG.cacheExpireKey);
    
    if (cached && expire && Date.now() < parseInt(expire)) {
      return cached;
    }
    
    return null;
  }
  
  // 保存域名到缓存
  function saveDomainToCache(domain) {
    const expire = Date.now() + (CONFIG.cacheExpireHours * 60 * 60 * 1000);
    localStorage.setItem(CONFIG.cacheKey, domain);
    localStorage.setItem(CONFIG.cacheExpireKey, expire.toString());
  }
  
  // 测试域名可用性
  async function testDomain(domain) {
    try {
      const testUrl = domain.replace(/\/$/, '') + CONFIG.testEndpoint;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      // 200/401/403 都表示 API 可用
      return response.status === 200 || response.status === 401 || response.status === 403;
    } catch (error) {
      return false;
    }
  }
  
  // 获取备用域名列表
  async function fetchBackupDomains() {
    try {
      const response = await fetch(CONFIG.failoverUrl, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(CONFIG.timeout)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup domains');
      }
      
      const data = await response.json();
      
      // 构建域名列表：优先 main_domain，然后 domain 数组
      const domains = [];
      if (data.main_domain) {
        domains.push(data.main_domain.replace(/\/$/, ''));
      }
      if (data.domain && Array.isArray(data.domain)) {
        domains.push(...data.domain.map(d => d.replace(/\/$/, '')));
      }
      
      // 更新缓存过期时间
      if (data.update) {
        CONFIG.cacheExpireHours = data.update;
      }
      
      return domains;
    } catch (error) {
      console.error('Failed to fetch backup domains:', error);
      return [];
    }
  }
  
  // 查找可用域名
  async function findAvailableDomain() {
    // 1. 先检查缓存
    const cached = getCachedDomain();
    if (cached && await testDomain(cached)) {
      return cached;
    }
    
    // 2. 获取备用域名列表
    const domains = await fetchBackupDomains();
    if (domains.length === 0) {
      return null;
    }
    
    // 3. 测试每个域名
    for (const domain of domains) {
      if (await testDomain(domain)) {
        saveDomainToCache(domain);
        return domain;
      }
    }
    
    return null;
  }
  
  // 切换 API 域名
  function switchApiDomain(newDomain) {
    const baseUrl = newDomain.replace(/\/$/, '') + '/';
    
    // 更新全局配置
    if (window.routerBase !== undefined) {
      window.routerBase = baseUrl;
    }
    if (window.settings) {
      window.settings.base_url = baseUrl;
    }
    
    // 更新 Axios 默认 baseURL（如果存在）
    if (window.axios && window.axios.defaults) {
      window.axios.defaults.baseURL = baseUrl;
    }
    
    console.log('API domain switched to:', baseUrl);
  }
  
  // 判断是否是网络错误
  function isNetworkError(error) {
    if (!error.response) {
      return true; // 网络错误、超时等
    }
    
    const status = error.response.status;
    return status >= 500 || status === 0; // 5xx 错误或 CORS 错误
  }
  
  // 失败计数器（用于避免频繁切换）
  let failureCount = 0;
  let isSwitching = false;
  
  // 设置 Axios 拦截器
  function setupInterceptors() {
    if (!window.axios) {
      console.warn('Axios not found, API failover will not work');
      return;
    }
    
    // 响应拦截器
    window.axios.interceptors.response.use(
      (response) => {
        // 成功时重置失败计数
        failureCount = 0;
        return response;
      },
      async (error) => {
        // 检查是否是网络错误
        if (isNetworkError(error) && !isSwitching) {
          failureCount++;
          
          // 连续失败 N 次后触发切换
          if (failureCount >= 2) {
            isSwitching = true;
            failureCount = 0;
            
            try {
              console.log('API request failed, trying to switch domain...');
              
              const availableDomain = await findAvailableDomain();
              
              if (availableDomain) {
                switchApiDomain(availableDomain);
                
                // 重试原始请求
                const config = error.config;
                if (config && !config._retry) {
                  config._retry = true;
                  config.baseURL = window.routerBase || window.settings?.base_url || '/';
                  
                  return window.axios(config);
                }
              } else {
                console.error('No available API domain found');
              }
            } catch (switchError) {
              console.error('Failed to switch API domain:', switchError);
            } finally {
              isSwitching = false;
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    console.log('API failover interceptor installed');
  }
  
  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInterceptors);
  } else {
    setupInterceptors();
  }
})();
```

### 2. 配置注入

在 `dashboard.blade.php` 中注入配置：

```php
<script>
  window.routerBase = "{{ config('app.api_domain') ? rtrim(config('app.api_domain'), '/') . '/' : '/' }}";
  window.settings = {
    // ... 其他配置
    api_failover_url: "{{ config('app.api_failover_url', config('app.api_domain') . '/api/api.json') }}",
  };
</script>
<script src="/assets/api-failover.js"></script>
```

### 3. 后端配置支持

在 `config/app.php` 中添加：

```php
'api_failover_url' => env('API_FAILOVER_URL', null),
```

## 注意事项

### 1. CORS 问题

备用域名服务（`https://mazuvpn.icu/api/api.json`）需要配置 CORS：

```nginx
location /api/api.json {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    # 返回 JSON 文件或代理到后端
}
```

### 2. 性能考虑

- 域名测试使用 HEAD 请求，减少数据传输
- 设置合理的超时时间（3-5 秒）
- 使用缓存避免频繁切换

### 3. 用户体验

- 切换过程对用户透明
- 如果所有域名都失败，显示友好的错误提示
- 可以考虑显示"正在切换服务器..."的提示

### 4. 安全性

- 验证备用域名列表的来源
- 防止域名列表被篡改
- 考虑添加域名白名单

## 测试方案

### 1. 单元测试

- 测试域名可用性检测
- 测试域名切换逻辑
- 测试缓存机制

### 2. 集成测试

- 模拟 API 请求失败
- 验证自动切换流程
- 验证重试机制

### 3. 手动测试

1. 配置主 API 域名为一个不可用的域名
2. 访问前端页面
3. 观察控制台日志
4. 验证是否自动切换到备用域名

## 部署步骤

1. **创建备用域名 JSON 文件或接口**
   - 在 `mazuvpn.icu` 服务器上创建 `/api/api.json`
   - 或创建后端接口返回域名列表

2. **配置 `.env`**
   ```env
   API_DOMAIN=https://mazuvpn.icu
   API_FAILOVER_URL=https://mazuvpn.icu/api/api.json
   ```

3. **部署前端脚本**
   - 将 `api-failover.js` 放到 `public/assets/`
   - 在 `dashboard.blade.php` 中引入

4. **清除缓存并重启**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   supervisorctl restart xboard-octane
   ```

5. **测试验证**
   - 访问前端页面
   - 检查控制台是否加载了 failover 脚本
   - 模拟 API 失败，验证自动切换

## 优势

1. **自动化**：无需手动干预，自动切换
2. **透明**：用户无感知，体验流畅
3. **灵活**：可以动态更新备用域名列表
4. **可靠**：多重保障，缓存 + 实时检测
5. **易维护**：只需更新 JSON 文件即可

## 潜在问题及解决方案

### 问题 1：备用域名服务也被墙

**解决方案：**
- 使用多个备用域名服务地址
- 在代码中硬编码一个最稳定的备用地址

### 问题 2：频繁切换导致性能问题

**解决方案：**
- 增加失败计数阈值
- 使用缓存减少切换频率
- 添加防抖机制

### 问题 3：某些请求不应该重试

**解决方案：**
- 在请求配置中添加 `skipFailover: true` 标记
- 在拦截器中检查该标记

## 总结

这个方案通过前端自动检测和切换，实现了 API 域名的容灾。主要特点：

- ✅ 无需修改后端代码
- ✅ 自动发现和切换
- ✅ 支持动态更新
- ✅ 用户体验良好
- ✅ 易于维护

建议采用**方案 A（Axios 拦截器）**，这是最优雅和通用的实现方式。


