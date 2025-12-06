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
        $apiDomain = config('app.api_domain');
        
        // 如果配置了 API 域名
        if ($apiDomain) {
            // 解析 API 域名（去除协议）
            $apiHost = parse_url($apiDomain, PHP_URL_HOST);
            
            // 如果当前请求的域名是 API 域名
            if ($apiHost && $request->getHost() === $apiHost) {
                // 检查路径是否以 /api/ 开头
                $path = $request->getPathInfo();
                
                // 如果不是 API 路径，返回 404
                if (!str_starts_with($path, '/api/')) {
                    abort(404, 'Not Found');
                }
            }
        }
        
        return $next($request);
    }
}

