<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\NodeResource;
use App\Models\User;
use App\Services\ServerService;
use App\Services\UserService;
use Illuminate\Http\Request;

class ServerController extends Controller
{
    public function fetch(Request $request)
    {
        $user = User::find($request->user()->id);
        $servers = [];
        $userService = new UserService();
        if ($userService->isAvailable($user)) {
            $servers = ServerService::getAvailableServers($user);
        }
        $eTag = sha1(json_encode(array_column($servers, 'cache_key')));
        if (strpos($request->header('If-None-Match', ''), $eTag) !== false ) {
            return response(null,304);
        }
        $data = NodeResource::collection($servers);
        return response([
            'data' => $data
        ])->header('ETag', "\"{$eTag}\"");
    }

    /**
     * 根据分组ID获取节点列表
     */
    public function fetchByGroup(Request $request)
    {
        $groupId = $request->input('group_id');
        
        if (!$groupId) {
            return $this->fail([400, '分组ID不能为空']);
        }

        // $user = User::find($request->user()->id);
        $servers = [];
            $servers = ServerService::getServersByGroup((int) $groupId);
        
        $eTag = sha1(json_encode(array_column($servers, 'cache_key')));
        if (strpos($request->header('If-None-Match', ''), $eTag) !== false ) {
            return response(null, 304);
        }
        
        $data = NodeResource::collection($servers);
        return response([
            'data' => $data
        ])->header('ETag', "\"{$eTag}\"");
    }
}
