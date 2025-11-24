<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Http\Resources\NodeResource;
use App\Services\ServerService;
use Illuminate\Http\Request;

class ServerController extends Controller
{
    /**
     * 获取所有显示的服务器列表（游客可访问）
     */
    public function fetch(Request $request)
    {
        $servers = ServerService::getDisplayServers();
        
        $eTag = sha1(json_encode(array_column($servers, 'cache_key')));
        if (strpos($request->header('If-None-Match', ''), $eTag) !== false) {
            return response(null, 304);
        }
        
        $data = NodeResource::collection($servers);
        return response([
            'data' => $data
        ])->header('ETag', "\"{$eTag}\"");
    }
}
