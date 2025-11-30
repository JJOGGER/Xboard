<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    public function fetch(Request $request)
    {
        $current = $request->input('current') ? $request->input('current') : 1;
        $pageSize = 5;
        $category = $request->input('category'); // 分类参数，如 'site', 'app' 等
        
        $model = Notice::orderBy('sort', 'ASC')
            ->orderBy('id', 'DESC')
            ->where('show', true);
        
        // 如果指定了分类参数，按分类过滤
        if ($category !== null && $category !== '') {
            $model->where(function ($query) use ($category) {
                // 支持 JSON 数组格式查询
                if (config('database.default') === 'mysql') {
                    $query->whereJsonContains('tags', $category);
                }
                // 兼容字符串格式的 JSON
                $query->orWhere('tags', 'like', '%"' . $category . '"%');
            });
        } else {
            // 默认排除 site 分类
            $model->where(function ($query) {
                $query->where(function ($q) {
                    // tags 为空或 null
                    $q->whereNull('tags')
                      ->orWhere('tags', '[]')
                      ->orWhere('tags', '');
                })->orWhere(function ($q) {
                    // tags 不为空但不包含 site
                    if (config('database.default') === 'mysql') {
                        $q->whereJsonDoesntContain('tags', 'site');
                    }
                    $q->where('tags', 'not like', '%"site"%');
                });
            });
        }
        
        $total = $model->count();
        $res = $model->forPage($current, $pageSize)
            ->get();
        return response([
            'data' => $res,
            'total' => $total
        ]);
    }
}
