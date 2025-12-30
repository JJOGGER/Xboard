<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RestrictApiDomain
{
    /**
     * Handle an incoming request.
     * 
     * 限制 API 域名只能访问 API 路径，其他路径返回 404
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $path = $request->getPathInfo();
        $requestHost = $request->getHost();
        $isV2bxApi = str_starts_with($path, '/api/v1/server/UniProxy/');
        
        // 判断应该使用哪个API域名
        if ($isV2bxApi) {
            // V2bX相关接口：优先使用V2BX_API_DOMAIN，如果没有配置则使用API_DOMAIN
            $v2bxApiDomain = config('app.v2bx_api_domain');
            $apiDomain = $v2bxApiDomain ?: config('app.api_domain');
        } else {
            // 其他接口：使用API_DOMAIN
            $apiDomain = config('app.api_domain');
        }
        
        // 如果配置了 API 域名
        if ($apiDomain) {
            // 解析 API 域名（去除协议）
            $apiHost = parse_url($apiDomain, PHP_URL_HOST);
            
            if ($apiHost) {
                // 如果当前请求的域名是 API 域名
                if ($requestHost === $apiHost) {
                    // 检查路径是否以 /api/ 开头
                    // 如果不是 API 路径，返回 404
                    if (!str_starts_with($path, '/api/')) {
                        abort(404, 'Not Found');
                    }
                }
                // 注意：这里不强制要求请求必须来自API域名
                // 如果需要在nginx层面强制，可以在nginx配置中处理
            }
        }
        
        return $next($request);
    }
}

