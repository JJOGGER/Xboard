<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\Order;
use App\Models\User;
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
    /**
     * 创建共享套餐订单
     * POST /api/v1/user/share-order/save
     */
    public function save(Request $request)
    {
        $request->validate([
            'shared_plan_id' => 'required|integer|exists:v2_shared_plans,id',
            'period' => 'required|string|in:monthly,quarterly,half_yearly,yearly,two_yearly,three_yearly,onetime',
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

        $order = ShareOrderService::createFromRequest($user, $sharedPlan, $period);
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

            return $this->success($result);
        } catch (\Exception $e) {
            Log::error('Payment failed for shared plan order', [
                'trade_no' => $tradeNo,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([400, __('Payment failed: ') . $e->getMessage()]);
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

        return $this->success([
            'trade_no' => $order->trade_no,
            'status' => $order->status,
            'total_amount' => $order->total_amount,
        ]);
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

        return $this->success([
            'trade_no' => $order->trade_no,
            'status' => $order->status,
            'total_amount' => $order->total_amount,
            'period' => $order->period,
            'created_at' => $order->created_at,
            'shared_plan' => $order->sharedPlan ? [
                'id' => $order->sharedPlan->id,
                'name' => $order->sharedPlan->name,
                'subscription_format' => $order->sharedPlan->subscription_format,
            ] : null,
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

        if ($order->status !== 0) {
            throw new ApiException(__('Order cannot be cancelled'));
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
