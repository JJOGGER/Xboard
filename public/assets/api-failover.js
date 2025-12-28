/**
 * API 域名自动切换脚本
 * 当前端 API 请求失败时，自动从配置的域名列表中按顺序测试并切换到可用域名
 */
(function() {
  'use strict';
  
  // 解析 API 域名列表（支持逗号分隔的多个域名）
  const API_DOMAIN_LIST = (function() {
    // 在脚本加载时立即获取原始域名（此时还没有被切换）
    const originalDomain = window.routerBase || window.settings?.base_url || window.location.origin;
    
    // 如果包含逗号，说明配置了多个域名
    if (originalDomain.includes(',')) {
      return originalDomain.split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0 && d.startsWith('http'))
        .map(d => d.replace(/\/$/, ''));
    }
    
    // 单个域名
    if (originalDomain.startsWith('http')) {
      return [originalDomain.replace(/\/$/, '')];
    }
    
    // 如果当前是相对路径，使用当前页面的 origin
    return [window.location.origin];
  })();
  
  // 配置
  const CONFIG = {
    // 测试端点（用于检测域名可用性，使用 guest 端点，不需要认证）
    testEndpoint: '/api/v1/guest/comm/config',
    // 最大重试次数
    maxRetries: 3,
    // 请求超时时间（毫秒）- 增加到 10 秒，避免网络延迟导致误判
    timeout: 10000,
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
        // 验证并清理缓存的域名，确保是单个有效域名
        const cleanedDomain = validateAndCleanDomain(cached);
        if (cleanedDomain) {
          return cleanedDomain;
        } else {
          // 如果缓存的域名格式无效，清除缓存
          console.warn('Cached domain format is invalid, clearing cache:', cached);
          localStorage.removeItem(CONFIG.cacheKey);
          localStorage.removeItem(CONFIG.cacheExpireKey);
        }
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
      // 验证并清理域名，确保是单个有效域名
      const cleanedDomain = validateAndCleanDomain(domain);
      if (!cleanedDomain) {
        console.warn('Invalid domain format, cannot save to cache:', domain);
        return;
      }
      
      const expire = Date.now() + ((expireHours || CONFIG.cacheExpireHours) * 60 * 60 * 1000);
      localStorage.setItem(CONFIG.cacheKey, cleanedDomain);
      localStorage.setItem(CONFIG.cacheExpireKey, expire.toString());
    } catch (e) {
      console.warn('Failed to save local cache:', e);
    }
  }

  // 从数据库获取缓存的域名
  async function getCachedDomainFromDatabase() {
    // 尝试从配置的域名列表中按顺序测试，找到第一个可用的来获取缓存
    for (const domain of API_DOMAIN_LIST) {
      try {
        const response = await fetch(domain + '/api/v1/guest/comm/api-domain-cache', {
          method: 'GET',
          cache: 'no-cache',
          mode: 'cors'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.domain) {
            // 验证并清理从数据库获取的域名
            const cleanedDomain = validateAndCleanDomain(data.data.domain);
            if (cleanedDomain) {
              return cleanedDomain;
            }
          }
        }
      } catch (error) {
        // 继续尝试下一个域名
        continue;
      }
    }
    
    return null;
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
  
  // 验证并清理域名格式（确保是单个有效域名）
  function validateAndCleanDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return null;
    }
    
    // 移除首尾空格
    domain = domain.trim();
    
    // 如果包含逗号，说明可能是整个列表，只取第一个
    if (domain.includes(',')) {
      domain = domain.split(',')[0].trim();
    }
    
    // 确保是有效的 HTTP/HTTPS URL
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      return null;
    }
    
    // 移除尾部斜杠
    domain = domain.replace(/\/+$/, '');
    
    return domain;
  }
  
  // 测试域名可用性
  async function testDomain(domain) {
    try {
      // 验证并清理域名，确保是有效的绝对 URL
      const cleanedDomain = validateAndCleanDomain(domain);
      if (!cleanedDomain) {
        console.warn('Invalid domain format for testing:', domain);
        return false;
      }
      
      // 使用 guest 配置接口测试（不需要认证）
      // 使用绝对 URL，不依赖全局 routerBase 配置
      // 添加时间戳参数避免浏览器缓存
      const testUrl = cleanedDomain + '/api/v1/guest/comm/config?t=' + Date.now();
      
      // 使用 AbortController 实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'cors',
        credentials: 'omit'
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
        console.log('Domain test failed for ' + cleanedDomain + ': HTTP ' + response.status);
      }
      
      return isAvailable;
    } catch (error) {
      // 区分不同类型的错误
      if (error.name === 'AbortError') {
        console.warn('Domain test timeout for ' + domain + ': Request exceeded ' + CONFIG.timeout + 'ms timeout');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn('Domain test failed for ' + domain + ': Network error or CORS issue');
      } else {
        console.warn('Domain test failed for ' + domain + ':', error.message || error);
      }
      // 网络错误、超时等都返回 false
      return false;
    }
  }
  
  // 查找可用域名（从配置的域名列表中按顺序测试）
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
    
    // 3. 从配置的域名列表中按顺序测试
    console.log('Testing domains from API_DOMAIN list:', API_DOMAIN_LIST);
    for (const domain of API_DOMAIN_LIST) {
      console.log('Testing domain:', domain);
      if (await testDomain(domain)) {
        console.log('Found available domain:', domain);
        // 保存到localStorage和数据库
        saveDomainToLocalCache(domain);
        await saveDomainToDatabase(domain);
        return domain;
      }
    }
    
    console.error('No available domain found in API_DOMAIN list');
    return null;
  }
  
  // 切换 API 域名
  function switchApiDomain(newDomain) {
    // 验证并清理域名，确保是单个有效域名
    const cleanedDomain = validateAndCleanDomain(newDomain);
    if (!cleanedDomain) {
      console.error('Invalid domain format:', newDomain);
      return;
    }
    
    const baseUrl = cleanedDomain + '/';
    
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
    if (API_DOMAIN_LIST.length === 0 || !API_DOMAIN_LIST[0].startsWith('http')) {
      console.log('API domain is relative path or empty, skip domain initialization');
      return;
    }
    
    console.log('Initializing API domain...');
    console.log('API_DOMAIN list:', API_DOMAIN_LIST);
    
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
            console.warn('Cached domain is no longer available, will re-test');
            // 清除缓存，但不立即切换（避免在初始化时多次切换）
            localStorage.removeItem(CONFIG.cacheKey);
            localStorage.removeItem(CONFIG.cacheExpireKey);
            // 触发重新查找可用域名（异步，不阻塞初始化）
            findAvailableDomain().then(domain => {
              if (domain) {
                console.log('Found alternative domain:', domain);
                switchApiDomain(domain);
                saveDomainToLocalCache(domain);
                saveDomainToDatabase(domain).catch(err => {
                  console.warn('Failed to save domain to database:', err);
                });
              }
            }).catch(err => {
              console.warn('Failed to find alternative domain:', err);
            });
          }
        }).catch(err => {
          console.warn('Failed to verify cached domain:', err);
        });
        
        return; // 立即返回，不等待测试
      }
      
      // 2. 从配置的域名列表中按顺序测试，找到第一个可用的
      console.log('Testing domains from API_DOMAIN list...');
      let availableDomain = null;
      
      for (const domain of API_DOMAIN_LIST) {
        console.log('Testing domain:', domain);
        // 使用绝对 URL 测试，不依赖全局 routerBase
        if (await testDomain(domain)) {
          console.log('Found available domain:', domain);
          availableDomain = domain;
          break; // 找到可用域名后立即退出循环
        } else {
          console.log('Domain not available:', domain);
        }
      }
      
      if (availableDomain) {
        // 只有找到可用域名才切换
        switchApiDomain(availableDomain);
        // 保存到localStorage和数据库
        saveDomainToLocalCache(availableDomain);
        await saveDomainToDatabase(availableDomain);
      } else {
        console.warn('No available domain found in API_DOMAIN list');
        // 不切换到不可用的域名，保持使用原始配置
      }
      
    } catch (error) {
      console.error('Failed to initialize domain:', error);
      // 初始化失败不影响页面功能，继续使用当前域名
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



