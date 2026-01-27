<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\PlanSlot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * 用户共享套餐控制器（V1 API）
 * 独立于V2管理员API，避免混淆
 */
class SharedPlanController extends Controller
{
    /**
     * 获取可用的共享套餐列表
     * GET /api/v1/user/shared-plans
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // 只返回可见的套餐
            $query = SharedPlan::where('is_visible', true)
                ->where('sync_status', SharedPlan::SYNC_STATUS_ACTIVE)
                ->orderBy('created_at', 'desc');

            // 搜索：按名称
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // 筛选：按格式
            if ($request->has('format')) {
                $query->where('subscription_format', $request->input('format'));
            }

            // 分页
            $perPage = $request->input('per_page', 15);
            $perPage = min($perPage, 50); // 最多50条
            
            $plans = $query->paginate($perPage);

            // 格式化返回数据
            $data = $plans->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'subscription_format' => $plan->subscription_format,
                    'nodes_count' => $plan->nodes_count,
                    'pricing_tiers' => $plan->getActivePricingTiers(),
                    'max_slots' => $plan->max_slots,
                    'used_slots' => $plan->used_slots,
                    'available_slots' => $plan->getAvailableSlotsCount(),
                    'expire_at' => $plan->expire_at?->toIso8601String(),
                    'created_at' => $plan->created_at->toIso8601String(),
                ];
            });

            return $this->success([
                'data' => $data,
                'total' => $plans->total(),
                'per_page' => $plans->perPage(),
                'current_page' => $plans->currentPage(),
                'last_page' => $plans->lastPage(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch shared plans for user', [
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '获取套餐列表失败']);
        }
    }

    /**
     * 获取用户的共享套餐订阅列表
     * GET /api/v1/user/shared-plans/subscriptions
     */
    public function subscriptions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // 获取用户的所有slot
            $slots = PlanSlot::where('user_id', $user->id)
                ->with('sharedPlan')
                ->orderBy('created_at', 'desc')
                ->get();

            $data = $slots->map(function ($slot) {
                $plan = $slot->sharedPlan;
                
                return [
                    'slot' => [
                        'id' => $slot->id,
                        'status' => $slot->status,
                        'allocated_at' => $slot->allocated_at->toIso8601String(),
                        'expire_at' => $slot->expire_at->toIso8601String(),
                    ],
                    'plan' => [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'subscription_format' => $plan->subscription_format,
                        'nodes_count' => $plan->nodes_count,
                        'nodes_config' => $plan->nodes_config, // Add parsed nodes list
                        // 不显示流量信息，因为是共享的
                    ],
                    'subscription_url' => $slot->getSubscriptionUrl(),
                ];
            });

            return $this->success([
                'data' => $data,
                'total' => $slots->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch user subscriptions', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '获取订阅列表失败']);
        }
    }
}