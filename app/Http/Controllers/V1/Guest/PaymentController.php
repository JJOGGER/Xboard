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
        Log::info('========== 唐朝支付回调开始 ==========');
        Log::info('收到回调请求', $request->all());
        
        try {
            // 1. 从请求参数中获取订单号
            $orderNo = $request->input('order_no');
            Log::info('[步骤1] 提取订单号', ['order_no' => $orderNo]);
            
            if (empty($orderNo)) {
                Log::error('[步骤1] 失败：缺少订单号', $request->all());
                return response('FAIL: MISSING ORDER NO', 400);
            }

            // 2. 查找订单
            $order = Order::where('trade_no', $orderNo)->first();
            Log::info('[步骤2] 查询订单', [
                'order_no' => $orderNo,
                'found' => $order ? true : false,
                'order_data' => $order ? $order->toArray() : null
            ]);
            
            if (!$order) {
                Log::error('[步骤2] 失败：订单不存在', ['order_no' => $orderNo]);
                return response('FAIL: ORDER NOT FOUND', 404);
            }

            // 3. 获取唐朝支付配置
            $payment = Payment::where('payment', 'TangchaoPay')
                ->where('enable', 1)
                ->first();
            
            Log::info('[步骤3] 查询支付配置', [
                'found' => $payment ? true : false,
                'payment_id' => $payment ? $payment->id : null
            ]);
                
            if (!$payment) {
                Log::error('[步骤3] 失败：唐朝支付配置不存在或未启用');
                return response('FAIL: PAYMENT CONFIG ERROR', 500);
            }

            // 4. 初始化支付插件
            $pluginManager = app(PluginManager::class);
            $plugin = $pluginManager->getPaymentPlugin('TangchaoPay');
            Log::info('[步骤4] 初始化支付插件成功');
            
            // 5. 设置配置
            $config = $payment->config;
            if (is_string($config)) {
                $config = json_decode($config, true) ?: [];
            }
            $plugin->setConfig($config);
            Log::info('[步骤5] 设置插件配置成功');

            // 6. 处理通知（验证签名）
            Log::info('[步骤6] 开始验证签名...');
            $result = $plugin->notify($request->all());
            
            Log::info('[步骤6] 签名验证结果', [
                'verify_success' => $result ? true : false,
                'result' => $result
            ]);
            
            // 7. 处理订单
            if ($result) {
                Log::info('[步骤7] 开始处理订单', [
                    'trade_no' => $result['trade_no'],
                    'callback_no' => $result['callback_no'] ?? ''
                ]);
                
                $handleResult = $this->handle($result['trade_no'], $result['callback_no'] ?? '');
                
                Log::info('[步骤7] 订单处理完成', [
                    'handle_result' => $handleResult,
                    'order_status' => Order::where('trade_no', $result['trade_no'])->first()?->status
                ]);
                
                Log::info('========== 唐朝支付回调成功 ==========');
                return response('SUCCESS', 200);
            }

            Log::error('[步骤6] 失败：支付验证失败', ['order_no' => $orderNo]);
            Log::info('========== 唐朝支付回调失败 ==========');
            return response('FAIL: VERIFY FAILED', 400);
            
        } catch (\Exception $e) {
            Log::error('========== 唐朝支付回调异常 ==========', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
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
