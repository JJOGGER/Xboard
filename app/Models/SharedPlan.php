<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

/**
 * App\Models\SharedPlan
 *
 * @property int $id
 * @property string $name 套餐名称
 * @property string|null $description 套餐描述
 * @property string $subscription_url 第三方订阅URL（加密存储）
 * @property string $subscription_format 订阅格式
 * @property int|null $group_id 服务器组ID
 * @property array|null $group_ids 服务器组ID列表
 * @property array|null $tags 标签
 * @property array|null $prices 价格配置
 * @property int $max_slots 最大用户数
 * @property int|null $device_limit 设备数量限制
 * @property int $used_slots 已使用slot数
 * @property array $nodes_config 解析后的节点配置
 * @property int $nodes_count 节点数量
 * @property int|null $total_traffic 总流量（字节）
 * @property int|null $used_traffic 已用流量（字节）
 * @property \Illuminate\Support\Carbon|null $expire_at 订阅过期时间
 * @property \Illuminate\Support\Carbon|null $last_sync_at 最后同步时间
 * @property string $sync_status 同步状态
 * @property string|null $sync_error 同步错误信息
 * @property int $sync_fail_count 连续失败次数
 * @property bool $is_visible 是否显示给用户
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 *
 * @property-read ServerGroup|null $group
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PlanSlot> $slots
 * @property-read \Illuminate\Database\Eloquent\Collection<int, SubscriptionSyncLog> $syncLogs
 */
class SharedPlan extends Model
{
    use HasFactory;
    
    protected $table = 'v2_shared_plans';

    // 同步状态常量
    public const SYNC_STATUS_ACTIVE = 'active';
    public const SYNC_STATUS_FAILED = 'failed';
    public const SYNC_STATUS_EXPIRED = 'expired';

    // 订阅格式常量
    public const FORMAT_CLASH = 'clash';
    public const FORMAT_V2RAY = 'v2ray';
    public const FORMAT_SHADOWSOCKS = 'shadowsocks';
    public const FORMAT_TROJAN = 'trojan';
    public const FORMAT_HYSTERIA = 'hysteria';
    public const FORMAT_HYSTERIA2 = 'hysteria2';

    // 价格周期常量
    public const PERIOD_MONTHLY = 'monthly';
    public const PERIOD_QUARTERLY = 'quarterly';
    public const PERIOD_HALF_YEARLY = 'half_yearly';
    public const PERIOD_YEARLY = 'yearly';
    public const PERIOD_TWO_YEARLY = 'two_yearly';
    public const PERIOD_THREE_YEARLY = 'three_yearly';
    public const PERIOD_ONETIME = 'onetime';
    public const PERIOD_RESET_TRAFFIC = 'reset_traffic';

    // 周期天数映射
    public const PERIOD_DAYS = [
        self::PERIOD_MONTHLY => 30,
        self::PERIOD_QUARTERLY => 90,
        self::PERIOD_HALF_YEARLY => 180,
        self::PERIOD_YEARLY => 365,
        self::PERIOD_TWO_YEARLY => 730,
        self::PERIOD_THREE_YEARLY => 1095,
        self::PERIOD_ONETIME => -1,
        self::PERIOD_RESET_TRAFFIC => 0,
    ];

    // 周期名称映射
    public const PERIOD_NAMES = [
        self::PERIOD_MONTHLY => '月付',
        self::PERIOD_QUARTERLY => '季付',
        self::PERIOD_HALF_YEARLY => '半年付',
        self::PERIOD_YEARLY => '年付',
        self::PERIOD_TWO_YEARLY => '两年付',
        self::PERIOD_THREE_YEARLY => '三年付',
        self::PERIOD_ONETIME => '一次性',
        self::PERIOD_RESET_TRAFFIC => '重置流量',
    ];

    protected $fillable = [
        'name',
        'description',
        'subscription_url',
        'subscription_format',
        'group_id',
        'group_ids',
        'tags',
        'prices',
        'max_slots',
        'device_limit',
        'used_slots',
        'nodes_config',
        'nodes_count',
        'total_traffic',
        'used_traffic',
        'expire_at',
        'last_sync_at',
        'sync_status',
        'sync_error',
        'sync_fail_count',
        'is_visible',
    ];

    protected $casts = [
        'nodes_config' => 'array',
        'tags' => 'array',
        'prices' => 'array',
        'group_id' => 'integer',
        'group_ids' => 'array',
        'max_slots' => 'integer',
        'used_slots' => 'integer',
        'nodes_count' => 'integer',
        'total_traffic' => 'integer',
        'used_traffic' => 'integer',
        'sync_fail_count' => 'integer',
        'is_visible' => 'boolean',
        'device_limit' => 'integer',
        'expire_at' => 'datetime',
        'last_sync_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * 获取所有slot记录
     */
    public function slots(): HasMany
    {
        return $this->hasMany(PlanSlot::class, 'shared_plan_id');
    }

    /**
     * 获取关联的服务器组
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ServerGroup::class, 'group_id');
    }

    /**
     * 获取活跃的slot记录
     */
    public function activeSlots(): HasMany
    {
        return $this->slots()->where('status', PlanSlot::STATUS_ACTIVE);
    }

    /**
     * 获取同步日志
     */
    public function syncLogs(): HasMany
    {
        return $this->hasMany(SubscriptionSyncLog::class, 'shared_plan_id');
    }

    /**
     * 设置订阅URL（加密存储）
     */
    public function setSubscriptionUrlAttribute(string $value): void
    {
        $this->attributes['subscription_url'] = Crypt::encryptString($value);
    }

    /**
     * 获取订阅URL（解密）
     */
    public function getSubscriptionUrlAttribute(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            return '';
        }
    }

    /**
     * 获取解密后的订阅URL（别名方法，用于兼容）
     */
    public function getDecryptedSubscriptionUrl(): string
    {
        return $this->subscription_url;
    }

    /**
     * 获取脱敏后的订阅URL（用于显示）
     */
    public function getMaskedSubscriptionUrl(): string
    {
        $url = $this->subscription_url;
        
        // 解析URL
        $parsed = parse_url($url);
        if (!$parsed) {
            return '***';
        }

        // 构建基础URL
        $maskedUrl = ($parsed['scheme'] ?? 'https') . '://';
        $maskedUrl .= $parsed['host'] ?? '***';
        
        if (isset($parsed['port'])) {
            $maskedUrl .= ':' . $parsed['port'];
        }
        
        if (isset($parsed['path'])) {
            $maskedUrl .= $parsed['path'];
        }

        // 脱敏查询参数
        if (isset($parsed['query'])) {
            parse_str($parsed['query'], $params);
            $maskedParams = [];
            
            foreach ($params as $key => $value) {
                // 敏感参数列表
                $sensitiveKeys = ['token', 'password', 'key', 'secret', 'auth'];
                
                if (in_array(strtolower($key), $sensitiveKeys)) {
                    // 只显示前3个和后3个字符
                    if (strlen($value) > 6) {
                        $maskedParams[$key] = substr($value, 0, 3) . '***' . substr($value, -3);
                    } else {
                        $maskedParams[$key] = '***';
                    }
                } else {
                    $maskedParams[$key] = $value;
                }
            }
            
            if (!empty($maskedParams)) {
                $maskedUrl .= '?' . http_build_query($maskedParams);
            }
        }

        return $maskedUrl;
    }

    /**
     * 检查是否有可用的slot
     */
    public function hasAvailableSlots(): bool
    {
        return $this->getActiveUsedSlotsCount() < $this->max_slots;
    }

    /**
     * 获取可用slot数量
     */
    public function getAvailableSlotsCount(): int
    {
        return max(0, $this->max_slots - $this->getActiveUsedSlotsCount());
    }

    /**
     * 获取当前活跃使用的 slot 数（基于 PlanSlot 实际记录）
     */
    public function getActiveUsedSlotsCount(): int
    {
        try {
            return (int) PlanSlot::query()
                ->active()
                ->where('shared_plan_id', $this->id)
                ->count();
        } catch (\Throwable $e) {
            return (int) ($this->used_slots ?? 0);
        }
    }

    /**
     * 检查订阅是否过期
     */
    public function isExpired(): bool
    {
        return $this->expire_at !== null && $this->expire_at->isPast();
    }

    /**
     * 检查流量是否耗尽
     */
    public function isTrafficExhausted(): bool
    {
        if ($this->total_traffic === null || $this->used_traffic === null) {
            return false;
        }
        
        return $this->used_traffic >= $this->total_traffic;
    }

    /**
     * 获取剩余流量（字节）
     */
    public function getRemainingTraffic(): ?int
    {
        if ($this->total_traffic === null || $this->used_traffic === null) {
            return null;
        }
        
        return max(0, $this->total_traffic - $this->used_traffic);
    }

    /**
     * 获取流量使用百分比
     */
    public function getTrafficUsagePercentage(): ?float
    {
        if ($this->total_traffic === null || $this->used_traffic === null || $this->total_traffic <= 0) {
            return null;
        }
        
        return min(100, ($this->used_traffic / $this->total_traffic) * 100);
    }

    /**
     * 计算订阅状态
     */
    public function calculateStatus(): string
    {
        if ($this->isExpired()) {
            return 'expired';
        }
        
        if ($this->isTrafficExhausted()) {
            return 'exhausted';
        }
        
        return 'active';
    }

    /**
     * 增加已用slot计数
     */
    public function incrementUsedSlots(): bool
    {
        if (!$this->hasAvailableSlots()) {
            return false;
        }
        
        return $this->increment('used_slots') > 0;
    }

    /**
     * 减少已用slot计数
     */
    public function decrementUsedSlots(): bool
    {
        if ($this->used_slots <= 0) {
            return false;
        }
        
        return $this->decrement('used_slots') > 0;
    }

    /**
     * 获取指定周期的价格
     * 
     * Requirements 4.1, 4.2:
     * - 支持多种定价周期
     * - 返回指定周期的价格（分）
     * 
     * @param string $period 周期类型
     * @return int|null 价格（分），如果未设置则返回null
     */
    public function getPriceByPeriod(string $period): ?int
    {
        if (empty($this->prices) || !is_array($this->prices)) {
            return null;
        }

        return $this->prices[$period] ?? null;
    }

    /**
     * 获取所有有效的定价层级
     * 
     * Requirements 4.1, 4.2, 4.6, 4.10:
     * - 返回所有价格大于0的定价层级
     * - 包含周期信息、价格和平均月价
     * - 使用正确的周期天数映射
     * 
     * @return array 定价层级数组，格式：
     * [
     *   'monthly' => [
     *     'period' => ['name' => '月付', 'days' => 30],
     *     'price' => 2000,
     *     'average_monthly' => 2000.0
     *   ],
     *   ...
     * ]
     */
    public function getActivePricingTiers(): array
    {
        if (empty($this->prices) || !is_array($this->prices)) {
            return [];
        }

        $tiers = [];
        
        foreach ($this->prices as $period => $price) {
            // 只包含价格大于0且周期有效的层级
            if ($period === self::PERIOD_ONETIME) {
                continue;
            }

            if ($price > 0 && isset(self::PERIOD_DAYS[$period])) {
                $days = self::PERIOD_DAYS[$period];
                $periodName = self::PERIOD_NAMES[$period] ?? $period;
                
                // 计算平均月价
                // 对于一次性套餐（days = -1），平均月价就是总价
                // 对于重置流量（days = 0），平均月价就是总价
                // 对于其他周期，按天数计算平均月价
                if ($days > 0) {
                    $averageMonthly = round($price / ($days / 30), 2);
                } else {
                    $averageMonthly = (float) $price;
                }
                
                $tiers[$period] = [
                    'period' => [
                        'name' => $periodName,
                        'days' => $days,
                    ],
                    'price' => $price,
                    'average_monthly' => $averageMonthly,
                ];
            }
        }
        
        return $tiers;
    }

    /**
     * 检查套餐是否为试用套餐
     * 
     * Requirements 3.7:
     * - 检测标签中是否包含"试用"或"trial"（不区分大小写）
     * 
     * @return bool 如果包含试用标签返回true，否则返回false
     */
    public function isTrial(): bool
    {
        if (empty($this->tags) || !is_array($this->tags)) {
            return false;
        }
        
        // 检查标签数组中是否包含试用标签（不区分大小写）
        foreach ($this->tags as $tag) {
            $normalizedTag = mb_strtolower(trim($tag));
            if (in_array($normalizedTag, ['试用', 'trial'])) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 获取所有支持的订阅格式
     */
    public static function getSupportedFormats(): array
    {
        return [
            self::FORMAT_CLASH => 'Clash',
            self::FORMAT_V2RAY => 'V2Ray',
            self::FORMAT_SHADOWSOCKS => 'Shadowsocks',
            self::FORMAT_TROJAN => 'Trojan',
            self::FORMAT_HYSTERIA => 'Hysteria',
            self::FORMAT_HYSTERIA2 => 'Hysteria2',
        ];
    }

    /**
     * 检查格式是否有效
     */
    public static function isValidFormat(string $format): bool
    {
        return array_key_exists($format, self::getSupportedFormats());
    }

    /**
     * 验证slot数量
     * 
     * @param int $slotCount 要验证的slot数量
     * @param int|null $currentUsedSlots 当前已用slot数（用于更新时验证）
     * @return bool
     * @throws \InvalidArgumentException
     */
    public static function validateSlotCount(int $slotCount, ?int $currentUsedSlots = null): bool
    {
        // 验证是否为正整数且大于0
        if ($slotCount <= 0) {
            throw new \InvalidArgumentException('Slot count must be a positive integer greater than 0');
        }

        // 如果提供了当前已用slot数，验证新值不小于已用数
        if ($currentUsedSlots !== null && $slotCount < $currentUsedSlots) {
            throw new \InvalidArgumentException(
                "New slot count ({$slotCount}) cannot be less than currently used slots ({$currentUsedSlots})"
            );
        }

        return true;
    }

    /**
     * 验证并更新max_slots
     * 
     * @param int $newMaxSlots
     * @return bool
     * @throws \InvalidArgumentException
     */
    public function updateMaxSlots(int $newMaxSlots): bool
    {
        // 验证新的slot数量
        self::validateSlotCount($newMaxSlots, $this->used_slots);

        // 更新max_slots
        $this->max_slots = $newMaxSlots;
        $saved = $this->save();

        // 如果之前不可见但现在有空位了，且订阅未过期未耗尽，则显示
        if ($saved && !$this->is_visible && $this->hasAvailableSlots() && 
            !$this->isExpired() && !$this->isTrafficExhausted()) {
            $this->is_visible = true;
            $this->save();
        }

        return $saved;
    }

    /**
     * 根据slot可用性和订阅状态更新套餐可见性
     * 
     * Requirements 4.2, 7.5:
     * - 当used_slots == max_slots时，隐藏套餐
     * - 当used_slots < max_slots且订阅未过期未耗尽时，显示套餐
     * 
     * @return bool 是否更新了可见性
     */
    public function updateVisibility(): bool
    {
        $shouldBeVisible = $this->shouldBeVisible();
        
        if ($this->is_visible !== $shouldBeVisible) {
            $this->is_visible = $shouldBeVisible;
            return $this->save();
        }
        
        return false;
    }

    /**
     * 判断套餐是否应该可见
     * 
     * @return bool
     */
    public function shouldBeVisible(): bool
    {
        // 必须有可用slot
        if (!$this->hasAvailableSlots()) {
            return false;
        }

        // 订阅不能过期
        if ($this->isExpired()) {
            return false;
        }

        // 流量不能耗尽
        if ($this->isTrafficExhausted()) {
            return false;
        }

        // 同步状态不能是失败（可以容忍临时失败，但不显示长期失败的）
        // 这里我们允许active状态的套餐显示
        if ($this->sync_status === self::SYNC_STATUS_EXPIRED) {
            return false;
        }

        return true;
    }
}
