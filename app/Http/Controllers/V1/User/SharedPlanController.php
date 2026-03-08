<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\PlanSlot;
use App\Services\SharedSubscribeLinkService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * 用户共享套餐控制器（V1 API）
 * 独立于V2管理员API，避免混淆
 */
class SharedPlanController extends Controller
{
    private const MOBILE_UNLIMITED_TRANSFER_GB = 2147483647;

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
                ->with('group')
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
                $transferEnableGb = null;
                if ($plan->total_traffic !== null) {
                    $transferEnableGb = (int) floor(((int) $plan->total_traffic) / 1024 / 1024 / 1024);
                }

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'group_id' => $plan->group_id,
                    'tags' => $plan->tags,
                    'prices' => $plan->prices,
                    'subscription_format' => $plan->subscription_format,
                    'nodes_count' => $plan->nodes_count,
                    'nodes_config' => $plan->nodes_config,
                    'pricing_tiers' => $plan->getActivePricingTiers(),
                    // For MaClash UI compatibility: show GB, and use Integer.MAX_VALUE as "unlimited" sentinel.
                    'transfer_enable' => $transferEnableGb === null ? self::MOBILE_UNLIMITED_TRANSFER_GB : $transferEnableGb,
                    'max_slots' => $plan->max_slots,
                    'used_slots' => $plan->used_slots,
                    'available_slots' => $plan->getAvailableSlotsCount(),
                    // Optional traffic fields for Mine page consistency
                    'total_traffic' => $plan->total_traffic,
                    'used_traffic' => $plan->used_traffic,
                    'remaining_traffic' => $plan->getRemainingTraffic(),
                    'expire_at' => $plan->expire_at?->toIso8601String(),
                    'last_sync_at' => $plan->last_sync_at?->toIso8601String(),
                    'sync_status' => $plan->sync_status,
                    'created_at' => $plan->created_at->toIso8601String(),
                    'group' => $plan->group ? [
                        'id' => $plan->group->id,
                        'name' => $plan->group->name,
                    ] : null,
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
            $linkService = app(SharedSubscribeLinkService::class);
            // 获取用户的所有slot
            $slots = PlanSlot::where('user_id', $user->id)
                ->with(['sharedPlan.group'])
                ->orderBy('created_at', 'desc')
                ->get();

            // 只返回一个活跃的共享订阅（与传统订阅对齐）
            $activeSlot = $slots->where('status', PlanSlot::STATUS_ACTIVE)->first();
            
            if (!$activeSlot) {
                return $this->success([
                    'data' => [],
                    'total' => 0,
                ]);
            }

            $plan = $activeSlot->sharedPlan;
            $subscriptionContentUrl = $activeSlot->getSubscriptionUrl();
            $thirdPartySubscribeUrl = (string) ($plan?->subscription_url ?? '');
            $transferEnableGb = null;
            if ($plan && $plan->total_traffic !== null) {
                $transferEnableGb = (int) floor(((int) $plan->total_traffic) / 1024 / 1024 / 1024);
            }

            $data = [[
                'slot' => [
                    'id' => $activeSlot->id,
                    'status' => $activeSlot->status,
                    'allocated_at' => $activeSlot->allocated_at->toIso8601String(),
                    'expire_at' => $activeSlot->expire_at->toIso8601String(),
                ],
                'plan' => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'group_id' => $plan->group_id,
                    'tags' => $plan->tags,
                    'prices' => $plan->prices,
                    'subscription_format' => $plan->subscription_format,
                    'nodes_count' => $plan->nodes_count,
                    'nodes_config' => $plan->nodes_config, // Add parsed nodes list
                    'pricing_tiers' => $plan->getActivePricingTiers(),
                    // For MaClash UI compatibility
                    'transfer_enable' => $transferEnableGb === null ? self::MOBILE_UNLIMITED_TRANSFER_GB : $transferEnableGb,
                    'total_traffic' => $plan->total_traffic,
                    'used_traffic' => $plan->used_traffic,
                    'remaining_traffic' => $plan->getRemainingTraffic(),
                    'group' => $plan->group ? [
                        'id' => $plan->group->id,
                        'name' => $plan->group->name,
                    ] : null,
                ],
                'subscription_url' => $linkService->buildToken([
                    'subscribe_url' => $thirdPartySubscribeUrl !== '' ? $thirdPartySubscribeUrl : $subscriptionContentUrl,
                    'shared_plan_id' => (int) $activeSlot->shared_plan_id,
                    'slot_id' => (int) $activeSlot->id,
                    'user_id' => $user->id,
                    'email' => (string) ($user->email ?? ''),
                    'expire_at' => $activeSlot->expire_at ? $activeSlot->expire_at->getTimestamp() : null,
                ]),
            ]];

            return $this->success([
                'data' => $data,
                'total' => 1, // 只返回一个活跃订阅
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