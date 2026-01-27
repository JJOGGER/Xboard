<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * App\Models\SubscriptionSyncLog
 *
 * @property int $id
 * @property int $shared_plan_id 共享套餐ID
 * @property string $sync_status 同步状态
 * @property int|null $nodes_count 同步到的节点数
 * @property array|null $traffic_info 流量信息快照
 * @property string|null $error_message 错误信息
 * @property int|null $duration_ms 同步耗时（毫秒）
 * @property \Illuminate\Support\Carbon $created_at
 *
 * @property-read SharedPlan $sharedPlan
 */
class SubscriptionSyncLog extends Model
{
    protected $table = 'v2_subscription_sync_logs';

    // 同步状态常量
    public const SYNC_STATUS_SUCCESS = 'success';
    public const SYNC_STATUS_FAILED = 'failed';

    // 禁用updated_at字段
    public const UPDATED_AT = null;

    protected $fillable = [
        'shared_plan_id',
        'sync_status',
        'nodes_count',
        'traffic_info',
        'error_message',
        'duration_ms',
    ];

    protected $casts = [
        'shared_plan_id' => 'integer',
        'nodes_count' => 'integer',
        'duration_ms' => 'integer',
        'traffic_info' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * 获取关联的共享套餐
     */
    public function sharedPlan(): BelongsTo
    {
        return $this->belongsTo(SharedPlan::class, 'shared_plan_id');
    }

    /**
     * 创建成功的同步日志
     */
    public static function logSuccess(
        int $sharedPlanId,
        int $nodesCount,
        ?array $trafficInfo = null,
        ?int $durationMs = null
    ): self {
        return self::create([
            'shared_plan_id' => $sharedPlanId,
            'sync_status' => self::SYNC_STATUS_SUCCESS,
            'nodes_count' => $nodesCount,
            'traffic_info' => $trafficInfo,
            'duration_ms' => $durationMs,
        ]);
    }

    /**
     * 创建失败的同步日志
     */
    public static function logFailure(
        int $sharedPlanId,
        string $errorMessage,
        ?int $durationMs = null
    ): self {
        return self::create([
            'shared_plan_id' => $sharedPlanId,
            'sync_status' => self::SYNC_STATUS_FAILED,
            'error_message' => $errorMessage,
            'duration_ms' => $durationMs,
        ]);
    }

    /**
     * 检查是否成功
     */
    public function isSuccess(): bool
    {
        return $this->sync_status === self::SYNC_STATUS_SUCCESS;
    }

    /**
     * 检查是否失败
     */
    public function isFailed(): bool
    {
        return $this->sync_status === self::SYNC_STATUS_FAILED;
    }

    /**
     * 获取格式化的同步耗时
     */
    public function getFormattedDuration(): string
    {
        if ($this->duration_ms === null) {
            return 'N/A';
        }

        if ($this->duration_ms < 1000) {
            return $this->duration_ms . 'ms';
        }

        return round($this->duration_ms / 1000, 2) . 's';
    }

    /**
     * 获取流量信息的可读格式
     */
    public function getFormattedTrafficInfo(): ?array
    {
        if ($this->traffic_info === null) {
            return null;
        }

        $formatBytes = function ($bytes) {
            if ($bytes === null) {
                return 'N/A';
            }

            $units = ['B', 'KB', 'MB', 'GB', 'TB'];
            $bytes = max($bytes, 0);
            $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
            $pow = min($pow, count($units) - 1);

            $bytes /= pow(1024, $pow);

            return round($bytes, 2) . ' ' . $units[$pow];
        };

        return [
            'upload' => $formatBytes($this->traffic_info['upload'] ?? null),
            'download' => $formatBytes($this->traffic_info['download'] ?? null),
            'total' => $formatBytes($this->traffic_info['total'] ?? null),
            'used' => $formatBytes(
                ($this->traffic_info['upload'] ?? 0) + ($this->traffic_info['download'] ?? 0)
            ),
            'remaining' => $formatBytes(
                max(0, ($this->traffic_info['total'] ?? 0) - 
                    (($this->traffic_info['upload'] ?? 0) + ($this->traffic_info['download'] ?? 0)))
            ),
        ];
    }

    /**
     * Scope: 只查询成功的日志
     */
    public function scopeSuccess($query)
    {
        return $query->where('sync_status', self::SYNC_STATUS_SUCCESS);
    }

    /**
     * Scope: 只查询失败的日志
     */
    public function scopeFailed($query)
    {
        return $query->where('sync_status', self::SYNC_STATUS_FAILED);
    }

    /**
     * Scope: 按时间倒序
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope: 指定时间范围
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}
