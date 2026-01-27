<?php

namespace App\ValueObjects;

/**
 * 流量信息值对象
 * 
 * 用于表示订阅的流量使用情况和过期时间
 */
class TrafficInfo
{
    /**
     * @param int $upload 上传流量（字节）
     * @param int $download 下载流量（字节）
     * @param int $total 总流量（字节）
     * @param int|null $expire 过期时间戳（Unix timestamp），null表示无过期时间
     */
    public function __construct(
        public int $upload,
        public int $download,
        public int $total,
        public ?int $expire = null
    ) {}

    /**
     * 获取已使用流量（上传+下载）
     * 
     * @return int 已使用流量（字节）
     */
    public function getUsed(): int
    {
        return $this->upload + $this->download;
    }

    /**
     * 获取剩余流量
     * 
     * @return int 剩余流量（字节），最小为0
     */
    public function getRemaining(): int
    {
        return max(0, $this->total - $this->getUsed());
    }

    /**
     * 检查订阅是否已过期
     * 
     * @return bool true表示已过期，false表示未过期或无过期时间
     */
    public function isExpired(): bool
    {
        return $this->expire !== null && $this->expire < time();
    }

    /**
     * 检查流量是否已耗尽
     * 
     * @return bool true表示流量已用完
     */
    public function isExhausted(): bool
    {
        return $this->getRemaining() === 0;
    }

    /**
     * 获取流量使用百分比
     * 
     * @return float 使用百分比（0-100）
     */
    public function getUsagePercentage(): float
    {
        if ($this->total === 0) {
            return 0.0;
        }
        
        return min(100.0, ($this->getUsed() / $this->total) * 100);
    }

    /**
     * 转换为数组
     * 
     * @return array
     */
    public function toArray(): array
    {
        return [
            'upload' => $this->upload,
            'download' => $this->download,
            'total' => $this->total,
            'used' => $this->getUsed(),
            'remaining' => $this->getRemaining(),
            'expire' => $this->expire,
            'is_expired' => $this->isExpired(),
            'is_exhausted' => $this->isExhausted(),
            'usage_percentage' => $this->getUsagePercentage(),
        ];
    }

    /**
     * 从数组创建TrafficInfo实例
     * 
     * @param array $data
     * @return self
     */
    public static function fromArray(array $data): self
    {
        return new self(
            upload: $data['upload'] ?? 0,
            download: $data['download'] ?? 0,
            total: $data['total'] ?? 0,
            expire: $data['expire'] ?? null
        );
    }
}
