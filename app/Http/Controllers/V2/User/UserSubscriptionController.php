<?php

namespace App\Http\Controllers\V2\User;

use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\PlanSlot;
use App\Models\Order;
use App\Services\SharedSubscribeLinkService;
use App\Services\SubscriptionImportService;
use App\Services\SubscriptionParserService;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 用户订阅控制器
 * 
 * 处理用户购买共享套餐和访问订阅内容的请求
 */
class UserSubscriptionController extends Controller
{
    private SubscriptionImportService $importService;
    private SubscriptionParserService $parserService;

    public function __construct(
        SubscriptionImportService $importService,
        SubscriptionParserService $parserService
    ) {
        $this->importService = $importService;
        $this->parserService = $parserService;
    }

    /**
     * 9.1 获取可用套餐列表
     * GET /api/v2/{secure_path}/user/shared-plans
     * 
     * Requirements: 4.1, 4.2
     */
    public function index(Request $request): JsonResponse
    {
        return $this->getAvailablePlans($request);
    }

    /**
     * 获取可用套餐列表（别名方法）
     * GET /api/v1/user/shared-plans
     */
    public function getAvailablePlans(Request $request): JsonResponse
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
                    'total_traffic' => $plan->total_traffic,
                    'used_traffic' => $plan->used_traffic,
                    'remaining_traffic' => $plan->getRemainingTraffic(),
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
     * 9.2 购买套餐
     * POST /api/v2/{secure_path}/user/shared-plans/{id}/purchase
     * 
     * Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 2.5, 9.3, 9.4, 9.5, 9.8
     */
    public function purchase(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            // Validate request
            $validated = $request->validate([
                'period' => 'nullable|string|in:monthly,quarterly,half_yearly,yearly,two_yearly,three_yearly',
            ]);

            // 查找套餐
            $plan = SharedPlan::find($id);

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            // 检查套餐是否可见
            if (!$plan->is_visible) {
                return $this->fail([400, '该套餐暂不可购买']);
            }

            // 检查套餐是否已满
            if ($this->importService->isPlanFull($id)) {
                return $this->fail([400, '该套餐已满，请选择其他套餐']);
            }

            // Determine price and duration based on selected period
            $period = $validated['period'] ?? null;
            $price = null;
            $durationDays = null;

            // Use new prices structure if available
            if ($plan->prices && is_array($plan->prices) && count($plan->prices) > 0) {
                if ($period && isset($plan->prices[$period])) {
                    $price = $plan->prices[$period];
                    $durationDays = $this->getPeriodDays($period);
                } else {
                    // If no period specified, use the first available price
                    $firstPeriod = array_key_first($plan->prices);
                    $price = $plan->prices[$firstPeriod];
                    $durationDays = $this->getPeriodDays($firstPeriod);
                }
            }

            if ($price === null || $price <= 0) {
                return $this->fail([400, '套餐价格无效']);
            }

            // 检查用户余额是否足够
            if ($user->balance < $price) {
                return $this->fail([400, '余额不足，请先充值']);
            }

            // 检查用户是否已经购买过此套餐
            $existingSlot = PlanSlot::where('shared_plan_id', $id)
                ->where('user_id', $user->id)
                ->where('status', PlanSlot::STATUS_ACTIVE)
                ->first();

            if ($existingSlot) {
                return $this->fail([400, '您已经购买过此套餐']);
            }

            // 限制用户只能有一个活跃的共享订阅
            // 将用户现有的所有活跃共享订阅设为过期
            PlanSlot::where('user_id', $user->id)
                ->where('status', PlanSlot::STATUS_ACTIVE)
                ->whereNotNull('shared_plan_id')
                ->update([
                    'status' => PlanSlot::STATUS_EXPIRED,
                    'expired_at' => now(),
                ]);

            // 创建订单并分配slot
            DB::beginTransaction();

            try {
                // 创建订单
                $order = new Order();
                $order->user_id = $user->id;
                $order->plan_id = null; // 共享套餐没有关联到普通plan
                $order->type = Order::TYPE_NEW_PURCHASE;
                $order->period = $durationDays > 0 ? $durationDays . 'd' : 'onetime';
                $order->trade_no = Helper::guid();
                $order->total_amount = $price;
                $order->status = Order::STATUS_COMPLETED; // 直接完成
                $order->paid_at = now();
                $order->save();

                // 扣除用户余额
                $user->balance -= $price;
                
                // Requirement 2.5, 9.4: Assign group_id to user on purchase
                if ($plan->group_id) {
                    $user->group_id = $plan->group_id;
                }
                
                $user->save();

                // 分配slot with calculated expiration
                // Pass durationDays to allocateSlot so it can set the correct expiration
                $slot = $this->importService->allocateSlot($id, $user->id, $order->id, $durationDays);
                
                $slot->save();

                DB::commit();

                Log::info('User purchased shared plan', [
                    'user_id' => $user->id,
                    'plan_id' => $id,
                    'order_id' => $order->id,
                    'slot_id' => $slot->id,
                    'period' => $period,
                    'price' => $price,
                    'duration_days' => $durationDays,
                    'group_id' => $plan->group_id,
                ]);

                return $this->success([
                    'message' => '购买成功',
                    'order_id' => $order->id,
                    'slot_id' => $slot->id,
                    'subscription_token' => $slot->subscription_token,
                    'subscription_url' => $slot->getSubscriptionUrl(),
                    'subscription_url_offline' => app(SharedSubscribeLinkService::class)->buildToken([
                        'subscribe_url' => $plan->subscription_url,
                        'user_id' => $user->id,
                        'email' => (string) ($user->email ?? ''),
                        'expire_at' => $slot->expire_at ? $slot->expire_at->getTimestamp() : null,
                    ]),
                    'expire_at' => $slot->expire_at?->toIso8601String(),
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Failed to purchase shared plan', [
                'user_id' => $request->user()->id ?? null,
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '购买失败: ' . $e->getMessage()]);
        }
    }

    /**
     * Get period duration in days
     * 
     * @param string $period
     * @return int
     */
    private function getPeriodDays(string $period): int
    {
        return match ($period) {
            'monthly' => 30,
            'quarterly' => 90,
            'half_yearly' => 180,
            'yearly' => 365,
            'two_yearly' => 730,
            'three_yearly' => 1095,
            'onetime' => -1,
            default => 30,
        };
    }

    /**
     * 9.4 获取用户订阅内容
     * GET /api/user/subscribe/{token}
     * 
     * Requirements: 5.2, 5.3, 5.4, 5.5
     */
    public function getSubscription(Request $request, string $token): Response
    {
        try {
            // 查找slot
            $slot = PlanSlot::where('subscription_token', $token)->first();

            if (!$slot) {
                return response('Subscription not found', 404);
            }

            // 检查slot是否活跃
            if (!$slot->isActive()) {
                // 9.8 过期订阅错误处理
                if ($slot->isExpired()) {
                    return response('Subscription expired', 403);
                }
                return response('Subscription not active', 403);
            }

            // 获取共享套餐
            $plan = $slot->sharedPlan;

            if (!$plan) {
                return response('Plan not found', 404);
            }

            // 9.8 检查上游订阅是否过期或流量耗尽
            if ($plan->isExpired()) {
                return response('Upstream subscription expired', 403);
            }

            if ($plan->isTrafficExhausted()) {
                return response('Upstream subscription traffic exhausted', 403);
            }

            // 获取节点配置
            $nodes = $plan->nodes_config;

            if (empty($nodes)) {
                return response('No nodes available', 404);
            }

            // 检测请求的格式（通过User-Agent或查询参数）
            $targetFormat = $this->detectTargetFormat($request, $plan->subscription_format);

            // 转换格式
            try {
                $content = $this->parserService->convertFormat($nodes, $targetFormat);
            } catch (\Exception $e) {
                Log::warning('Failed to convert subscription format', [
                    'slot_id' => $slot->id,
                    'target_format' => $targetFormat,
                    'error' => $e->getMessage(),
                ]);
                // 如果转换失败，返回原始格式
                $content = $this->parserService->convertFormat($nodes, $plan->subscription_format);
            }

            // 构建响应
            $response = response($content, 200);

            // 设置Content-Type
            $contentType = $this->getContentType($targetFormat);
            $response->header('Content-Type', $contentType);

            // 添加流量信息到响应头
            if ($plan->total_traffic !== null && $plan->used_traffic !== null) {
                $trafficHeader = sprintf(
                    'upload=%d; download=%d; total=%d',
                    0, // 共享订阅不区分上传下载
                    $plan->used_traffic,
                    $plan->total_traffic
                );

                if ($plan->expire_at) {
                    $trafficHeader .= sprintf('; expire=%d', $plan->expire_at->timestamp);
                }

                $response->header('Subscription-Userinfo', $trafficHeader);
                $response->header('Content-Disposition', 'attachment; filename="subscription.txt"');
            }

            // 记录访问日志
            Log::info('User accessed subscription', [
                'slot_id' => $slot->id,
                'user_id' => $slot->user_id,
                'plan_id' => $plan->id,
                'format' => $targetFormat,
            ]);

            return $response;
        } catch (\Exception $e) {
            Log::error('Failed to get subscription content', [
                'token' => substr($token, 0, 8) . '...',
                'error' => $e->getMessage(),
            ]);
            return response('Internal server error', 500);
        }
    }

    /**
     * 检测目标格式
     * 
     * @param Request $request
     * @param string $defaultFormat
     * @return string
     */
    private function detectTargetFormat(Request $request, string $defaultFormat): string
    {
        // 1. 检查查询参数
        if ($request->has('format')) {
            $format = strtolower($request->input('format'));
            if (SharedPlan::isValidFormat($format)) {
                return $format;
            }
        }

        // 2. 检查User-Agent
        $userAgent = strtolower($request->userAgent() ?? '');
        
        if (str_contains($userAgent, 'clash')) {
            return SharedPlan::FORMAT_CLASH;
        }
        
        if (str_contains($userAgent, 'v2ray') || str_contains($userAgent, 'v2rayn')) {
            return SharedPlan::FORMAT_V2RAY;
        }
        
        if (str_contains($userAgent, 'shadowsocks') || str_contains($userAgent, 'ss')) {
            return SharedPlan::FORMAT_SHADOWSOCKS;
        }

        // 3. 返回默认格式
        return $defaultFormat;
    }

    /**
     * 获取Content-Type
     * 
     * @param string $format
     * @return string
     */
    private function getContentType(string $format): string
    {
        return match ($format) {
            SharedPlan::FORMAT_CLASH => 'text/yaml; charset=utf-8',
            SharedPlan::FORMAT_V2RAY => 'application/json; charset=utf-8',
            default => 'text/plain; charset=utf-8',
        };
    }

    /**
     * 获取用户的订阅列表
     * GET /api/v1/user/shared-plans/subscriptions
     */
    public function mySubscriptions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $linkService = app(SharedSubscribeLinkService::class);

            // 获取用户的所有slot
            $slots = PlanSlot::where('user_id', $user->id)
                ->with('sharedPlan')
                ->orderBy('created_at', 'desc')
                ->get();

            $data = $slots->map(function ($slot) use ($user, $linkService) {
                $plan = $slot->sharedPlan;
                $subscriptionContentUrl = $slot->getSubscriptionUrl();
                
                return [
                    'slot_id' => $slot->id,
                    'subscription_token' => $slot->subscription_token,
                    'status' => $slot->status,
                    'allocated_at' => $slot->allocated_at?->toIso8601String(),
                    'expire_at' => $slot->expire_at?->toIso8601String(),
                    'released_at' => $slot->released_at?->toIso8601String(),
                    'shared_plan_id' => $slot->shared_plan_id,
                    'shared_plan_name' => $slot->sharedPlan?->name,
                    'shared_plan_description' => $slot->sharedPlan?->description,
                    'subscription_url' => $subscriptionContentUrl,
                    'subscription_content_url' => $subscriptionContentUrl,
                    'subscription_url_offline' => $linkService->buildToken([
                        'subscribe_url' => (string) ($slot->sharedPlan?->subscription_url ?? $subscriptionContentUrl),
                        'user_id' => $user->id,
                        'email' => (string) ($user->email ?? ''),
                        'expire_at' => $slot->expire_at ? $slot->expire_at->getTimestamp() : null,
                    ]),
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
