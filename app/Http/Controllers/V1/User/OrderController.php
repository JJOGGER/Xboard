<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\OrderSave;
use App\Services\DeviceIdCrypto;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Services\CouponService;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Services\PlanService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function fetch(Request $request)
    {
        $request->validate([
            'status' => 'nullable|integer|in:0,1,2,3',
        ]);
        $orders = Order::with('plan')
            ->where('user_id', $request->user()->id)
            ->when($request->input('status') !== null, function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->orderBy('created_at', 'DESC')
            ->get();

        return $this->success(OrderResource::collection($orders));
    }

    public function detail(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
        ]);
        $order = Order::with(['payment', 'plan'])
            ->where('user_id', $request->user()->id)
            ->where('trade_no', $request->input('trade_no'))
            ->first();
        if (!$order) {
            return $this->fail([400, __('Order does not exist or has been paid')]);
        }
        $order['try_out_plan_id'] = (int) admin_setting('try_out_plan_id');
        if (!$order->plan) {
            return $this->fail([400, __('Subscription plan does not exist')]);
        }
        if ($order->surplus_order_ids) {
            $order['surplus_orders'] = Order::whereIn('id', $order->surplus_order_ids)->get();
        }
        return $this->success(OrderResource::make($order));
    }

    public function save(OrderSave $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:App\Models\Plan,id',
            'period' => 'required|string'
        ]);

        $user = User::findOrFail($request->user()->id);
        $userService = app(UserService::class);

        if ($userService->isNotCompleteOrderByUserId($user->id)) {
            throw new ApiException(__('You have an unpaid or pending order, please try again later or cancel it'));
        }

        $plan = Plan::findOrFail($request->input('plan_id'));

        // 仅对试用套餐强制要求 nonce 校验，非试用套餐不做设备校验
        $deviceId = null;
        if ($plan->isTrial()) {
            $nonce = $request->header('X-Nonce') ?? $request->header('nonce');

            if ($nonce === null || $nonce === '') {
                // 试用套餐必须携带有效的 nonce，旧客户端不可购买试用
                throw new ApiException(__('Trial plan requires device verification, please update your client'));
            }

            // 有 nonce 时必须能成功解密，否则视为无效
            $deviceId = DeviceIdCrypto::decryptNonceToDeviceId($nonce);
        }

        $order = OrderService::createFromRequest(
            $user,
            $plan,
            $request->input('period'),
            $request->input('coupon_code'),
            $deviceId
        );

        return $this->success($order->trade_no);
    }

    protected function applyCoupon(Order $order, string $couponCode): void
    {
        $couponService = new CouponService($couponCode);
        if (!$couponService->use($order)) {
            throw new ApiException(__('Coupon failed'));
        }
        $order->coupon_id = $couponService->getId();
    }

    protected function handleUserBalance(Order $order, User $user, UserService $userService): void
    {
        $remainingBalance = $user->balance - $order->total_amount;

        if ($remainingBalance > 0) {
            if (!$userService->addBalance($order->user_id, -$order->total_amount)) {
                throw new ApiException(__('Insufficient balance'));
            }
            $order->balance_amount = $order->total_amount;
            $order->total_amount = 0;
        } else {
            if (!$userService->addBalance($order->user_id, -$user->balance)) {
                throw new ApiException(__('Insufficient balance'));
            }
            $order->balance_amount = $user->balance;
            $order->total_amount = $order->total_amount - $user->balance;
        }
    }

    public function checkout(Request $request)
    {
        $logFile = '/tmp/order_controller_debug.log';
        file_put_contents($logFile, "=== Checkout method called ===\n", FILE_APPEND);
        
        try {
            $tradeNo = $request->input('trade_no');
            $method = $request->input('method');
            file_put_contents($logFile, "Trade No: {$tradeNo}, Method: {$method}\n", FILE_APPEND);
            
            $user = $request->user();
            file_put_contents($logFile, "User ID: " . ($user ? $user->id : 'NULL') . "\n", FILE_APPEND);
            
            Log::info('Checkout started', ['trade_no' => $tradeNo, 'method' => $method]);
            $order = Order::where('trade_no', $tradeNo)
                ->where('user_id', $user->id)
                ->where('status', 0)
                ->first();
            file_put_contents($logFile, "Order found: " . ($order ? 'YES' : 'NO') . "\n", FILE_APPEND);
            
            if (!$order) {
                Log::warning('Order not found', ['trade_no' => $tradeNo]);
                return $this->fail([400, __('Order does not exist or has been paid')]);
            }
        } catch (\Throwable $e) {
            file_put_contents($logFile, "ERROR in initial setup: " . $e->getMessage() . "\n", FILE_APPEND);
            file_put_contents($logFile, "Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
            throw $e;
        }
        // free process
        if ($order->total_amount <= 0) {
            $orderService = new OrderService($order);
            if (!$orderService->paid($order->trade_no))
                return $this->fail([400, '支付失败']);
            return response([
                'type' => -1,
                'data' => true
            ]);
        }
        $payment = Payment::find($method);
        if (!$payment || !$payment->enable) {
            return $this->fail([400, __('Payment method is not available')]);
        }
        $paymentService = new PaymentService($payment->payment, $payment->id);
        $order->handling_amount = NULL;
        if ($payment->handling_fee_fixed || $payment->handling_fee_percent) {
            $order->handling_amount = (int) round(($order->total_amount * ($payment->handling_fee_percent / 100)) + $payment->handling_fee_fixed);
        }
        $order->payment_id = $method;
        if (!$order->save())
            return $this->fail([400, __('Request failed, please try again later')]);
        
        try {
            $logFile = '/tmp/order_controller_debug.log';
            file_put_contents($logFile, "=== OrderController::checkout() ===\n", FILE_APPEND);
            file_put_contents($logFile, "Trade No: {$tradeNo}\n", FILE_APPEND);
            file_put_contents($logFile, "Payment: {$payment->payment}\n", FILE_APPEND);
            file_put_contents($logFile, "Payment ID: {$payment->id}\n", FILE_APPEND);
            
            Log::info('About to call payment service pay method', [
                'payment' => $payment->payment,
                'trade_no' => $tradeNo
            ]);
            
            $paymentData = [
                'trade_no' => $tradeNo,
                'total_amount' => isset($order->handling_amount) ? ($order->total_amount + $order->handling_amount) : $order->total_amount,
                'user_id' => $order->user_id,
                'stripe_token' => $request->input('token')
            ];
            file_put_contents($logFile, "Payment data: " . json_encode($paymentData) . "\n", FILE_APPEND);
            
            $result = $paymentService->pay($paymentData);
            Log::info('Payment service returned successfully', ['result' => $result]);
            file_put_contents($logFile, "SUCCESS\n", FILE_APPEND);
            return response([
                'type' => $result['type'],
                'data' => $result['data']
            ]);
        } catch (\Throwable $e) {
            $errorMsg = $e->getMessage();
            $errorTrace = $e->getTraceAsString();
            $logData = [
                'trade_no' => $tradeNo,
                'error' => $errorMsg,
                'trace' => $errorTrace
            ];
            if (isset($payment)) {
                $logData['payment'] = $payment->payment;
            }
            Log::error('Payment checkout failed', $logData);
            
            $logFile = '/tmp/order_controller_debug.log';
            file_put_contents($logFile, "ERROR: {$errorMsg}\n", FILE_APPEND);
            file_put_contents($logFile, "TRACE: {$errorTrace}\n", FILE_APPEND);
            // 输出到标准输出，便于 Docker 日志查看
            error_log("PAYMENT_ERROR: " . $errorMsg);
            error_log("PAYMENT_TRACE: " . $errorTrace);
            return $this->fail([400, $errorMsg]);
        }
    }

    public function check(Request $request)
    {
        $tradeNo = $request->input('trade_no');
        $order = Order::where('trade_no', $tradeNo)
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$order) {
            return $this->fail([400, __('Order does not exist')]);
        }
        return $this->success($order->status);
    }

    public function getPaymentMethod()
    {
        $methods = Payment::select([
            'id',
            'name',
            'payment',
            'icon',
            'handling_fee_fixed',
            'handling_fee_percent'
        ])
            ->where('enable', 1)
            ->orderBy('sort', 'ASC')
            ->get();

        return $this->success($methods);
    }

    public function cancel(Request $request)
    {
        if (empty($request->input('trade_no'))) {
            return $this->fail([422, __('Invalid parameter')]);
        }
        $order = Order::where('trade_no', $request->input('trade_no'))
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$order) {
            return $this->fail([400, __('Order does not exist')]);
        }
        if ($order->status !== 0) {
            return $this->fail([400, __('You can only cancel pending orders')]);
        }
        $orderService = new OrderService($order);
        if (!$orderService->cancel()) {
            return $this->fail([400, __('Cancel failed')]);
        }
        return $this->success(true);
    }
}
