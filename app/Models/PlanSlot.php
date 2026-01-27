<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * App\Models\PlanSlot
 *
 * @property int $id
 * @property int $shared_plan_id 共享套餐ID
 * @property int $user_id 用户ID
 * @property int|null $order_id 订单ID
 * @property string $subscription_token 用户订阅token
 * @property \Illuminate\Support\Carbon $allocated_at 分配时间
 * @property \Illuminate\Support\Carbon $expire_at 过期时间
 * @property \Illuminate\Support\Carbon|null $released_at 释放时间
 * @property string $status 状态
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 *
 * @property-read SharedPlan $sharedPlan
 * @property-read User $user
 * @property-read Order|null $order
 */
class PlanSlot extends Model
{
    protected $table = 'v2_plan_slots';

    // 状态常量
    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'shared_plan_id',
        'user_id',
        'order_id',
        'subscription_token',
        'allocated_at',
        'expire_at',
        'released_at',
        'status',
    ];

    protected $casts = [
        'shared_plan_id' => 'integer',
        'user_id' => 'integer',
        'order_id' => 'integer',
        'allocated_at' => 'datetime',
        'expire_at' => 'datetime',
        'released_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * 生成唯一的订阅token
     */
    public static function generateUniqueToken(): string
    {
        do {
            $token = Str::random(64);
        } while (self::where('subscription_token', $token)->exists());

        return $token;
    }

    /**
     * 获取关联的共享套餐
     */
    public function sharedPlan(): BelongsTo
    {
        return $this->belongsTo(SharedPlan::class, 'shared_plan_id');
    }

    /**
     * 获取关联的用户
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * 获取关联的订单
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    /**
     * 检查slot是否已过期
     */
    public function isExpired(): bool
    {
        return $this->expire_at->isPast();
    }

    /**
     * 检查slot是否活跃
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && !$this->isExpired();
    }

    /**
     * 释放slot
     */
    public function release(): bool
    {
        if ($this->released_at !== null) {
            return false; // 已经释放过了
        }

        $this->status = self::STATUS_CANCELLED;
        $this->released_at = now();
        
        return $this->save();
    }

    /**
     * 标记为已过期
     */
    public function markAsExpired(): bool
    {
        if ($this->status === self::STATUS_EXPIRED) {
            return false; // 已经是过期状态
        }

        $this->status = self::STATUS_EXPIRED;
        $this->released_at = now();
        
        return $this->save();
    }

    /**
     * 获取剩余有效天数
     */
    public function getRemainingDays(): int
    {
        if ($this->isExpired()) {
            return 0;
        }
        
        return max(0, now()->diffInDays($this->expire_at, false));
    }

    /**
     * 检查是否即将过期（7天内）
     */
    public function isExpiringSoon(int $days = 7): bool
    {
        if ($this->isExpired()) {
            return false;
        }
        
        return $this->getRemainingDays() <= $days;
    }

    /**
     * 获取订阅URL
     */
    public function getSubscriptionUrl(): string
    {
        return url("/api/user/subscribe/{$this->subscription_token}");
    }

    /**
     * Scope: 只查询活跃的slot
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
                    ->where('expire_at', '>', now());
    }

    /**
     * Scope: 只查询已过期的slot
     */
    public function scopeExpired($query)
    {
        return $query->where(function ($q) {
            $q->where('status', self::STATUS_EXPIRED)
              ->orWhere('expire_at', '<=', now());
        });
    }

    /**
     * Scope: 即将过期的slot
     */
    public function scopeExpiringSoon($query, int $days = 7)
    {
        return $query->where('status', self::STATUS_ACTIVE)
                    ->where('expire_at', '>', now())
                    ->where('expire_at', '<=', now()->addDays($days));
    }
}
