<?php

namespace App\Services\Share;

use App\Exceptions\ApiException;
use App\Helpers\Helper;
use App\Models\Order;
use App\Models\Payment;
use App\Models\SharedPlan;
use App\Models\User;
use App\Services\CouponService;
use App\Services\PaymentService;
use App\Services\SubscriptionImportService;
use App\Services\UserService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ShareOrderService
{
    private Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public static function createFromRequest(User $user, SharedPlan $sharedPlan, string $period, ?string $couponCode = null): Order
    {
        $hasPendingSharedOrder = Order::where('user_id', $user->id)
            ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_PROCESSING])
            ->where(function ($query) {
                $query->where('plan_type', 'shared')
                    ->orWhereNotNull('shared_plan_id');
            })
            ->exists();

        if ($hasPendingSharedOrder) {
            throw new ApiException(__('You have an unpaid or pending order, please try again later or cancel it'));
        }

        if (!$sharedPlan->is_visible || $sharedPlan->sync_status !== SharedPlan::SYNC_STATUS_ACTIVE) {
            throw new ApiException(__('Plan is not available'));
        }

        if ($sharedPlan->getAvailableSlotsCount() <= 0) {
            throw new ApiException(__('Plan is sold out'));
        }

        $pricingTiers = $sharedPlan->getActivePricingTiers();
        if (!isset($pricingTiers[$period])) {
            throw new ApiException(__('Invalid subscription period'));
        }

        $priceInCents = (int) $pricingTiers[$period]['price'];

        return DB::transaction(function () use ($user, $sharedPlan, $period, $priceInCents, $couponCode) {
            $order = new Order();
            $order->user_id = $user->id;
            $order->plan_id = 0;
            $order->plan_type = 'shared';
            $order->shared_plan_id = $sharedPlan->id;
            $order->type = Order::TYPE_NEW_PURCHASE;
            $order->period = $period;
            $order->trade_no = Helper::generateOrderNo();
            $order->total_amount = $priceInCents;
            $order->status = Order::STATUS_PENDING;

            // Apply coupon + vip discount for shared plan orders.
            // CouponService period limitation uses PlanService legacy/new period keys,
            // so we temporarily map shared period -> legacy key for validation.
            if ($couponCode) {
                $legacyPeriodMap = [
                    'monthly' => 'month_price',
                    'quarterly' => 'quarter_price',
                    'half_yearly' => 'half_year_price',
                    'yearly' => 'year_price',
                    'two_yearly' => 'two_year_price',
                    'three_yearly' => 'three_year_price',
                ];

                $originalPeriod = $order->period;
                $originalPlanId = $order->plan_id;
                $order->period = $legacyPeriodMap[$period] ?? $period;
                // CouponService checks limit_plan_ids against order.plan_id.
                // For shared orders, persist plan_id=0, but validate coupon against shared_plan_id.
                $order->plan_id = $sharedPlan->id;

                $couponService = new CouponService($couponCode);
                if (!$couponService->use($order)) {
                    throw new ApiException(__('Coupon failed'));
                }
                $order->coupon_id = $couponService->getId();

                // Restore original shared period key
                $order->period = $originalPeriod;
                $order->plan_id = $originalPlanId;
            }

            // VIP discount (same semantics as OrderService::setVipDiscount)
            if ($user->discount) {
                $order->discount_amount = ($order->discount_amount ?? 0) + ($order->total_amount * ($user->discount / 100));
                if ($order->discount_amount > $order->total_amount) {
                    $order->discount_amount = $order->total_amount;
                }
                $order->total_amount = $order->total_amount - $order->discount_amount;
            }

            // Balance deduction (align with OrderService::handleUserBalance)
            if ($order->total_amount > 0) {
                $lockedUser = User::lockForUpdate()->find($user->id);
                if ($lockedUser && $lockedUser->balance) {
                    $userService = app(UserService::class);
                    $remainingBalance = $lockedUser->balance - $order->total_amount;

                    if ($remainingBalance >= 0) {
                        if (!$userService->addBalance($order->user_id, -$order->total_amount)) {
                            throw new ApiException(__('Insufficient balance'));
                        }
                        $order->balance_amount = $order->total_amount;
                        $order->total_amount = 0;
                    } else {
                        if (!$userService->addBalance($order->user_id, -$lockedUser->balance)) {
                            throw new ApiException(__('Insufficient balance'));
                        }
                        $order->balance_amount = $lockedUser->balance;
                        $order->total_amount = $order->total_amount - $lockedUser->balance;
                    }
                }
            }

            if (!$order->save()) {
                throw new ApiException(__('Failed to create order'));
            }

            return $order;
        });
    }

    public function checkout(int $paymentId, ?string $stripeToken = null): array
    {
        $order = $this->order;

        if ($order->plan_type !== 'shared') {
            throw new ApiException(__('Invalid order type'));
        }

        if ($order->status !== Order::STATUS_PENDING) {
            throw new ApiException(__('Order does not exist or has been paid'));
        }

        if ($order->total_amount <= 0) {
            if (!$this->paid($order->trade_no)) {
                throw new ApiException(__('Payment failed'));
            }

            return [
                'type' => -1,
                'data' => true,
            ];
        }

        // Balance payment (no Payment record)
        if ($paymentId === 0) {
            return DB::transaction(function () use ($order) {
                $user = User::lockForUpdate()->find($order->user_id);
                if (!$user) {
                    throw new ApiException(__('User does not exist'));
                }

                if (!isset($user->balance) || $user->balance < $order->total_amount) {
                    throw new ApiException(__('Insufficient balance'));
                }

                $userService = app(UserService::class);
                if (!$userService->addBalance($order->user_id, -$order->total_amount)) {
                    throw new ApiException(__('Insufficient balance'));
                }

                $order->balance_amount = $order->total_amount;
                $order->total_amount = 0;
                $order->payment_id = null;
                if (!$order->save()) {
                    throw new ApiException(__('Request failed, please try again later'));
                }

                if (!$this->paid($order->trade_no)) {
                    throw new ApiException(__('Payment failed'));
                }

                return [
                    'type' => -1,
                    'data' => true,
                ];
            });
        }

        $payment = Payment::find($paymentId);
        if (!$payment || !$payment->enable) {
            throw new ApiException(__('Payment method is not available'));
        }

        $order->handling_amount = null;
        if ($payment->handling_fee_fixed || $payment->handling_fee_percent) {
            $order->handling_amount = (int) round(
                ($order->total_amount * ($payment->handling_fee_percent / 100)) + $payment->handling_fee_fixed
            );
        }

        $order->payment_id = $paymentId;
        if (!$order->save()) {
            throw new ApiException(__('Request failed, please try again later'));
        }

        $paymentService = new PaymentService($payment->payment, $payment->id);

        $paymentData = [
            'trade_no' => $order->trade_no,
            'total_amount' => isset($order->handling_amount) ? ($order->total_amount + $order->handling_amount) : $order->total_amount,
            'user_id' => $order->user_id,
            'stripe_token' => $stripeToken,
        ];

        $result = $paymentService->pay($paymentData);

        Log::info('Payment checkout initiated for shared plan', [
            'order_id' => $order->id,
            'trade_no' => $order->trade_no,
            'payment_method' => $payment->payment,
            'amount' => $paymentData['total_amount'],
        ]);

        return [
            'type' => $result['type'],
            'data' => $result['data'],
        ];
    }

    public function paid(string $callbackNo): bool
    {
        $order = $this->order;

        if ($order->status !== Order::STATUS_PENDING) {
            return true;
        }

        $order->status = Order::STATUS_PROCESSING;
        $order->paid_at = time();
        $order->callback_no = $callbackNo;

        if (!$order->save()) {
            return false;
        }

        try {
            $this->activateSubscription();
        } catch (\Throwable $e) {
            $errorId = (string) \Illuminate\Support\Str::uuid();
            Log::error('Failed to activate shared subscription after payment', [
                'order_id' => $order->id,
                'trade_no' => $order->trade_no,
                'error_id' => $errorId,
                'error' => $e->getMessage(),
            ]);

            try {
                // Revert order to pending so user can retry checkout.
                // Otherwise it stays stuck in PROCESSING and the next checkout will report "Order does not exist or has been paid".
                $order->refresh();
                if ($order->status === Order::STATUS_PROCESSING) {
                    $order->status = Order::STATUS_PENDING;
                    $order->paid_at = null;
                    $order->callback_no = null;
                    $order->save();
                }
            } catch (\Throwable $revertError) {
                Log::warning('Failed to revert shared order after activation failure', [
                    'order_id' => $order->id,
                    'trade_no' => $order->trade_no,
                    'error_id' => $errorId,
                    'error' => $revertError->getMessage(),
                ]);
            }

            throw new ApiException(__('Payment activation failed'), 400, [
                'error_id' => $errorId,
                'error_message' => $e->getMessage(),
            ]);
        }

        return true;
    }

    public function cancel(): bool
    {
        $order = $this->order;

        if ($order->status !== Order::STATUS_PENDING) {
            throw new ApiException(__('Order cannot be cancelled'));
        }

        return DB::transaction(function () use ($order) {
            $order->status = Order::STATUS_CANCELLED;

            if (!$order->save()) {
                throw new ApiException(__('Failed to cancel order'));
            }

            return true;
        });
    }

    private function activateSubscription(): void
    {
        $order = $this->order;

        $sharedPlan = $order->sharedPlan;
        if (!$sharedPlan) {
            throw new \RuntimeException('Shared plan not found for order: ' . $order->id);
        }

        $durationDays = SharedPlan::PERIOD_DAYS[$order->period] ?? null;
        if ($durationDays === null) {
            throw new \RuntimeException('Invalid shared plan period: ' . $order->period);
        }

        DB::transaction(function () use ($order, $sharedPlan, $durationDays) {
            $slot = app(SubscriptionImportService::class)->allocateSlot(
                $sharedPlan->id,
                $order->user_id,
                $order->id,
                $durationDays
            );

            $user = User::lockForUpdate()->find($order->user_id);
            if ($user) {
                if ($sharedPlan->group_id) {
                    $user->group_id = $sharedPlan->group_id;
                }
                if (!empty($sharedPlan->device_limit)) {
                    $user->device_limit = $sharedPlan->device_limit;
                }
                $user->save();
            }

            $order->status = Order::STATUS_COMPLETED;
            $order->save();

            Log::info('Shared plan subscription activated', [
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'shared_plan_id' => $sharedPlan->id,
                'slot_id' => $slot->id,
            ]);
        });
    }
}
