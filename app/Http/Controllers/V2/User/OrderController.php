<?php
namespace App\Http\Controllers\V2\User;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Plan;
use App\Models\SharedPlan;
use App\Models\User;
use App\Models\Payment;
use App\Services\OrderService;
use App\Services\Share\ShareOrderService;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    /**
     * 创建订单
     */
    public function save(Request $request)
    {
        try {
            $user = auth()->user();
            
            // 验证请求
            $validated = $request->validate([
                'plan_id' => 'required_without:shared_plan_id|exists:v2_plan,id',
                'shared_plan_id' => 'required_without:plan_id|exists:v2_shared_plans,id',
                'plan_type' => 'nullable|in:traditional,shared',
                'period' => 'required_if:plan_id,*|in:month_price,quarter_price,half_year_price,year_price,two_year_price,three_year_price,onetime_price,reset_price',
                'coupon_code' => 'nullable|string|max:255',
            ]);
            
            // 确定套餐类型和价格
            if (isset($validated['shared_plan_id'])) {
                $shareValidated = $request->validate([
                    'period' => 'required|string|in:monthly,quarterly,half_yearly,yearly,two_yearly,three_yearly',
                ]);

                $sharedPlan = SharedPlan::findOrFail($validated['shared_plan_id']);
                $order = ShareOrderService::createFromRequest(
                    $user,
                    $sharedPlan,
                    $shareValidated['period'],
                    $validated['coupon_code'] ?? null
                );

                return response()->json([
                    'data' => [
                        'id' => $order->id,
                        'trade_no' => $order->trade_no,
                        'total_amount' => $order->total_amount,
                        'plan_type' => $order->plan_type,
                        'status' => $order->status,
                        'created_at' => $order->created_at,
                    ]
                ]);
            } else {
                $plan = Plan::findOrFail($validated['plan_id']);
                $planType = 'traditional';
                $period = $validated['period'];
                
                // 检查套餐是否可用
                if (!$plan->show) {
                    return response()->json([
                        'message' => '该套餐暂不可用'
                    ], 400);
                }
                
                $price = $plan->{$period};
                
                if ($price === null || $price <= 0) {
                    return response()->json([
                        'message' => '该套餐周期暂不可用'
                    ], 400);
                }
            }
            
            // 处理优惠券（如果有）
            $discount = 0;
            if (isset($validated['coupon_code'])) {
                // TODO: 实现优惠券逻辑
                // $discount = $this->applyCoupon($validated['coupon_code'], $price);
            }
            
            $finalAmount = $price - $discount;
            
            // 创建订单
            $order = Order::create([
                'user_id' => $user->id,
                'plan_id' => $validated['plan_id'] ?? null,
                'shared_plan_id' => $validated['shared_plan_id'] ?? null,
                'plan_type' => $planType,
                'period' => $validated['period'] ?? null,
                'trade_no' => $this->generateTradeNo(),
                'total_amount' => $finalAmount,
                'status' => 0, // 待支付
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            Log::info('User order created', [
                'order_id' => $order->id,
                'user_id' => $user->id,
                'plan_type' => $planType,
                'amount' => $finalAmount,
            ]);
            
            return response()->json([
                'data' => [
                    'id' => $order->id,
                    'trade_no' => $order->trade_no,
                    'total_amount' => $order->total_amount,
                    'plan_type' => $order->plan_type,
                    'status' => $order->status,
                    'created_at' => $order->created_at,
                ]
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => '参数验证失败',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to create order', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => '创建订单失败，请稍后重试'
            ], 500);
        }
    }
    
    /**
     * 查询用户订单列表
     */
    public function fetch(Request $request)
    {
        try {
            $user = auth()->user();
            
            $query = Order::where('user_id', $user->id)
                ->with(['plan', 'sharedPlan'])
                ->orderBy('created_at', 'desc');
            
            // 支持分页
            $pageSize = $request->input('page_size', 10);
            $orders = $query->paginate($pageSize);
            
            // 格式化订单数据
            $formattedOrders = $orders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'trade_no' => $order->trade_no,
                    'plan_type' => $order->plan_type,
                    'plan_name' => $order->plan_type === 'shared' 
                        ? ($order->sharedPlan->name ?? 'N/A')
                        : ($order->plan->name ?? 'N/A'),
                    'period' => $order->period,
                    'total_amount' => $order->total_amount,
                    'status' => $order->status,
                    'created_at' => $order->created_at,
                    'updated_at' => $order->updated_at,
                ];
            });
            
            return response()->json([
                'data' => $formattedOrders,
                'total' => $orders->total(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to fetch orders', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => '获取订单列表失败'
            ], 500);
        }
    }
    
    /**
     * 订单详情
     */
    public function detail($id)
    {
        try {
            $user = auth()->user();
            
            $order = Order::where('user_id', $user->id)
                ->where('id', $id)
                ->with(['plan', 'sharedPlan'])
                ->firstOrFail();
            
            $orderData = [
                'id' => $order->id,
                'trade_no' => $order->trade_no,
                'plan_type' => $order->plan_type,
                'period' => $order->period,
                'total_amount' => $order->total_amount / 100,
                'status' => $order->status,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
            ];
            
            // 添加套餐信息
            if ($order->plan_type === 'shared' && $order->sharedPlan) {
                $orderData['shared_plan'] = [
                    'id' => $order->sharedPlan->id,
                    'name' => $order->sharedPlan->name,
                    'source' => $order->sharedPlan->source,
                    'price' => $order->sharedPlan->price,
                ];
            } elseif ($order->plan_type === 'traditional' && $order->plan) {
                $orderData['plan'] = [
                    'id' => $order->plan->id,
                    'name' => $order->plan->name,
                    'transfer_enable' => $order->plan->transfer_enable,
                ];
            }
            
            return response()->json([
                'data' => $orderData
            ]);
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => '订单不存在'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to get order detail', [
                'order_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => '获取订单详情失败'
            ], 500);
        }
    }
    
    /**
     * 取消订单
     */
    public function cancel($id)
    {
        try {
            $user = auth()->user();
            
            $order = Order::where('user_id', $user->id)
                ->where('id', $id)
                ->where('status', 0) // 只能取消待支付订单
                ->firstOrFail();
            
            $order->update(['status' => 2]); // 已取消
            
            Log::info('Order cancelled by user', [
                'order_id' => $order->id,
                'user_id' => $user->id,
            ]);
            
            return response()->json([
                'data' => true,
                'message' => '订单已取消'
            ]);
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => '订单不存在或无法取消'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to cancel order', [
                'order_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => '取消订单失败'
            ], 500);
        }
    }
    
    /**
     * 获取订单支付信息（通过 trade_no）
     */
    public function getPaymentInfo($tradeNo)
    {
        try {
            $user = auth()->user();
            
            $order = Order::where('user_id', $user->id)
                ->where('trade_no', $tradeNo)
                ->with(['plan', 'sharedPlan'])
                ->firstOrFail();

            // Backfill legacy/buggy rows
            if ($order->plan_type === null) {
                if ($order->shared_plan_id !== null) {
                    $order->plan_type = 'shared';
                } elseif ($order->plan_id !== null) {
                    $order->plan_type = 'traditional';
                }
            }

            // If shared order has zero amount while still pending, recompute from pricing tiers
            if ($order->plan_type === 'shared' && $order->status === 0 && (int) $order->total_amount <= 0 && $order->sharedPlan) {
                $tiers = $order->sharedPlan->getActivePricingTiers();
                $price = isset($tiers[$order->period]['price']) ? (int) $tiers[$order->period]['price'] : 0;
                if ($price > 0) {
                    $order->total_amount = $price;
                }
            }

            // Persist backfilled values if any
            if ($order->isDirty(['plan_type', 'total_amount'])) {
                $order->save();
            }
            
            $orderData = [
                'id' => $order->id,
                'trade_no' => $order->trade_no,
                'plan_type' => $order->plan_type,
                'period' => $order->period,
                'total_amount' => $order->total_amount,
                'status' => $order->status,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
            ];
            
            // 添加套餐信息
            if ($order->plan_type === 'shared' && $order->sharedPlan) {
                $orderData['shared_plan'] = [
                    'id' => $order->sharedPlan->id,
                    'name' => $order->sharedPlan->name,
                    'subscription_format' => $order->sharedPlan->subscription_format,
                ];
            } elseif ($order->plan_type === 'traditional' && $order->plan) {
                $orderData['plan'] = [
                    'id' => $order->plan->id,
                    'name' => $order->plan->name,
                    'transfer_enable' => $order->plan->transfer_enable,
                    'speed_limit' => $order->plan->speed_limit,
                    'device_limit' => $order->plan->device_limit,
                ];
            }
            
            return response()->json([
                'data' => $orderData
            ]);
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => '订单不存在'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to get payment info', [
                'trade_no' => $tradeNo,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => '获取支付信息失败'
            ], 500);
        }
    }
    
    /**
     * 生成交易号
     */
    private function generateTradeNo(): string
    {
        return date('YmdHis') . rand(100000, 999999);
    }
    
    /**
     * 发起支付
     */
    public function checkout(Request $request)
    {
        try {
            $validated = $request->validate([
                'trade_no' => 'required|string',
                'method' => 'required|integer|exists:v2_payment,id',
                'token' => 'nullable|string', // Stripe token
            ]);
            
            $user = auth()->user();
            
            $order = Order::where('trade_no', $validated['trade_no'])
                ->where('user_id', $user->id)
                ->where('status', 0)
                ->first();
            
            if (!$order) {
                return response()->json([
                    'message' => '订单不存在或已支付'
                ], 400);
            }
            
            // 免费订单直接完成
            if ($order->total_amount <= 0) {
                $orderService = new OrderService($order);
                if (!$orderService->paid($order->trade_no)) {
                    return response()->json([
                        'message' => '支付失败'
                    ], 400);
                }
                return response()->json([
                    'data' => [
                        'type' => -1,
                        'data' => true
                    ]
                ]);
            }
            
            // 获取支付方式
            $payment = Payment::find($validated['method']);
            if (!$payment || !$payment->enable) {
                return response()->json([
                    'message' => '支付方式不可用'
                ], 400);
            }
            
            // 计算手续费
            $order->handling_amount = null;
            if ($payment->handling_fee_fixed || $payment->handling_fee_percent) {
                $order->handling_amount = (int) round(
                    ($order->total_amount * ($payment->handling_fee_percent / 100)) + 
                    $payment->handling_fee_fixed
                );
            }
            
            $order->payment_id = $validated['method'];
            $order->save();
            
            // 调用支付服务
            $paymentService = new PaymentService($payment->payment, $payment->id);
            
            $paymentData = [
                'trade_no' => $validated['trade_no'],
                'total_amount' => isset($order->handling_amount) 
                    ? ($order->total_amount + $order->handling_amount) 
                    : $order->total_amount,
                'user_id' => $order->user_id,
                'stripe_token' => $validated['token'] ?? null,
            ];
            
            $result = $paymentService->pay($paymentData);
            
            Log::info('Payment checkout initiated', [
                'order_id' => $order->id,
                'trade_no' => $order->trade_no,
                'payment_method' => $payment->payment,
                'amount' => $paymentData['total_amount'],
            ]);
            
            return response()->json([
                'data' => [
                    'type' => $result['type'],
                    'data' => $result['data']
                ]
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => '参数验证失败',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Payment checkout failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => $e->getMessage()
            ], 400);
        }
    }
    
    /**
     * 检查订单状态
     */
    public function checkStatus(Request $request)
    {
        try {
            $validated = $request->validate([
                'trade_no' => 'required|string',
            ]);
            
            $user = auth()->user();
            
            $order = Order::where('trade_no', $validated['trade_no'])
                ->where('user_id', $user->id)
                ->first();
            
            if (!$order) {
                return response()->json([
                    'message' => '订单不存在'
                ], 404);
            }
            
            return response()->json([
                'data' => [
                    'status' => $order->status,
                    'trade_no' => $order->trade_no,
                    'total_amount' => $order->total_amount,
                    'paid_at' => $order->paid_at,
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Check order status failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => '查询订单状态失败'
            ], 500);
        }
    }
    
    /**
     * 获取支付方式列表
     */
    public function getPaymentMethods()
    {
        try {
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
            
            return response()->json([
                'data' => $methods
            ]);
            
        } catch (\Exception $e) {
            Log::error('Get payment methods failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => '获取支付方式失败'
            ], 500);
        }
    }
}
