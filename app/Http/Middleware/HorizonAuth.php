<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class HorizonAuth
{
    /**
     * 简单的 Token 鉴权中间件，仅用于 Horizon 访问控制
     *
     * 鉴权逻辑：
     * - 从 Authorization: Bearer <token> 或 ?token=<token> 读取访问令牌
     * - 与 .env 中配置的 HORIZON_ACCESS_TOKEN 比较
     * - 不匹配则返回 403
     */
    public function handle(Request $request, Closure $next)
    {
        $expected = env('HORIZON_ACCESS_TOKEN');

        // 如果未配置 token，直接拒绝访问，避免误开放
        if (empty($expected)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 优先从 Bearer Token 读取，其次从 query 参数 token 读取
        $provided = $request->bearerToken() ?: (string) $request->query('token', '');

        if (!hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $next($request);
    }
}


