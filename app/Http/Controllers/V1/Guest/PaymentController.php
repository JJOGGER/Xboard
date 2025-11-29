<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Services\Plugin\PluginManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\Plugin\HookManager;

class PaymentController extends Controller
{
    public function notify($method, $uuid, Request $request)
    {
        HookManager::call('payment.notify.before', [$method, $uuid, $request]);
        try {
            $paymentService = new PaymentService($method, null, $uuid);
            $verify = $paymentService->notify($request->input());
            if (!$verify) {
                HookManager::call('payment.notify.failed', [$method, $uuid, $request]);
                return $this->fail([422, 'verify error']);
            }
            HookManager::call('payment.notify.verified', $verify);
            if (!$this->handle($verify['trade_no'], $verify['callback_no'])) {
                return $this->fail([400, 'handle error']);
            }
            return (isset($verify['custom_result']) ? $verify['custom_result'] : 'success');
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, 'fail']);
        }
    }

    public function handleTangchaoPayNotify(Request $request)
    {
        Log::info('收到唐朝支付回调', $request->all());
        
        try {
            // 1. 从请求参数中获取订单号
            $orderNo = $request->input('order_no');
            if (empty($orderNo)) {
                Log::error('缺少订单号', $request->all());
                return response('FAIL: MISSING ORDER NO', 400);
            }

            // 2. 查找订单
            $order = Order::where('trade_no', $orderNo)->first();
            if (!$order) {
                Log::error('订单不存在', ['order_no' => $orderNo]);
                return response('FAIL: ORDER NOT FOUND', 404);
            }

            // 3. 获取唐朝支付配置
            $payment = Payment::where('payment', 'TangchaoPay')
                ->where('enable', 1)
                ->first();
                
            if (!$payment) {
                Log::error('唐朝支付配置不存在或未启用');
                return response('FAIL: PAYMENT CONFIG ERROR', 500);
            }

            // 4. 初始化支付插件
            $pluginManager = app(PluginManager::class);
            $plugin = $pluginManager->getPaymentPlugin('TangchaoPay');
            
            // 5. 设置配置
            $config = $payment->config;
            if (is_string($config)) {
                $config = json_decode($config, true) ?: [];
            }
            $plugin->setConfig($config);

            // 6. 处理通知
            $result = $plugin->notify($request->all());
            
            // 7. 处理订单
            if ($result) {
                $this->handle($result['trade_no'], $result['callback_no'] ?? '');
                return response('SUCCESS', 200);
            }

            Log::error('支付验证失败', ['order_no' => $orderNo]);
            return response('FAIL: VERIFY FAILED', 400);
            
        } catch (\Exception $e) {
            Log::error('处理唐朝支付回调异常', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response('FAIL: SERVER ERROR', 500);
        }
    }

    private function handle($tradeNo, $callbackNo)
    {
        $order = Order::where('trade_no', $tradeNo)->first();
        if (!$order) {
            return $this->fail([400202, 'order is not found']);
        }
        if ($order->status !== Order::STATUS_PENDING)
            return true;
        $orderService = new OrderService($order);
        if (!$orderService->paid($callbackNo)) {
            return false;
        }

        HookManager::call('payment.notify.success', $order);
        return true;
    }
}
