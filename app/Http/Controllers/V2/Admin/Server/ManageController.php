<?php

namespace App\Http\Controllers\V2\Admin\Server;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServerSave;
use App\Models\Server;
use App\Models\ServerGroup;
use App\Services\ServerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ManageController extends Controller
{
    public function getNodes(Request $request)
    {
        $servers = ServerService::getAllServers()->map(function ($item) {
            $item['groups'] = ServerGroup::whereIn('id', $item['group_ids'])->get(['name', 'id']);
            $item['parent'] = $item->parent;
            return $item;
        });
        return $this->success($servers);
    }

    public function sort(Request $request)
    {
        ini_set('post_max_size', '1m');
        $params = $request->validate([
            '*.id' => 'numeric',
            '*.order' => 'numeric'
        ]);

        try {
            DB::beginTransaction();
            collect($params)->each(function ($item) {
                if (isset($item['id']) && isset($item['order'])) {
                    Server::where('id', $item['id'])->update(['sort' => $item['order']]);
                }
            });
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e);
            return $this->fail([500, '保存失败']);

        }
        return $this->success(true);
    }

    public function save(ServerSave $request)
    {
        $params = $request->validated();
        
        // 处理tags字段：确保格式正确，过滤空值
        if (isset($params['tags'])) {
            if ($params['tags'] === null) {
                $params['tags'] = [];
            } else if (is_array($params['tags'])) {
                // 过滤空值和无效值，重新索引数组
                $params['tags'] = array_values(array_filter($params['tags'], function($tag) {
                    return !empty($tag) && is_string($tag);
                }));
            }
        } else {
            // 如果tags字段未提供，在创建时设置为空数组，更新时保持原值
            if (!$request->input('id')) {
                $params['tags'] = [];
            }
        }
        
        if ($request->input('id')) {
            $server = Server::find($request->input('id'));
            if (!$server) {
                return $this->fail([400202, '服务器不存在']);
            }
            try {
                $server->update($params);
                return $this->success(true);
            } catch (\Exception $e) {
                Log::error($e);
                return $this->fail([500, '保存失败']);
            }
        }

        try {
            Server::create($params);
            return $this->success(true);
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, '创建失败']);
        }


    }

    public function update(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
            'show' => 'integer',
        ]);

        if (!Server::where('id', $request->id)->update(['show' => $request->show])) {
            return $this->fail([500, '保存失败']);
        }
        return $this->success(true);
    }

    /**
     * 删除
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function drop(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
        ]);
        if (Server::where('id', $request->id)->delete() === false) {
            return $this->fail([500, '删除失败']);
        }
        return $this->success(true);
    }


    /**
     * 复制节点
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function copy(Request $request)
    {
        $server = Server::find($request->input('id'));
        $server->show = 0;
        $server->code = null;
        if (!$server) {
            return $this->fail([400202, '服务器不存在']);
        }
        Server::create($server->toArray());
        return $this->success(true);
    }
}
