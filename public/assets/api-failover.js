/**
 * API 域名自动切换脚本
 * 当前端 API 请求失败时，自动从备用域名服务获取可用域名并切换
 */
(function() {
  'use strict';
  
  // 保存原始 API 域名（API_DOMAIN，用于初始请求）
  const ORIGINAL_API_DOMAIN = (function() {
    // 在脚本加载时立即获取原始域名（此时还没有被切换）
    const originalDomain = window.routerBase || window.settings?.base_url || window.location.origin;
    if (originalDomain.startsWith('http')) {
      return originalDomain.replace(/\/$/, '');
    }
    // 如果当前是相对路径，使用当前页面的 origin
    return window.location.origin;
  })();
  
  // 保存备用 API 域名（BACKUP_API_DOMAIN，用于获取备用域名列表）
  const BACKUP_API_DOMAIN = (function() {
    // 从 window.settings 获取配置的备用域名
    const backupDomain = window.settings?.backup_api_domain;
    if (backupDomain && backupDomain.startsWith('http')) {
      return backupDomain.replace(/\/$/, '');
    }
    // 如果没有配置备用域名，使用原始域名作为后备
    return ORIGINAL_API_DOMAIN;
  })();
  
  // 配置
  const CONFIG = {
    // 备用域名服务地址（使用 BACKUP_API_DOMAIN，如果不可用则回退到原始域名）
    get failoverUrl() {
      // 优先使用 BACKUP_API_DOMAIN，如果没有配置则使用原始域名
      // 这样即使切换到备用域名后，仍然可以从备用域名服务获取备用域名列表
      return BACKUP_API_DOMAIN + '/api/api.json';
    },
    // 测试端点（用于检测域名可用性，使用 guest 端点，不需要认证）
    testEndpoint: '/api/v1/guest/comm/config',
    // 最大重试次数
    maxRetries: 3,
    // 请求超时时间（毫秒）
    timeout: 5000,
    // 失败计数阈值（连续失败 N 次后触发切换）
    failureThreshold: 2,
    // 缓存键名
    cacheKey: 'xboard_api_domain',
    cacheExpireKey: 'xboard_api_domain_expire',
    // 缓存过期时间（小时）
    cacheExpireHours: 24
  };
  
  // 从localStorage获取缓存的域名
  function getCachedDomain() {
    try {
      const cached = localStorage.getItem(CONFIG.cacheKey);
      const expire = localStorage.getItem(CONFIG.cacheExpireKey);
      
      if (cached && expire && Date.now() < parseInt(expire, 10)) {
        return cached;
      }
      
      // 缓存过期，清除
      if (cached) {
        localStorage.removeItem(CONFIG.cacheKey);
        localStorage.removeItem(CONFIG.cacheExpireKey);
      }
    } catch (e) {
      console.warn('Failed to read local cache:', e);
    }
    
    return null;
  }
  
  // 保存域名到缓存（localStorage）
  function saveDomainToLocalCache(domain, expireHours) {
    try {
      const expire = Date.now() + ((expireHours || CONFIG.cacheExpireHours) * 60 * 60 * 1000);
      localStorage.setItem(CONFIG.cacheKey, domain);
      localStorage.setItem(CONFIG.cacheExpireKey, expire.toString());
    } catch (e) {
      console.warn('Failed to save local cache:', e);
    }
  }

  // 从数据库获取缓存的域名
  async function getCachedDomainFromDatabase() {
    try {
      // 使用原始 API 域名来访问数据库缓存端点
      // 这样可以确保即使切换到备用域名后，仍然可以从原始域名获取缓存
      const apiBase = ORIGINAL_API_DOMAIN;
      
      const response = await fetch(apiBase + '/api/v1/guest/comm/api-domain-cache', {
        method: 'GET',
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (!response.ok) {
        console.log('Failed to get cached domain from database: HTTP ' + response.status);
        return null;
      }
      
      const data = await response.json();
      if (data.data && data.data.domain) {
        return data.data.domain;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get cached domain from database:', error);
      return null;
    }
  }

  // 保存域名到数据库
  async function saveDomainToDatabase(domain) {
    try {
      // 使用传入的可用域名作为API基础URL，确保保存操作能够成功执行
      // 因为只有可用的域名才能成功保存到数据库
      const apiBase = domain.replace(/\/$/, '');
      
      const response = await fetch(apiBase + '/api/v1/guest/comm/api-domain-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: domain }),
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (response.ok) {
        console.log('Domain saved to database:', domain);
        return true;
      } else {
        console.warn('Failed to save domain to database:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('Failed to save domain to database:', error);
      return false;
    }
  }
  
  // 测试域名可用性
  async function testDomain(domain) {
    try {
      // 使用 guest 配置接口测试（不需要认证）
      // 添加时间戳参数避免浏览器缓存
      const testUrl = domain.replace(/\/$/, '') + '/api/v1/guest/comm/config?t=' + Date.now();
      
      // 使用 AbortController 实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      // 只有 200 状态码表示 API 可用
      // 200: 成功（API 正常可用）
      // 401: 需要认证（端点可能需要认证，但通常 guest 端点不需要，视为不可用）
      // 403: 禁止访问（端点不可用或被拒绝）
      // 404: 端点不存在（不可用）
      // 5xx: 服务器错误（不可用）
      const isAvailable = response.status === 200;
      
      if (!isAvailable) {
        console.log('Domain test failed for ' + domain + ': HTTP ' + response.status);
      }
      
      return isAvailable;
    } catch (error) {
      // 网络错误、超时等都返回 false
      console.log('Domain test failed for ' + domain + ':', error.message || error);
      return false;
    }
  }
  
  // 获取备用域名列表
  async function fetchBackupDomains() {
    try {
      // 添加时间戳参数避免浏览器缓存
      const failoverUrl = CONFIG.failoverUrl + (CONFIG.failoverUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, CONFIG.timeout);
      
      const response = await fetch(failoverUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup domains: ' + response.status);
      }
      
      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.warn('Response is not JSON, content:', text.substring(0, 100));
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      
      // 解析域名列表
      const domains = [];
      
      // 处理 domain 数组，支持逗号分隔的字符串
      if (data.domain && Array.isArray(data.domain)) {
        data.domain.forEach(item => {
          const domainStr = String(item).trim();
          // 如果字符串包含逗号，按逗号分割
          if (domainStr.includes(',')) {
            const splitDomains = domainStr.split(',').map(d => d.trim()).filter(d => d.length > 0);
            domains.push(...splitDomains);
          } else if (domainStr.length > 0) {
            domains.push(domainStr);
          }
        });
      }
      
      // 如果 domain 数组为空，尝试使用 main_domain
      if (domains.length === 0 && data.main_domain) {
        domains.push(String(data.main_domain).trim());
      }
      
      // 清理域名格式（去除尾部斜杠）
      const cleanedDomains = domains.map(d => {
        return d.replace(/\/$/, '');
      }).filter(d => d.length > 0);
      
      // 更新缓存过期时间（如果返回了 update 字段）
      if (data.update && typeof data.update === 'number') {
        CONFIG.cacheExpireHours = data.update;
      }
      
      if (cleanedDomains.length === 0) {
        throw new Error('No backup domains found in response');
      }
      
      return cleanedDomains;
    } catch (error) {
      // 区分不同类型的错误
      if (error.name === 'AbortError') {
        console.warn('Failed to fetch backup domains: Request timeout after ' + CONFIG.timeout + 'ms');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn('Failed to fetch backup domains: Network error or CORS issue');
      } else {
        console.error('Failed to fetch backup domains:', error);
      }
      return [];
    }
  }
  
  // 查找可用域名
  async function findAvailableDomain() {
    // 1. 先检查数据库缓存
    console.log('Checking database cache...');
    const dbCached = await getCachedDomainFromDatabase();
    if (dbCached) {
      console.log('Found cached domain in database:', dbCached);
      if (await testDomain(dbCached)) {
        console.log('Cached domain from database is available:', dbCached);
        // 同时保存到localStorage
        saveDomainToLocalCache(dbCached);
        return dbCached;
      } else {
        console.log('Cached domain from database is not available');
      }
    }
    
    // 2. 检查localStorage缓存
    const cached = getCachedDomain();
    if (cached) {
      console.log('Testing cached domain from localStorage:', cached);
      if (await testDomain(cached)) {
        console.log('Cached domain from localStorage is available:', cached);
        // 保存到数据库
        await saveDomainToDatabase(cached);
        return cached;
      } else {
        console.log('Cached domain from localStorage is not available, clearing cache');
        try {
          localStorage.removeItem(CONFIG.cacheKey);
          localStorage.removeItem(CONFIG.cacheExpireKey);
        } catch (e) {
          // ignore
        }
      }
    }
    
    // 3. 获取备用域名列表
    console.log('Fetching backup domains from:', CONFIG.failoverUrl);
    const domains = await fetchBackupDomains();
    
    if (domains.length === 0) {
      console.error('No backup domains available');
      return null;
    }
    
    console.log('Found backup domains:', domains);
    
    // 4. 测试每个域名，找到第一个可用的
    for (const domain of domains) {
      console.log('Testing domain:', domain);
      if (await testDomain(domain)) {
        console.log('Found available domain:', domain);
        // 保存到localStorage和数据库
        saveDomainToLocalCache(domain);
        await saveDomainToDatabase(domain);
        return domain;
      }
    }
    
    console.error('No available domain found');
    return null;
  }
  
  // 切换 API 域名
  function switchApiDomain(newDomain) {
    const baseUrl = newDomain.replace(/\/$/, '') + '/';
    
    // 强制更新全局配置（无论之前是否存在）
    window.routerBase = baseUrl;
    
    if (window.settings) {
      window.settings.base_url = baseUrl;
    } else {
      // 如果 settings 不存在，创建一个基础对象
      window.settings = { base_url: baseUrl };
    }
    
    // 更新 Axios 默认 baseURL（如果存在）
    if (window.axios) {
      if (window.axios.defaults) {
        window.axios.defaults.baseURL = baseUrl;
      }
      // 如果 axios 实例已创建，也需要更新所有已存在的实例
      if (window.axios.create) {
        // 确保后续创建的实例也使用新的 baseURL
        const originalCreate = window.axios.create;
        window.axios.create = function(config) {
          const newConfig = { ...config };
          if (!newConfig.baseURL) {
            newConfig.baseURL = baseUrl;
          }
          return originalCreate.call(this, newConfig);
        };
      }
    }
    
    // 触发自定义事件，通知其他代码域名已切换
    if (typeof window.CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apiDomainSwitched', { 
        detail: { domain: newDomain, baseUrl: baseUrl } 
      }));
    }
    
    console.log('API domain switched to:', baseUrl);
  }
  
  // 判断是否是网络错误
  function isNetworkError(error) {
    // 没有 response 表示网络错误、超时、CORS 错误等
    if (!error.response) {
      return true;
    }
    
    // 5xx 服务器错误
    const status = error.response.status;
    return status >= 500 || status === 0;
  }
  
  // 失败计数器（用于避免频繁切换）
  let failureCount = 0;
  let isSwitching = false;
  let switchPromise = null;
  
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
          
          console.log('API request failed, failure count:', failureCount);
          
          // 连续失败 N 次后触发切换
          if (failureCount >= CONFIG.failureThreshold) {
            failureCount = 0; // 重置计数
            
            // 如果正在切换，等待切换完成
            if (switchPromise) {
              try {
                await switchPromise;
              } catch (e) {
                // ignore
              }
            } else {
              // 开始切换
              isSwitching = true;
              switchPromise = (async () => {
                try {
                  console.log('API request failed multiple times, trying to switch domain...');
                  
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
                    console.error('No available API domain found, cannot retry request');
                  }
                } catch (switchError) {
                  console.error('Failed to switch API domain:', switchError);
                } finally {
                  isSwitching = false;
                  switchPromise = null;
                }
              })();
              
              return switchPromise;
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    console.log('API failover interceptor installed');
  }
  
  // 初始化：在页面加载时立即获取并切换域名
  async function initializeDomain() {
    // 只有当配置了 API_DOMAIN 且是绝对 URL 时才执行初始化切换
    const currentDomain = window.routerBase || window.settings?.base_url || '/';
    if (!currentDomain.startsWith('http')) {
      console.log('API domain is relative path, skip domain initialization');
      return;
    }
    
    console.log('Initializing API domain...');
    
    try {
      // 1. 优先检查 localStorage 缓存（立即切换，不需要等待测试）
      console.log('Checking localStorage cache...');
      const localCached = getCachedDomain();
      if (localCached) {
        console.log('Found cached domain in localStorage:', localCached);
        // 立即切换域名（不等待测试完成）
        console.log('Immediately switching to cached domain:', localCached);
        switchApiDomain(localCached);
        
        // 异步验证域名是否仍然可用
        testDomain(localCached).then(isAvailable => {
          if (isAvailable) {
            console.log('Cached domain verified as available:', localCached);
            // 同时更新数据库缓存（异步，不阻塞）
            saveDomainToDatabase(localCached).catch(err => {
              console.warn('Failed to update database cache:', err);
            });
          } else {
            console.warn('Cached domain is no longer available, will re-fetch');
            // 清除缓存，但不立即切换（避免在初始化时多次切换）
            localStorage.removeItem(CONFIG.cacheKey);
            localStorage.removeItem(CONFIG.cacheExpireKey);
            // 触发重新查找可用域名（异步，不阻塞初始化）
            findAndSwitchDomain().catch(err => {
              console.warn('Failed to find alternative domain:', err);
            });
          }
        }).catch(err => {
          console.warn('Failed to verify cached domain:', err);
        });
        
        return; // 立即返回，不等待测试
      }
      
      // 2. 先测试原始 API_DOMAIN 是否可用
      console.log('Testing original API_DOMAIN:', ORIGINAL_API_DOMAIN);
      if (await testDomain(ORIGINAL_API_DOMAIN)) {
        console.log('Original API_DOMAIN is available, using it - no need to fetch backup domains');
        // 原始域名可用，直接使用，不需要切换，也不需要获取备用域名列表
        return;
      }
      
      console.log('Original API_DOMAIN is not available, fetching backup domains from BACKUP_API_DOMAIN...');
      
      // 3. 如果原始域名不可用，从 BACKUP_API_DOMAIN 获取备用域名列表
      await findAndSwitchDomain();
      
    } catch (error) {
      console.error('Failed to initialize domain:', error);
      // 初始化失败不影响页面功能，继续使用当前域名
    }
  }
  
  // 查找并切换可用域名的辅助函数
  async function findAndSwitchDomain() {
    try {
      console.log('Fetching domains from api.json...');
      const domains = await fetchBackupDomains();
      
      if (domains.length === 0) {
        console.warn('No domains found in api.json, using current domain');
        return;
      }
      
      console.log('Found domains in api.json:', domains);
      
      // 按顺序测试每个域名，找到第一个可用的
      for (const domain of domains) {
        console.log('Testing domain:', domain);
        if (await testDomain(domain)) {
          console.log('Found available domain:', domain);
          switchApiDomain(domain);
          // 保存到localStorage和数据库
          saveDomainToLocalCache(domain);
          await saveDomainToDatabase(domain);
          return;
        } else {
          console.log('Domain not available:', domain);
        }
      }
      
      console.warn('No available domain found, keeping current domain');
    } catch (error) {
      console.error('Failed to find and switch domain:', error);
    }
  }
  
  // 立即检查并切换 localStorage 缓存的域名（同步执行，不等待任何异步操作）
  // 这样可以确保在脚本加载的第一时间就切换域名
  (function immediateDomainSwitch() {
    try {
      const localCached = getCachedDomain();
      if (localCached) {
        console.log('Immediate domain switch from localStorage:', localCached);
        switchApiDomain(localCached);
      }
    } catch (e) {
      console.warn('Failed to do immediate domain switch:', e);
    }
  })();
  
  // 初始化
  async function init() {
    // 先初始化域名（页面加载时立即切换，必须在拦截器之前执行）
    // 这样确保在设置拦截器之前，域名就已经切换好了
    await initializeDomain();
    
    // 然后设置拦截器（用于失败后的切换）
    setupInterceptors();
  }
  
  // 立即执行初始化（不等待 DOMContentLoaded）
  // 这样可以尽早切换域名，避免前端应用使用旧的域名
  init();
})();



