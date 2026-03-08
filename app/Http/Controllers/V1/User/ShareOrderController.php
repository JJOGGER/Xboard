<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\Order;
use App\Models\PlanSlot;
use App\Models\User;
use App\Services\SharedSubscribeLinkService;
use App\Services\Share\ShareOrderService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 共享套餐订单控制器
 * 处理共享套餐的订单创建和支付流程
 */
class ShareOrderController extends Controller
{
    private const MOBILE_UNLIMITED_TRANSFER_GB = 2147483647;

    /**
     * 创建共享套餐订单
     * POST /api/v1/user/share-order/save
     */
    public function save(Request $request)
    {
        $request->validate([
            'shared_plan_id' => 'required|integer|exists:v2_shared_plans,id',
            'period' => 'required|string|in:monthly,quarterly,half_yearly,yearly,two_yearly,three_yearly',
            'coupon_code' => 'nullable|string',
        ]);

        $user = User::findOrFail($request->user()->id);
        $userService = app(UserService::class);

        // 检查是否有未完成的订单
        // 仅检查共享套餐相关的未完成订单，避免被传统套餐订单阻塞
        $pendingOrder = Order::where('user_id', $user->id)
            ->whereIn('status', [0, 1]) // 待支付或处理中
            ->where(function ($query) {
                $query->where('plan_type', 'shared')
                    ->orWhereNotNull('shared_plan_id');
            })
            ->orderBy('created_at', 'desc')
            ->first();
            
        if ($pendingOrder) {
            Log::info('Found pending shared order', [
                'user_id' => $user->id,
                'trade_no' => $pendingOrder->trade_no,
                'status' => $pendingOrder->status,
                'created_at' => $pendingOrder->created_at,
            ]);
            
            return $this->fail(
                [400, __('You have an unpaid or pending order, please try again later or cancel it')],
                [
                    'has_pending_order' => true,
                    'pending_order' => [
                        'trade_no' => $pendingOrder->trade_no,
                        'total_amount' => $pendingOrder->total_amount,
                        'created_at' => $pendingOrder->created_at,
                    ]
                ],
                null
            );
        }

        // 查找共享套餐
        $sharedPlan = SharedPlan::where('id', $request->input('shared_plan_id'))
            ->where('is_visible', true)
            ->where('sync_status', SharedPlan::SYNC_STATUS_ACTIVE)
            ->firstOrFail();

        $period = $request->input('period');

        $order = ShareOrderService::createFromRequest(
            $user,
            $sharedPlan,
            $period,
            $request->input('coupon_code')
        );
        return $this->success($order->trade_no);
    }

    /**
     * 订单支付
     * POST /api/v1/user/share-order/checkout
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
            'method' => 'required|integer',
        ]);

        $tradeNo = $request->input('trade_no');
        $method = $request->input('method');

        $order = Order::where('trade_no', $tradeNo)
            ->where('user_id', $request->user()->id)
            ->where(function ($query) {
                $query->where('plan_type', 'shared')
                    ->orWhereNotNull('shared_plan_id');
            })
            ->where('status', 0)
            ->first();

        if (!$order) {
            Log::warning('Shared plan checkout order not found or not payable', [
                'trade_no' => $tradeNo,
                'user_id' => $request->user()->id,
            ]);

            return $this->fail([400, __('Order does not exist or has been paid')]);
        }

        try {
            $shareOrderService = new ShareOrderService($order);
            $result = $shareOrderService->checkout($method, $request->input('token') ?? null);

            // Keep response format compatible with legacy client checkout response.
            // Legacy clients expect {type, data} (and optionally trade_no) without the standard success wrapper.
            if (is_array($result)) {
                return response($result);
            }
            return response(["type" => 1, "data" => $result]);
        } catch (\Exception $e) {
            Log::error('Payment failed for shared plan order', [
                'trade_no' => $tradeNo,
                'error' => $e->getMessage(),
            ]);
            $errors = null;
            if ($e instanceof ApiException) {
                $errors = $e->errors();
            }
            return $this->fail([400, __('Payment failed: ') . $e->getMessage()], null, $errors);
        }
    }

    /**
     * 检查订单状态
     * GET /api/v1/user/share-order/check
     */
    public function check(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
        ]);

        $order = Order::where('trade_no', $request->input('trade_no'))
            ->where('user_id', $request->user()->id)
            ->where(function ($query) {
                $query->where('plan_type', 'shared')
                    ->orWhereNotNull('shared_plan_id');
            })
            ->first();

        if (!$order) {
            return $this->fail([400, __('Order does not exist')]);
        }

        // Keep response compatible with legacy polling: just return the status int.
        return $this->success($order->status);
    }

    /**
     * 获取订单详情
     * GET /api/v1/user/share-order/detail
     */
    public function detail(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
        ]);

        $order = Order::with('sharedPlan')
            ->where('trade_no', $request->input('trade_no'))
            ->where('user_id', $request->user()->id)
            ->where(function ($query) {
                $query->where('plan_type', 'shared')
                    ->orWhereNotNull('shared_plan_id');
            })
            ->firstOrFail();

        // Recover stuck PROCESSING shared orders so user can retry/cancel.
        // This can happen when payment succeeded but activateSubscription failed before we added rollback.
        if ($order->status === Order::STATUS_PROCESSING) {
            $hasSlot = PlanSlot::where('order_id', $order->id)->exists();
            if (!$hasSlot) {
                $order->status = Order::STATUS_PENDING;
                $order->paid_at = null;
                $order->callback_no = null;
                $order->save();
            }
        }

        $sharedPlan = $order->sharedPlan;
        $transferEnableGb = null;
        if ($sharedPlan && $sharedPlan->total_traffic !== null) {
            $transferEnableGb = (int) floor(((int) $sharedPlan->total_traffic) / 1024 / 1024 / 1024);
        }

        $legacyPeriodMap = [
            'monthly' => 'month_price',
            'quarterly' => 'quarter_price',
            'half_yearly' => 'half_year_price',
            'yearly' => 'year_price',
            'two_yearly' => 'two_year_price',
            'three_yearly' => 'three_year_price',
            'onetime' => 'onetime_price',
        ];

        $legacyPeriod = $legacyPeriodMap[$order->period] ?? $order->period;

        $pricingTiers = null;
        if ($sharedPlan) {
            $tiers = $sharedPlan->getActivePricingTiers();
            $pricingTiers = [];
            foreach ($tiers as $periodKey => $tier) {
                $pricingTiers[$periodKey] = [
                    'price' => (double) ($tier['price'] ?? 0),
                    'enabled' => true,
                ];
            }
        }

        $subscriptionUrl = null;
        try {
            $slot = PlanSlot::where('order_id', $order->id)->first();
            if (!$slot && $sharedPlan) {
                $slot = PlanSlot::where('shared_plan_id', $sharedPlan->id)
                    ->where('user_id', $order->user_id)
                    ->where('status', PlanSlot::STATUS_ACTIVE)
                    ->where('expire_at', '>', now())
                    ->first();
            }
            if ($slot) {
                $linkService = app(SharedSubscribeLinkService::class);
                $subscriptionUrl = $linkService->buildToken([
                    'subscribe_url' => $slot->getSubscriptionUrl(),
                    'shared_plan_id' => (int) $slot->shared_plan_id,
                    'slot_id' => (int) $slot->id,
                    'user_id' => (int) $order->user_id,
                    'email' => (string) ($request->user()->email ?? ''),
                    'expire_at' => $slot->expire_at ? $slot->expire_at->getTimestamp() : null,
                ]);
            }
        } catch (\Throwable $e) {
        }

        return $this->success([
            // Fields required by MaClash OrderDetailResponse
            'trade_no' => $order->trade_no,
            'status' => $order->status,
            'total_amount' => $order->total_amount,
            'handling_amount' => $order->handling_amount ?? 0,
            'payment_id' => $order->payment_id,
            'coupon_id' => $order->coupon_id,
            'period' => $legacyPeriod,
            'created_at' => $order->created_at ? (is_numeric($order->created_at) ? (int) $order->created_at : $order->created_at->timestamp) : null,
            'updated_at' => $order->updated_at ? (is_numeric($order->updated_at) ? (int) $order->updated_at : $order->updated_at->timestamp) : null,

            // Allow clients to distinguish shared vs traditional orders
            'plan_type' => 'shared',
            'shared_plan_id' => $sharedPlan ? $sharedPlan->id : ($order->shared_plan_id ?? null),

            // Keep legacy plan_id + plan object shape so existing UI can reuse PlanInfoCard / PriceDetailCard.
            'plan_id' => $sharedPlan ? $sharedPlan->id : ($order->shared_plan_id ?? 0),
            'plan' => $sharedPlan ? [
                'id' => $sharedPlan->id,
                'name' => $sharedPlan->name,
                // Legacy UI treats this as GB. If shared plan has total_traffic, convert bytes->GB; otherwise mark as "unlimited".
                'transfer_enable' => $transferEnableGb === null ? self::MOBILE_UNLIMITED_TRANSFER_GB : $transferEnableGb,
                // Shared pricing tiers used by newer MaClash UI to compute price consistently.
                'pricing_tiers' => $pricingTiers,
            ] : null,

            // Optional amounts used by legacy UI for price breakdown
            'discount_amount' => $order->discount_amount ?? 0,
            'balance_amount' => $order->balance_amount ?? 0,
            'surplus_amount' => $order->surplus_amount ?? 0,

            // Keep shared_plan for new frontends
            'shared_plan' => $sharedPlan ? [
                'id' => $sharedPlan->id,
                'name' => $sharedPlan->name,
                'subscription_format' => $sharedPlan->subscription_format,
            ] : null,

            'subscription_url' => $subscriptionUrl,
        ]);
    }

    /**
     * 取消订单
     * POST /api/v1/user/share-order/cancel
     */
    public function cancel(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
        ]);

        $order = Order::where('trade_no', $request->input('trade_no'))
            ->where('user_id', $request->user()->id)
            ->where(function ($query) {
                $query->where('plan_type', 'shared')
                    ->orWhereNotNull('shared_plan_id');
            })
            ->first();

        if (!$order) {
            throw new ApiException(__('Order does not exist'));
        }

        if ($order->status !== Order::STATUS_PENDING) {
            // Allow cancelling stuck processing orders that never allocated a slot.
            if ($order->status === Order::STATUS_PROCESSING) {
                $hasSlot = PlanSlot::where('order_id', $order->id)->exists();
                if (!$hasSlot) {
                    $order->status = Order::STATUS_PENDING;
                    $order->paid_at = null;
                    $order->callback_no = null;
                    $order->save();
                }
            }

            if ($order->status !== Order::STATUS_PENDING) {
                throw new ApiException(__('Order cannot be cancelled'));
            }
        }

        try {
            $shareOrderService = new ShareOrderService($order);
            $shareOrderService->cancel();

            Log::info('Order cancelled successfully', [
                'trade_no' => $order->trade_no,
                'user_id' => $order->user_id,
                'status' => Order::STATUS_CANCELLED,
            ]);
            
            return $this->success(true);
        } catch (\Exception $e) {
            Log::error('Failed to cancel shared plan order', [
                'trade_no' => $order->trade_no,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
