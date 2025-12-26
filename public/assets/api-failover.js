/**
 * API 域名自动切换脚本
 * 当前端 API 请求失败时，自动从备用域名服务获取可用域名并切换
 */
(function() {
  'use strict';
  
  // 配置
  const CONFIG = {
    // 备用域名服务地址（从当前 API 域名获取）
    get failoverUrl() {
      const currentDomain = window.routerBase || window.settings?.base_url || '/';
      // 从当前域名构建备用域名服务地址
      if (currentDomain.startsWith('http')) {
        return currentDomain.replace(/\/$/, '') + '/api/api.json';
      }
      // 如果当前是相对路径，尝试从 window.location 获取
      const protocol = window.location.protocol;
      const host = window.location.host;
      return protocol + '//' + host + '/api/api.json';
    },
    // 测试端点（用于检测域名可用性）
    testEndpoint: '/api/v1/guest/config',
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
  
  // 获取缓存的域名
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
      console.warn('Failed to read cache:', e);
    }
    
    return null;
  }
  
  // 保存域名到缓存
  function saveDomainToCache(domain, expireHours) {
    try {
      const expire = Date.now() + ((expireHours || CONFIG.cacheExpireHours) * 60 * 60 * 1000);
      localStorage.setItem(CONFIG.cacheKey, domain);
      localStorage.setItem(CONFIG.cacheExpireKey, expire.toString());
    } catch (e) {
      console.warn('Failed to save cache:', e);
    }
  }
  
  // 测试域名可用性
  async function testDomain(domain) {
    try {
      const testUrl = domain.replace(/\/$/, '') + CONFIG.testEndpoint;
      
      // 使用 AbortController 实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      // 200/401/403 都表示 API 可用
      // 200: 成功
      // 401: 需要认证（API 正常）
      // 403: 禁止访问（API 正常）
      return response.status === 200 || response.status === 401 || response.status === 403;
    } catch (error) {
      // 网络错误、超时等都返回 false
      return false;
    }
  }
  
  // 获取备用域名列表
  async function fetchBackupDomains() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
      
      const response = await fetch(CONFIG.failoverUrl, {
        cache: 'no-cache',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup domains: ' + response.status);
      }
      
      const data = await response.json();
      
      // 只使用 domain 数组，忽略 main_domain
      if (!data.domain || !Array.isArray(data.domain) || data.domain.length === 0) {
        throw new Error('No backup domains found in response');
      }
      
      // 清理域名格式（去除尾部斜杠）
      const domains = data.domain.map(d => {
        const domain = String(d).trim();
        return domain.replace(/\/$/, '');
      }).filter(d => d.length > 0);
      
      // 更新缓存过期时间（如果返回了 update 字段）
      if (data.update && typeof data.update === 'number') {
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
    if (cached) {
      console.log('Testing cached domain:', cached);
      if (await testDomain(cached)) {
        console.log('Cached domain is available:', cached);
        return cached;
      } else {
        console.log('Cached domain is not available, clearing cache');
        try {
          localStorage.removeItem(CONFIG.cacheKey);
          localStorage.removeItem(CONFIG.cacheExpireKey);
        } catch (e) {
          // ignore
        }
      }
    }
    
    // 2. 获取备用域名列表
    console.log('Fetching backup domains from:', CONFIG.failoverUrl);
    const domains = await fetchBackupDomains();
    
    if (domains.length === 0) {
      console.error('No backup domains available');
      return null;
    }
    
    console.log('Found backup domains:', domains);
    
    // 3. 测试每个域名，找到第一个可用的
    for (const domain of domains) {
      console.log('Testing domain:', domain);
      if (await testDomain(domain)) {
        console.log('Found available domain:', domain);
        saveDomainToCache(domain);
        return domain;
      }
    }
    
    console.error('No available domain found');
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
  
  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInterceptors);
  } else {
    setupInterceptors();
  }
})();


