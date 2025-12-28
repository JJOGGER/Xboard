<!doctype html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no" />
  <title>{{$title}}</title>
  <style>
    #domain-checker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    #domain-checker-overlay.hidden {
      display: none;
    }
    
    .checker-container {
      text-align: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 90%;
    }
    
    .checker-logo {
      font-size: 48px;
      margin-bottom: 20px;
    }
    
    .checker-title {
      font-size: 24px;
      margin-bottom: 30px;
      font-weight: 500;
    }
    
    .checker-status {
      font-size: 16px;
      margin-bottom: 20px;
      min-height: 24px;
    }
    
    .progress-container {
      margin: 30px 0;
    }
    
    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    
    .progress-fill {
      height: 100%;
      background: #fff;
      border-radius: 3px;
      transition: width 0.3s ease;
      width: 0%;
    }
    
    .domain-list {
      text-align: left;
      margin-top: 30px;
      font-size: 14px;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .domain-item {
      padding: 10px;
      margin: 8px 0;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .domain-status {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 10px;
    }
    
    .status-pending {
      background: #ffa500;
      animation: pulse 1.5s infinite;
    }
    
    .status-success {
      background: #4caf50;
    }
    
    .status-failed {
      background: #f44336;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .error-message {
      color: #ffeb3b;
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 235, 59, 0.1);
      border-radius: 8px;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <!-- 域名检测覆盖层 -->
  <div id="domain-checker-overlay">
    <div class="checker-container">
      <div class="checker-logo">🌐</div>
      <h1 class="checker-title">正在检测最佳线路</h1>
      <div class="checker-status" id="checker-status">初始化中...</div>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="checker-progress"></div>
        </div>
        <div id="checker-progress-text">0%</div>
      </div>
      <div class="domain-list" id="checker-domain-list"></div>
      <div class="error-message" id="checker-error" style="display: none;"></div>
    </div>
  </div>

  <script>
    // 域名检测逻辑（在主应用加载前执行）
    (function() {
      'use strict';
      
      const apiDomain = "{{ config('app.api_domain') ? rtrim(config('app.api_domain'), '/') : '/' }}";
      const overlay = document.getElementById('domain-checker-overlay');
      const statusEl = document.getElementById('checker-status');
      const progressEl = document.getElementById('checker-progress');
      const progressTextEl = document.getElementById('checker-progress-text');
      const domainListEl = document.getElementById('checker-domain-list');
      const errorEl = document.getElementById('checker-error');
      
      // 检查是否需要检测（如果有多个域名配置）
      function needsChecking() {
        if (!apiDomain || apiDomain === '/') {
          console.log('不需要检测: API_DOMAIN 为空或为相对路径');
          return false;
        }
        const hasMultiple = apiDomain.includes(',');
        console.log('API_DOMAIN:', apiDomain, '包含多个域名:', hasMultiple);
        return hasMultiple;
      }
      
      // 检查是否有有效的缓存
      function hasValidCache() {
        try {
          const cached = localStorage.getItem('xboard_api_domain');
          const expire = localStorage.getItem('xboard_api_domain_expire');
          
          console.log('检查缓存:', { cached, expire, now: Date.now() });
          
          if (cached && expire && Date.now() < parseInt(expire, 10)) {
            // 验证缓存的域名是否在配置列表中
            const domains = apiDomain.split(',').map(d => d.trim());
            if (domains.includes(cached)) {
              console.log('找到有效缓存:', cached);
              return cached;
            } else {
              console.log('缓存域名不在配置列表中，清除缓存');
              localStorage.removeItem('xboard_api_domain');
              localStorage.removeItem('xboard_api_domain_expire');
            }
          } else {
            console.log('缓存无效或已过期');
          }
        } catch (e) {
          console.error('检查缓存时出错:', e);
        }
        return null;
      }
      
      // 更新状态
      function updateStatus(message) {
        if (statusEl) statusEl.textContent = message;
      }
      
      // 更新进度
      function updateProgress(current, total) {
        const percent = Math.round((current / total) * 100);
        if (progressEl) progressEl.style.width = percent + '%';
        if (progressTextEl) progressTextEl.textContent = percent + '%';
      }
      
      // 更新域名状态
      function updateDomainStatus(domain, status, message) {
        if (!domainListEl) return;
        
        let item = document.getElementById('checker-domain-' + btoa(domain));
        
        if (!item) {
          item = document.createElement('div');
          item.className = 'domain-item';
          item.id = 'checker-domain-' + btoa(domain);
          domainListEl.appendChild(item);
        }
        
        const statusClass = {
          'pending': 'status-pending',
          'success': 'status-success',
          'failed': 'status-failed'
        }[status] || 'status-pending';
        
        item.innerHTML = `
          <div>
            <span class="domain-status ${statusClass}"></span>
            <span>${domain}</span>
          </div>
          <div style="font-size: 12px; opacity: 0.8;">${message || ''}</div>
        `;
      }
      
      // 测试域名
      async function testDomain(domain, timeout = 5000) {
        const testUrl = domain.replace(/\/$/, '') + '/api/v1/guest/comm/config?t=' + Date.now();
        const startTime = Date.now();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(testUrl, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-cache',
            mode: 'cors',
            credentials: 'omit'
          });
          
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          
          if (response.status === 200) {
            return { success: true, elapsed };
          } else {
            return { success: false, error: `HTTP ${response.status}`, elapsed };
          }
        } catch (error) {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          
          if (error.name === 'AbortError') {
            return { success: false, error: '超时', elapsed };
          } else {
            return { success: false, error: '网络错误', elapsed };
          }
        }
      }
      
      // 检测所有域名（并行测试，找到第一个可用的）
      async function checkDomains(domains) {
        updateStatus(`正在检测 ${domains.length} 个域名...`);
        
        // 并行测试所有域名
        const testPromises = domains.map(async (domain, index) => {
          updateDomainStatus(domain, 'pending', '检测中...');
          updateProgress(index, domains.length);
          
          const result = await testDomain(domain, 5000);
          
          if (result.success) {
            updateDomainStatus(domain, 'success', `可用 (${result.elapsed}ms)`);
            return { domain, result };
          } else {
            updateDomainStatus(domain, 'failed', result.error || '不可用');
            return null;
          }
        });
        
        // 等待所有测试完成，找到第一个可用的
        const results = await Promise.all(testPromises);
        const available = results.find(r => r !== null);
        
        updateProgress(domains.length, domains.length);
        
        if (available) {
          updateStatus(`找到可用域名: ${available.domain}`);
          
          // 保存结果
          localStorage.setItem('xboard_api_domain', available.domain);
          localStorage.setItem('xboard_api_domain_expire', (Date.now() + 24 * 60 * 60 * 1000).toString());
          
          // 更新 window.routerBase
          window.routerBase = available.domain + '/';
          if (window.settings) {
            window.settings.base_url = available.domain + '/';
          }
          
          return available.domain;
        } else {
          updateStatus('所有域名都不可用');
          if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = '所有域名都不可用，将使用第一个域名作为后备';
          }
          return domains[0]; // 使用第一个域名作为后备
        }
      }
      
      // 主检测函数
      async function performCheck() {
        console.log('开始执行检测逻辑...');
        console.log('API_DOMAIN 配置:', apiDomain);
        
        // 确保覆盖层可见（如果之前被隐藏了）
        if (overlay) {
          overlay.classList.remove('hidden');
        }
        
        if (!needsChecking()) {
          // 不需要检测，直接隐藏覆盖层
          console.log('不需要检测，隐藏覆盖层');
          if (overlay) overlay.classList.add('hidden');
          return;
        }
        
        // 检查 URL 参数，是否强制重新检测
        const urlParams = new URLSearchParams(window.location.search);
        const forceCheck = urlParams.get('force_check') === '1' || urlParams.get('recheck') === '1';
        
        if (forceCheck) {
          console.log('强制重新检测，清除缓存');
          localStorage.removeItem('xboard_api_domain');
          localStorage.removeItem('xboard_api_domain_expire');
        }
        
        // 检查缓存
        const cached = hasValidCache();
        if (cached && !forceCheck) {
          updateStatus(`使用缓存的域名: ${cached}`);
          window.routerBase = cached + '/';
          if (window.settings) {
            window.settings.base_url = cached + '/';
          }
          
          // 延迟一下让用户看到状态
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          if (overlay) overlay.classList.add('hidden');
          return;
        }
        
        // 需要检测
        const domains = apiDomain.split(',').map(d => d.trim()).filter(d => d.length > 0 && d.startsWith('http'));
        
        console.log('解析的域名列表:', domains);
        
        if (domains.length === 0) {
          console.log('没有有效的域名配置');
          if (overlay) overlay.classList.add('hidden');
          return;
        }
        
        if (domains.length === 1) {
          console.log('只有一个域名，不需要检测');
          window.routerBase = domains[0] + '/';
          if (window.settings) {
            window.settings.base_url = domains[0] + '/';
          }
          if (overlay) overlay.classList.add('hidden');
          return;
        }
        
        // 执行检测
        console.log('开始检测域名...');
        const availableDomain = await checkDomains(domains);
        
        if (availableDomain) {
          // 延迟一下让用户看到结果
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // 隐藏覆盖层，显示主应用
        if (overlay) overlay.classList.add('hidden');
      }
      
      // 确保覆盖层在页面加载时可见
      if (overlay) {
        overlay.classList.remove('hidden');
      }
      
      // 立即执行检测
      performCheck().catch(err => {
        console.error('域名检测失败:', err);
        updateStatus('检测过程出错: ' + err.message);
        // 延迟后隐藏，让用户看到错误信息
        setTimeout(() => {
          if (overlay) overlay.classList.add('hidden');
        }, 2000);
      });
    })();
  </script>

  <script>
    window.routerBase = "{{ config('app.api_domain') ? rtrim(config('app.api_domain'), '/') . '/' : '/' }}";
    window.settings = {
      title: '{{$title}}',
      assets_path: '/theme/{{$theme}}/assets',
      theme: {
        color: '{{ $theme_config['theme_color'] ?? "default" }}',
      },
      version: '{{$version}}',
      background_url: '{{$theme_config['background_url']}}',
      description: '{{$description}}',
      i18n: [
        'zh-CN',
        'en-US',
        'ja-JP',
        'vi-VN',
        'ko-KR',
        'zh-TW',
        'fa-IR'
      ],
      logo: '{{$logo}}',
      backup_api_domain: {!! config('app.backup_api_domain') ? json_encode(rtrim(config('app.backup_api_domain'), '/')) : 'null' !!}
    }
  </script>
  <script src="/assets/api-failover.js"></script>
  <script type="module" crossorigin src="/theme/{{$theme}}/assets/umi.js"></script>
  <div id="app"></div>
  {!! $theme_config['custom_html'] !!}
</body>

</html>