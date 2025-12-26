<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Services\Plugin\HookManager;
use App\Utils\Dict;
use App\Utils\Helper;
use Illuminate\Support\Facades\Http;

class CommController extends Controller
{
    public function config()
    {
        $data = [
            'tos_url' => admin_setting('tos_url'),
            'is_email_verify' => (int) admin_setting('email_verify', 0) ? 1 : 0,
            'is_invite_force' => (int) admin_setting('invite_force', 0) ? 1 : 0,
            'email_whitelist_suffix' => (int) admin_setting('email_whitelist_enable', 0)
                ? Helper::getEmailSuffix()
                : 0,
            'is_captcha' => (int) admin_setting('captcha_enable', 0) ? 1 : 0,
            'captcha_type' => admin_setting('captcha_type', 'recaptcha'),
            'recaptcha_site_key' => admin_setting('recaptcha_site_key'),
            'recaptcha_v3_site_key' => admin_setting('recaptcha_v3_site_key'),
            'recaptcha_v3_score_threshold' => admin_setting('recaptcha_v3_score_threshold', 0.5),
            'turnstile_site_key' => admin_setting('turnstile_site_key'),
            'app_description' => admin_setting('app_description'),
            'app_url' => admin_setting('app_url'),
            'logo' => admin_setting('logo'),
            // 保持向后兼容
            'is_recaptcha' => (int) admin_setting('captcha_enable', 0) ? 1 : 0,
        ];

        // 容灾支持：返回前端域名配置
        // 客户端可以通过此配置自动发现和切换到新的前端域名
        $frontendDomain = config('app.frontend_domain');
        $frontendDomainBackup = config('app.frontend_domain_backup');
        
        if ($frontendDomain) {
            $data['frontend_domain_primary'] = $frontendDomain;
            $data['frontend_domains'] = [$frontendDomain];
            
            // 添加备用域名
            if ($frontendDomainBackup) {
                $backupDomains = is_array($frontendDomainBackup) 
                    ? $frontendDomainBackup 
                    : explode(',', $frontendDomainBackup);
                $backupDomains = array_map('trim', $backupDomains);
                $data['frontend_domains'] = array_merge($data['frontend_domains'], $backupDomains);
            }
        }

        $data = HookManager::filter('guest_comm_config', $data);

        return $this->success($data);
    }

    /**
     * 获取缓存的可用API域名
     */
    public function getCachedApiDomain(\Illuminate\Http\Request $request)
    {
        // 处理 OPTIONS 预检请求
        if ($request->method() === 'OPTIONS') {
            return response('', 204)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                ->header('Access-Control-Max-Age', '3600');
        }

        $cachedDomain = admin_setting('api_domain_cache', null);
        $cacheTime = admin_setting('api_domain_cache_time', null);

        // 检查缓存是否过期（24小时）
        if ($cachedDomain && $cacheTime) {
            $expireTime = 24 * 60 * 60; // 24小时
            if (time() - intval($cacheTime) < $expireTime) {
                return $this->success([
                    'domain' => $cachedDomain,
                    'cached_at' => intval($cacheTime)
                ]);
            }
        }

        return $this->success([
            'domain' => null,
            'cached_at' => null
        ]);
    }

    /**
     * 保存缓存的可用API域名
     */
    public function saveCachedApiDomain(\Illuminate\Http\Request $request)
    {
        // 处理 OPTIONS 预检请求
        if ($request->method() === 'OPTIONS') {
            return response('', 204)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                ->header('Access-Control-Max-Age', '3600');
        }

        $request->validate([
            'domain' => 'required|string|url'
        ]);

        $domain = rtrim($request->input('domain'), '/');
        
        admin_setting([
            'api_domain_cache' => $domain,
            'api_domain_cache_time' => time()
        ]);

        return $this->success([
            'message' => 'API domain cached successfully',
            'domain' => $domain
        ]);
    }

    /**
     * 获取API域名列表（用于故障转移）
     * 返回格式与静态api.json文件相同
     * 
     * 注意：如果存在 /public/api/api.json 静态文件，会优先返回该文件内容
     * 否则返回配置的域名列表
     */
    public function getApiDomainList(\Illuminate\Http\Request $request)
    {
        // 处理 OPTIONS 预检请求
        if ($request->method() === 'OPTIONS') {
            return response('', 204)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type')
                ->header('Access-Control-Max-Age', '3600');
        }

        // 优先检查是否存在静态文件
        $staticFile = public_path('api/api.json');
        if (file_exists($staticFile)) {
            $content = file_get_contents($staticFile);
            $data = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE && $data) {
                // 返回静态文件内容，Laravel CORS中间件会自动添加CORS头
                return response()->json($data, 200, [
                    'Content-Type' => 'application/json; charset=utf-8',
                ]);
            }
        }
        
        // 如果没有静态文件，从配置中获取域名列表
        $apiDomain = config('app.api_domain');
        $mainDomain = $apiDomain ? rtrim($apiDomain, '/') : null;
        
        // 可以从配置中读取备用域名列表
        // 格式示例：domain数组可以是字符串数组，也可以是包含逗号分隔字符串的数组
        $domains = [];
        if ($mainDomain) {
            // 如果配置了备用域名，可以从环境变量或数据库读取
            // 这里暂时只返回主域名
            $domains = [$mainDomain];
        }
        
        $data = [
            'main_domain' => $mainDomain,
            'domain' => $domains,
            'update' => 24 // 更新间隔（小时）
        ];
        
        // Laravel CORS中间件会自动添加CORS响应头
        return response()->json($data, 200, [
            'Content-Type' => 'application/json; charset=utf-8',
        ]);
    }
}
