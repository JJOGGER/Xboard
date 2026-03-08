<?php

namespace App\Services;

use App\Models\SharedPlan;
use App\Models\PlanSlot;
use App\ValueObjects\TrafficInfo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;

class SubscriptionImportService
{
    private SubscriptionParserService $parser;

    // URL验证常量
    private const MAX_URL_LENGTH = 2048;
    private const FETCH_TIMEOUT = 30; // 秒
    private const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB

    // 内网IP范围（CIDR格式）
    private const PRIVATE_IP_RANGES = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.0/8',
        '169.254.0.0/16',
        'fc00::/7',
        'fe80::/10',
        '::1/128',
    ];

    public function __construct(SubscriptionParserService $parser)
    {
        $this->parser = $parser;
    }

    /**
     * 验证订阅URL
     * 
     * @param string $url
     * @return bool
     * @throws \InvalidArgumentException
     */
    public function validateSubscriptionUrl(string $url): bool
    {
        // 1. 检查URL长度
        if (strlen($url) > self::MAX_URL_LENGTH) {
            throw new \InvalidArgumentException(
                "URL length exceeds maximum allowed length of " . self::MAX_URL_LENGTH . " characters"
            );
        }

        // 2. 验证URL格式
        $parsed = parse_url($url);
        if ($parsed === false || !isset($parsed['scheme']) || !isset($parsed['host'])) {
            throw new \InvalidArgumentException("Invalid URL format");
        }

        // 3. 检查协议（只允许HTTP/HTTPS）
        if (!in_array(strtolower($parsed['scheme']), ['http', 'https'])) {
            throw new \InvalidArgumentException("Only HTTP and HTTPS protocols are allowed");
        }

        // 4. 防止内网IP访问
        $host = $parsed['host'];
        
        // 解析主机名为IP地址
        $ip = $this->resolveHostToIp($host);
        if ($ip && $this->isPrivateIp($ip)) {
            throw new \InvalidArgumentException("Access to private IP addresses is not allowed");
        }

        return true;
    }

    /**
     * 解析主机名为IP地址
     * 
     * @param string $host
     * @return string|null
     */
    private function resolveHostToIp(string $host): ?string
    {
        // 如果已经是IP地址，直接返回
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return $host;
        }

        // 尝试解析域名
        $ip = gethostbyname($host);
        
        // 如果解析失败，gethostbyname返回原主机名
        if ($ip === $host) {
            return null;
        }

        return $ip;
    }

    /**
     * 检查IP是否为内网IP
     * 
     * @param string $ip
     * @return bool
     */
    private function isPrivateIp(string $ip): bool
    {
        // 检查是否为有效的IP地址
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        // 检查IPv4私有地址
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            // 使用filter_var的私有地址检查
            if (!filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            )) {
                return true;
            }
        }

        // 检查IPv6私有地址
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            // 检查本地链路地址和唯一本地地址
            if (str_starts_with($ip, 'fe80:') || str_starts_with($ip, 'fc') || str_starts_with($ip, 'fd')) {
                return true;
            }
            // 检查回环地址
            if ($ip === '::1') {
                return true;
            }
        }

        return false;
    }

    /**
     * 获取订阅内容
     * 
     * @param string $url 订阅URL
     * @param array $authParams 认证参数（可选）
     * @return array ['content' => string, 'headers' => array, 'statusCode' => int]
     * @throws \Exception
     */
    public function fetchSubscription(string $url, array $authParams = []): array
    {
        // 验证URL
        $this->validateSubscriptionUrl($url);

        try {
            // 构建HTTP客户端
            $http = Http::timeout(self::FETCH_TIMEOUT)
                ->retry(3, 1000) // 重试3次，每次间隔1秒
                ->withHeaders([
                    'User-Agent' => 'XBoard-Subscription-Importer/1.0',
                ]);

            // 添加认证参数到URL
            if (!empty($authParams)) {
                $url = $this->appendAuthParams($url, $authParams);
            }

            // 发起请求
            $response = $http->get($url);

            // 检查响应状态
            if (!$response->successful()) {
                throw new \Exception(
                    "Failed to fetch subscription: HTTP {$response->status()}"
                );
            }

            // 获取响应内容
            $content = $response->body();

            // 检查内容大小
            if (strlen($content) > self::MAX_CONTENT_SIZE) {
                throw new \Exception(
                    "Subscription content exceeds maximum size of " . 
                    (self::MAX_CONTENT_SIZE / 1024 / 1024) . "MB"
                );
            }

            // 检查内容是否为空
            if (empty(trim($content))) {
                throw new \Exception("Subscription content is empty");
            }

            return [
                'content' => $content,
                'headers' => $response->headers(),
                'statusCode' => $response->status(),
            ];
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Failed to connect to subscription URL', [
                'url' => $this->sanitizeUrlForLog($url),
                'error' => $e->getMessage(),
            ]);
            throw new \Exception("Failed to connect to subscription URL: " . $e->getMessage());
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('HTTP request failed', [
                'url' => $this->sanitizeUrlForLog($url),
                'error' => $e->getMessage(),
            ]);
            throw new \Exception("HTTP request failed: " . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('Failed to fetch subscription', [
                'url' => $this->sanitizeUrlForLog($url),
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * 将认证参数添加到URL
     * 
     * @param string $url
     * @param array $authParams
     * @return string
     */
    private function appendAuthParams(string $url, array $authParams): string
    {
        $parsed = parse_url($url);
        
        // 解析现有查询参数
        $existingParams = [];
        if (isset($parsed['query'])) {
            parse_str($parsed['query'], $existingParams);
        }

        // 合并认证参数
        $allParams = array_merge($existingParams, $authParams);

        // 重建URL
        $newUrl = $parsed['scheme'] . '://' . $parsed['host'];
        
        if (isset($parsed['port'])) {
            $newUrl .= ':' . $parsed['port'];
        }
        
        if (isset($parsed['path'])) {
            $newUrl .= $parsed['path'];
        }

        if (!empty($allParams)) {
            $newUrl .= '?' . http_build_query($allParams);
        }

        if (isset($parsed['fragment'])) {
            $newUrl .= '#' . $parsed['fragment'];
        }

        return $newUrl;
    }

    /**
     * 脱敏URL用于日志记录
     * 
     * @param string $url
     * @return string
     */
    private function sanitizeUrlForLog(string $url): string
    {
        $parsed = parse_url($url);
        if (!$parsed) {
            return '***';
        }

        // 构建基础URL
        $sanitized = ($parsed['scheme'] ?? 'https') . '://';
        $sanitized .= $parsed['host'] ?? '***';
        
        if (isset($parsed['port'])) {
            $sanitized .= ':' . $parsed['port'];
        }
        
        if (isset($parsed['path'])) {
            $sanitized .= $parsed['path'];
        }

        // 脱敏查询参数
        if (isset($parsed['query'])) {
            parse_str($parsed['query'], $params);
            $sanitizedParams = [];
            
            foreach ($params as $key => $value) {
                // 敏感参数列表
                $sensitiveKeys = ['token', 'password', 'key', 'secret', 'auth'];
                
                if (in_array(strtolower($key), $sensitiveKeys)) {
                    $sanitizedParams[$key] = '***';
                } else {
                    $sanitizedParams[$key] = $value;
                }
            }
            
            if (!empty($sanitizedParams)) {
                $sanitized .= '?' . http_build_query($sanitizedParams);
            }
        }

        return $sanitized;
    }

    /**
     * 加密订阅URL
     * 
     * @param string $url
     * @return string 加密后的字符串
     */
    public function encryptSubscriptionUrl(string $url): string
    {
        try {
            return Crypt::encryptString($url);
        } catch (\Exception $e) {
            Log::error('Failed to encrypt subscription URL', [
                'error' => $e->getMessage(),
            ]);
            throw new \Exception("Failed to encrypt subscription URL");
        }
    }

    /**
     * 解密订阅URL
     * 
     * @param string $encrypted
     * @return string 解密后的URL
     */
    public function decryptSubscriptionUrl(string $encrypted): string
    {
        try {
            return Crypt::decryptString($encrypted);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt subscription URL', [
                'error' => $e->getMessage(),
            ]);
            throw new \Exception("Failed to decrypt subscription URL");
        }
    }

    /**
     * 导入订阅并创建共享套餐
     * 
     * @param string $subscriptionUrl 订阅URL
     * @param array $planData 套餐数据 ['name', 'description', 'max_slots', 'group_id', 'tags', 'prices']
     * @param array $authParams 认证参数（可选）
     * @return SharedPlan
     * @throws \Exception
     */
    public function importAndCreatePlan(
        string $subscriptionUrl,
        array $planData,
        array $authParams = []
    ): SharedPlan {
        DB::beginTransaction();

        try {
            // 1. 获取订阅内容
            $response = $this->fetchSubscription($subscriptionUrl, $authParams);
            $content = $response['content'];
            $headers = $response['headers'];

            // 2. 解析订阅内容
            $format = $this->parser->detectFormat($content);
            
            if ($format === SubscriptionParserService::FORMAT_UNKNOWN) {
                throw new \Exception(
                    'Unsupported subscription format. Supported formats: ' . 
                    implode(', ', $this->parser->getSupportedFormats())
                );
            }

            $nodes = $this->parser->parse($content);

            if (empty($nodes)) {
                throw new \Exception('No nodes found in subscription');
            }

            // 过滤假节点（订阅提供商插入的提示信息）
            $nodes = $this->filterFakeNodes($nodes);

            if (empty($nodes)) {
                throw new \Exception('No valid nodes found in subscription after filtering');
            }

            // 3. 解析流量信息（如果有）
            $trafficInfo = $this->parser->parseTrafficInfoFromHeaders($headers);

            // 4. 创建共享套餐
            $sharedPlan = new SharedPlan();
            $sharedPlan->name = $planData['name'];
            $sharedPlan->description = $planData['description'] ?? null;
            $sharedPlan->subscription_url = $subscriptionUrl; // 模型会自动加密
            $sharedPlan->subscription_format = $format;
            $sharedPlan->max_slots = $planData['max_slots'];
            $sharedPlan->used_slots = 0;
            $sharedPlan->nodes_config = $nodes;
            $sharedPlan->nodes_count = count($nodes);
            
            // 新字段（Requirements 2.1, 3.1, 4.1）
            $sharedPlan->group_id = $planData['group_id'] ?? null;
            $sharedPlan->group_ids = $planData['group_ids'] ?? null;
            $sharedPlan->device_limit = $planData['device_limit'] ?? null;
            $sharedPlan->tags = $planData['tags'] ?? null;
            // 价格从元转换为分存储到数据库
            $sharedPlan->prices = $this->convertPricesToCents($planData['prices'] ?? []);
            
            $sharedPlan->is_visible = true;
            $sharedPlan->sync_status = SharedPlan::SYNC_STATUS_ACTIVE;
            $sharedPlan->sync_fail_count = 0;
            $sharedPlan->last_sync_at = now();

            // 设置流量信息
            if ($trafficInfo) {
                $sharedPlan->total_traffic = $trafficInfo->total;
                $sharedPlan->used_traffic = $trafficInfo->getUsed();
                
                if ($trafficInfo->expire) {
                    $sharedPlan->expire_at = \Carbon\Carbon::createFromTimestamp($trafficInfo->expire);
                }
            }

            $sharedPlan->save();

            DB::commit();

            Log::info('Successfully created shared plan from subscription', [
                'plan_id' => $sharedPlan->id,
                'plan_name' => $sharedPlan->name,
                'format' => $format,
                'nodes_count' => count($nodes),
                'max_slots' => $sharedPlan->max_slots,
                'group_id' => $sharedPlan->group_id,
                'tags' => $sharedPlan->tags,
            ]);

            return $sharedPlan;
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to import subscription and create plan', [
                'url' => $this->sanitizeUrlForLog($subscriptionUrl),
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * 将价格从元转换为分
     * 
     * @param array $prices 价格数组（单位：元）
     * @return array 价格数组（单位：分）
     */
    private function convertPricesToCents(array $prices): array
    {
        $convertedPrices = [];
        
        foreach ($prices as $period => $price) {
            if (is_numeric($price) && $price > 0) {
                // 将元转换为分（乘以100）
                $convertedPrices[$period] = (int) round($price * 100);
            } else {
                $convertedPrices[$period] = 0;
            }
        }
        
        return $convertedPrices;
    }

    /**
     * 检查套餐是否已满
     * 
     * @param int $planId
     * @return bool
     */
    public function isPlanFull(int $planId): bool
    {
        $plan = SharedPlan::find($planId);
        
        if (!$plan) {
            throw new \Exception("Shared plan not found");
        }

        return !$plan->hasAvailableSlots();
    }

    /**
     * 为用户分配slot
     * 
     * Requirements 2.5, 9.3, 9.4, 9.5:
     * - 分配slot给用户
     * - 根据选择的周期计算过期时间
     * - 分配服务器组给用户
     * 
     * @param int $planId
     * @param int $userId
     * @param int|null $orderId
     * @param int|null $durationDays 有效期天数（可选，如果为null则使用套餐的第一个定价周期）
     * @return PlanSlot
     * @throws \Exception
     */
    public function allocateSlot(int $planId, int $userId, ?int $orderId = null, ?int $durationDays = null): PlanSlot
    {
        return DB::transaction(function () use ($planId, $userId, $orderId, $durationDays) {
            // 使用行锁获取套餐
            $plan = SharedPlan::where('id', $planId)
                ->lockForUpdate()
                ->first();

            if (!$plan) {
                throw new \Exception("Shared plan not found");
            }

            // 由于 v2_plan_slots.uk_plan_user (shared_plan_id,user_id) 为唯一索引，
            // 这里必须复用已有记录（哪怕是 expired/cancelled），否则会触发 Duplicate entry。
            $existingSlot = PlanSlot::where('shared_plan_id', $planId)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->first();

            if ($existingSlot) {
                $wasActive = ($existingSlot->status === PlanSlot::STATUS_ACTIVE)
                    && ($existingSlot->expire_at && $existingSlot->expire_at->isFuture());

                // If no duration specified, infer from pricing tiers.
                if ($durationDays === null) {
                    $pricingTiers = $plan->getActivePricingTiers();
                    if (empty($pricingTiers)) {
                        throw new \Exception("No pricing tiers available for this plan");
                    }

                    $firstTier = reset($pricingTiers);
                    $durationDays = $firstTier['period']['days'];
                }

                // 如果是从非活跃状态重开，会重新占用一个 slot，需要检查容量并计数 +1。
                if (!$wasActive) {
                    if (!$plan->hasAvailableSlots()) {
                        throw new \Exception("No available slots for this plan");
                    }
                }

                // Rotate token so the user always gets a fresh per-slot subscribe token.
                $existingSlot->subscription_token = PlanSlot::generateUniqueToken();
                $existingSlot->allocated_at = now();
                $existingSlot->released_at = null;
                $existingSlot->status = PlanSlot::STATUS_ACTIVE;

                if ($durationDays > 0) {
                    $base = $existingSlot->expire_at && $existingSlot->expire_at->isFuture()
                        ? $existingSlot->expire_at
                        : now();
                    $existingSlot->expire_at = $base->copy()->addDays($durationDays);
                } else {
                    // Permanent
                    $existingSlot->expire_at = now()->addYears(50);
                }

                // Attach latest order id for audit/reference.
                $existingSlot->order_id = $orderId;
                $existingSlot->save();

                if (!$wasActive) {
                    $plan->incrementUsedSlots();
                    $plan->updateVisibility();
                }

                Log::info($wasActive ? 'Renewed existing slot' : 'Reactivated existing slot', [
                    'plan_id' => $planId,
                    'user_id' => $userId,
                    'slot_id' => $existingSlot->id,
                    'duration_days' => $durationDays,
                ]);

                return $existingSlot;
            }

            // 如果没有提供duration，从套餐的prices中获取第一个周期的天数
            if ($durationDays === null) {
                $pricingTiers = $plan->getActivePricingTiers();
                if (empty($pricingTiers)) {
                    throw new \Exception("No pricing tiers available for this plan");
                }
                
                $firstTier = reset($pricingTiers);
                $durationDays = $firstTier['period']['days'];
            }

            // 生成唯一token
            $token = PlanSlot::generateUniqueToken();

            // 创建slot记录
            $slot = new PlanSlot();
            $slot->shared_plan_id = $planId;
            $slot->user_id = $userId;
            $slot->order_id = $orderId;
            $slot->subscription_token = $token;
            $slot->allocated_at = now();

            // 检查是否有可用slot（仅当需要创建新记录时）
            if (!$plan->hasAvailableSlots()) {
                throw new \Exception("No available slots for this plan");
            }
            
            // 根据周期设置过期时间
            // 如果是一次性套餐（days = -1），则不设置过期时间
            if ($durationDays > 0) {
                $slot->expire_at = now()->addDays($durationDays);
            } else {
                // v2_plan_slots.expire_at 在表结构中为非空，这里用一个足够远的时间表示“永久有效”
                $slot->expire_at = now()->addYears(50);
            }
            
            $slot->status = PlanSlot::STATUS_ACTIVE;
            $slot->save();

            // 增加已用slot计数
            $plan->incrementUsedSlots();

            // 更新套餐可见性
            $plan->updateVisibility();

            Log::info('Successfully allocated slot', [
                'plan_id' => $planId,
                'user_id' => $userId,
                'slot_id' => $slot->id,
                'token' => substr($token, 0, 8) . '...',
                'duration_days' => $durationDays,
            ]);

            return $slot;
        });
    }

    /**
     * 释放slot
     * 
     * @param int $slotId
     * @return bool
     * @throws \Exception
     */
    public function releaseSlot(int $slotId): bool
    {
        return DB::transaction(function () use ($slotId) {
            $slot = PlanSlot::where('id', $slotId)
                ->lockForUpdate()
                ->first();

            if (!$slot) {
                throw new \Exception("Slot not found");
            }

            if ($slot->released_at !== null) {
                return false; // 已经释放过了
            }

            // 释放slot
            $slot->release();

            // 减少套餐的已用slot计数
            $plan = SharedPlan::where('id', $slot->shared_plan_id)
                ->lockForUpdate()
                ->first();

            if ($plan) {
                $plan->decrementUsedSlots();

                // 更新套餐可见性
                $plan->updateVisibility();
            }

            Log::info('Successfully released slot', [
                'slot_id' => $slotId,
                'plan_id' => $slot->shared_plan_id,
                'user_id' => $slot->user_id,
            ]);

            return true;
        });
    }

    /**
     * 过滤假节点（订阅提供商插入的提示信息）
     * 
     * 某些订阅提供商会在订阅中插入假节点作为提示信息，
     * 这些节点通常使用特殊的服务器地址（如1.1.1.1）和端口（如1080）
     * 
     * @param array $nodes
     * @return array
     */
    private function filterFakeNodes(array $nodes): array
    {
        return array_values(array_filter($nodes, function ($node) {
            // 过滤条件：
            // 1. 服务器地址是 1.1.1.1（Cloudflare DNS，不是真实节点）
            // 2. 端口是 1080（SOCKS代理端口，不是VPN节点端口）
            // 3. 密码包含 "fake" 关键字
            
            $isFakeServer = isset($node['server']) && $node['server'] === '1.1.1.1';
            $isFakePort = isset($node['port']) && $node['port'] === 1080;
            $isFakePassword = isset($node['password']) && 
                              str_contains(strtolower($node['password']), 'fake');
            
            // 如果同时满足假服务器和假端口，则认为是假节点
            if ($isFakeServer && $isFakePort) {
                Log::debug('Filtered fake node', [
                    'name' => $node['name'] ?? 'Unknown',
                    'server' => $node['server'] ?? 'Unknown',
                    'port' => $node['port'] ?? 'Unknown',
                ]);
                return false;
            }
            
            // 如果密码包含fake且服务器是1.1.1.1，也认为是假节点
            if ($isFakeServer && $isFakePassword) {
                Log::debug('Filtered fake node by password', [
                    'name' => $node['name'] ?? 'Unknown',
                    'server' => $node['server'] ?? 'Unknown',
                ]);
                return false;
            }
            
            return true;
        }));
    }
}
