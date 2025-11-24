<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureJsonPayloadIsArray
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->isJson()) {
            $content = $request->getContent();
            if ($content !== '') {
                $decoded = json_decode($content, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $request->merge($decoded);
                }
            }
        }
        return $next($request);
    }
}


