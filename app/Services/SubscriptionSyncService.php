<?php

namespace App\Services;

use App\Models\SharedPlan;
use App\Models\SubscriptionSyncLog;
use App\Jobs\SendEmailJob;
use App\ValueObjects\TrafficInfo;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

/**
 * 订阅同步服务
 * 
 * 负责定期从第三方订阅URL获取最新内容，更新节点配置和流量信息
 */
class SubscriptionSyncService
{
    private SubscriptionImportService $importService;
    private SubscriptionParserService $parserService;

    // 同步配置常量
    private const BATCH_SIZE = 10; // 每批处理的套餐数量
    private const FAIL_THRESHOLD = 3; // 连续失败阈值
    private const EXPIRY_WARNING_DAYS = 7; // 过期预警天数
    private const TRAFFIC_WARNING_PERCENTAGE = 10; // 流量预警百分比

    public function __construct(
        SubscriptionImportService $importService,
        SubscriptionParserService $parserService
    ) {
        $this->importService = $importService;
        $this->parserService = $parserService;
    }

    /**
     * 同步所有共享套餐的订阅
     * 
     * Requirements 6.1, 6.2:
     * - 遍历所有共享套餐
     * - 批量处理（每批10个）
     * - 并行请求订阅URL
     * 
     * @return array 同步结果统计
     */
    public function syncAll(): array
    {
        $startTime = microtime(true);
        $stats = [
            'total' => 0,
            'success' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];

        Log::info('Starting subscription sync for all shared plans');

        try {
            // 获取所有需要同步的共享套餐
            $plans = SharedPlan::query()
                ->whereIn('sync_status', [
                    SharedPlan::SYNC_STATUS_ACTIVE,
                    SharedPlan::SYNC_STATUS_FAILED,
                ])
                ->get();

            $stats['total'] = $plans->count();

            if ($stats['total'] === 0) {
                Log::info('No shared plans to sync');
                return $stats;
            }

            // 分批处理
            $plans->chunk(self::BATCH_SIZE)->each(function (Collection $batch) use (&$stats) {
                foreach ($batch as $plan) {
                    try {
                        $result = $this->syncSubscription($plan->id);
                        
                        if ($result['success']) {
                            $stats['success']++;
                        } else {
                            $stats['failed']++;
                        }
                    } catch (\Exception $e) {
                        $stats['failed']++;
                        Log::error('Failed to sync plan', [
                            'plan_id' => $plan->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

            $duration = round((microtime(true) - $startTime) * 1000);

            Log::info('Completed subscription sync', [
                'stats' => $stats,
                'duration_ms' => $duration,
            ]);

            return $stats;
        } catch (\Exception $e) {
            Log::error('Failed to sync all subscriptions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * 同步单个订阅
     * 
     * @param int $planId 套餐ID
     * @return array ['success' => bool, 'error' => string|null, 'duration_ms' => int]
     */
    public function syncSubscription(int $planId): array
    {
        $startTime = microtime(true);
        $result = [
            'success' => false,
            'error' => null,
            'duration_ms' => 0,
        ];

        try {
            $plan = SharedPlan::find($planId);

            if (!$plan) {
                $result['error'] = "Shared plan not found: {$planId}";
                return $result;
            }

            Log::info('Syncing subscription', [
                'plan_id' => $planId,
                'plan_name' => $plan->name,
            ]);

            // 获取订阅内容
            $subscriptionUrl = $plan->subscription_url;
            $response = $this->importService->fetchSubscription($subscriptionUrl);

            // 解析订阅内容
            $nodes = $this->parserService->parse($response['content']);

            if (empty($nodes)) {
                throw new \Exception('No nodes found in subscription');
            }

            // 解析流量信息
            $trafficInfo = $this->parserService->parseTrafficInfoFromHeaders($response['headers']);

            // 成功同步 - 更新配置
            $this->updatePlanOnSuccess($plan, $nodes, $trafficInfo);

            $result['success'] = true;
            $result['duration_ms'] = round((microtime(true) - $startTime) * 1000);

            // 记录成功日志
            $this->logSync($planId, true, count($nodes), $trafficInfo, null, $result['duration_ms']);

            // 检查是否需要发送预警通知
            $this->checkAndSendWarnings($plan);

            Log::info('Successfully synced subscription', [
                'plan_id' => $planId,
                'nodes_count' => count($nodes),
                'duration_ms' => $result['duration_ms'],
            ]);

            return $result;
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
            $result['duration_ms'] = round((microtime(true) - $startTime) * 1000);

            // 失败同步 - 保留配置
            if (isset($plan)) {
                $this->updatePlanOnFailure($plan, $e->getMessage());
                
                // 记录失败日志
                $this->logSync($planId, false, null, null, $e->getMessage(), $result['duration_ms']);

                // 检查是否需要通知管理员
                if ($this->shouldNotifyAdmin($plan)) {
                    $this->notifyAdminOfFailure($plan);
                }
            }

            Log::error('Failed to sync subscription', [
                'plan_id' => $planId,
                'error' => $e->getMessage(),
                'duration_ms' => $result['duration_ms'],
            ]);

            return $result;
        }
    }

    /**
     * 成功同步后更新套餐配置
     * 
     * Requirements 6.3, 6.6:
     * - 解析新的订阅内容
     * - 更新nodes_config字段
     * - 更新流量信息
     * - 更新last_sync_at时间戳
     * - 重置sync_fail_count
     * 
     * @param SharedPlan $plan
     * @param array $nodes
     * @param TrafficInfo|null $trafficInfo
     * @return void
     */
    private function updatePlanOnSuccess(
        SharedPlan $plan,
        array $nodes,
        ?TrafficInfo $trafficInfo
    ): void {
        DB::transaction(function () use ($plan, $nodes, $trafficInfo) {
            // 更新节点配置
            $plan->nodes_config = $nodes;
            $plan->nodes_count = count($nodes);

            // 更新流量信息
            if ($trafficInfo) {
                $plan->total_traffic = $trafficInfo->total;
                $plan->used_traffic = $trafficInfo->getUsed();

                if ($trafficInfo->expire) {
                    $plan->expire_at = \Carbon\Carbon::createFromTimestamp($trafficInfo->expire);
                }
            }

            // 更新同步状态
            $plan->last_sync_at = now();
            $plan->sync_status = SharedPlan::SYNC_STATUS_ACTIVE;
            $plan->sync_error = null;
            $plan->sync_fail_count = 0;

            $plan->save();

            // 更新套餐可见性（基于过期状态和流量状态）
            $plan->updateVisibility();
        });
    }

    /**
     * 失败同步后更新套餐状态
     * 
     * Requirements 6.4:
     * - 保持原有nodes_config不变
     * - 更新sync_status为failed
     * - 记录错误信息
     * - 增加sync_fail_count
     * 
     * @param SharedPlan $plan
     * @param string $errorMessage
     * @return void
     */
    private function updatePlanOnFailure(SharedPlan $plan, string $errorMessage): void
    {
        DB::transaction(function () use ($plan, $errorMessage) {
            // 不修改nodes_config，保留上次成功的配置

            // 更新同步状态
            $plan->sync_status = SharedPlan::SYNC_STATUS_FAILED;
            $plan->sync_error = $errorMessage;
            $plan->sync_fail_count++;

            $plan->save();
        });
    }

    /**
     * 记录同步日志
     * 
     * Requirements 10.1:
     * - 记录每次同步的结果
     * - 保存到subscription_sync_logs表
     * - 包含节点数量、流量信息、错误信息、耗时等
     * 
     * @param int $planId
     * @param bool $success
     * @param int|null $nodesCount
     * @param TrafficInfo|null $trafficInfo
     * @param string|null $error
     * @param int|null $durationMs
     * @return void
     */
    private function logSync(
        int $planId,
        bool $success,
        ?int $nodesCount = null,
        ?TrafficInfo $trafficInfo = null,
        ?string $error = null,
        ?int $durationMs = null
    ): void {
        try {
            $trafficInfoArray = null;
            if ($trafficInfo) {
                $trafficInfoArray = [
                    'upload' => $trafficInfo->upload,
                    'download' => $trafficInfo->download,
                    'total' => $trafficInfo->total,
                    'expire' => $trafficInfo->expire,
                ];
            }

            if ($success) {
                SubscriptionSyncLog::logSuccess(
                    $planId,
                    $nodesCount ?? 0,
                    $trafficInfoArray,
                    $durationMs
                );
            } else {
                SubscriptionSyncLog::logFailure(
                    $planId,
                    $error ?? 'Unknown error',
                    $durationMs
                );
            }
        } catch (\Exception $e) {
            Log::error('Failed to log sync result', [
                'plan_id' => $planId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * 检查是否需要通知管理员
     * 
     * Requirements 6.5:
     * - 检查sync_fail_count是否达到阈值
     * 
     * @param SharedPlan $plan
     * @return bool
     */
    private function shouldNotifyAdmin(SharedPlan $plan): bool
    {
        return $plan->sync_fail_count >= self::FAIL_THRESHOLD;
    }

    /**
     * 通知管理员订阅同步失败
     * 
     * Requirements 6.5:
     * - 发送管理员通知（邮件或系统通知）
     * 
     * @param SharedPlan $plan
     * @return void
     */
    private function notifyAdminOfFailure(SharedPlan $plan): void
    {
        try {
            $appName = admin_setting('app_name', 'XBoard');
            $adminEmail = admin_setting('admin_email');

            if (!$adminEmail) {
                Log::warning('Admin email not configured, cannot send notification', [
                    'plan_id' => $plan->id,
                ]);
                return;
            }

            $subject = "[{$appName}] 共享套餐订阅同步失败警告";
            $content = "
                <h2>共享套餐订阅同步失败</h2>
                <p>以下共享套餐的订阅已连续失败 {$plan->sync_fail_count} 次：</p>
                <ul>
                    <li><strong>套餐名称：</strong>{$plan->name}</li>
                    <li><strong>套餐ID：</strong>{$plan->id}</li>
                    <li><strong>连续失败次数：</strong>{$plan->sync_fail_count}</li>
                    <li><strong>最后错误：</strong>{$plan->sync_error}</li>
                    <li><strong>订阅URL：</strong>{$plan->getMaskedSubscriptionUrl()}</li>
                </ul>
                <p>请检查订阅URL是否有效，或联系上游供应商。</p>
            ";

            SendEmailJob::dispatch([
                'email' => $adminEmail,
                'subject' => $subject,
                'template_name' => 'notify',
                'template_value' => [
                    'name' => 'Admin',
                    'content' => $content,
                    'url' => admin_setting('app_url') . '/admin/shared-plans/' . $plan->id,
                ],
            ]);

            Log::info('Sent admin notification for subscription sync failure', [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'fail_count' => $plan->sync_fail_count,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send admin notification', [
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * 检查并发送预警通知
     * 
     * Requirements 10.4, 10.5:
     * - 检查订阅即将过期（7天内）
     * - 检查流量即将用完（<10%）
     * 
     * @param SharedPlan $plan
     * @return void
     */
    private function checkAndSendWarnings(SharedPlan $plan): void
    {
        // 检查过期预警
        if ($this->shouldWarnExpiry($plan)) {
            $this->sendExpiryWarning($plan);
        }

        // 检查流量预警
        if ($this->shouldWarnTraffic($plan)) {
            $this->sendTrafficWarning($plan);
        }
    }

    /**
     * 检查是否需要发送过期预警
     * 
     * @param SharedPlan $plan
     * @return bool
     */
    private function shouldWarnExpiry(SharedPlan $plan): bool
    {
        if (!$plan->expire_at) {
            return false;
        }

        $daysUntilExpiry = now()->diffInDays($plan->expire_at, false);
        
        // 如果在7天内过期且还未过期
        return $daysUntilExpiry >= 0 && $daysUntilExpiry <= self::EXPIRY_WARNING_DAYS;
    }

    /**
     * 检查是否需要发送流量预警
     * 
     * @param SharedPlan $plan
     * @return bool
     */
    private function shouldWarnTraffic(SharedPlan $plan): bool
    {
        $percentage = $plan->getTrafficUsagePercentage();
        
        if ($percentage === null) {
            return false;
        }

        // 如果剩余流量少于10%
        return $percentage >= (100 - self::TRAFFIC_WARNING_PERCENTAGE);
    }

    /**
     * 发送过期预警通知
     * 
     * @param SharedPlan $plan
     * @return void
     */
    private function sendExpiryWarning(SharedPlan $plan): void
    {
        try {
            $appName = admin_setting('app_name', 'XBoard');
            $adminEmail = admin_setting('admin_email');

            if (!$adminEmail) {
                return;
            }

            $daysUntilExpiry = now()->diffInDays($plan->expire_at, false);
            $expiryDate = $plan->expire_at->format('Y-m-d H:i:s');

            $subject = "[{$appName}] 共享套餐订阅即将过期提醒";
            $content = "
                <h2>共享套餐订阅即将过期</h2>
                <p>以下共享套餐的订阅将在 {$daysUntilExpiry} 天后过期：</p>
                <ul>
                    <li><strong>套餐名称：</strong>{$plan->name}</li>
                    <li><strong>套餐ID：</strong>{$plan->id}</li>
                    <li><strong>过期时间：</strong>{$expiryDate}</li>
                    <li><strong>剩余天数：</strong>{$daysUntilExpiry} 天</li>
                </ul>
                <p>请及时续费以避免服务中断。</p>
            ";

            SendEmailJob::dispatch([
                'email' => $adminEmail,
                'subject' => $subject,
                'template_name' => 'notify',
                'template_value' => [
                    'name' => 'Admin',
                    'content' => $content,
                    'url' => admin_setting('app_url') . '/admin/shared-plans/' . $plan->id,
                ],
            ]);

            Log::info('Sent expiry warning notification', [
                'plan_id' => $plan->id,
                'days_until_expiry' => $daysUntilExpiry,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send expiry warning', [
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * 发送流量预警通知
     * 
     * @param SharedPlan $plan
     * @return void
     */
    private function sendTrafficWarning(SharedPlan $plan): void
    {
        try {
            $appName = admin_setting('app_name', 'XBoard');
            $adminEmail = admin_setting('admin_email');

            if (!$adminEmail) {
                return;
            }

            $percentage = $plan->getTrafficUsagePercentage();
            $remaining = $plan->getRemainingTraffic();
            $remainingGB = round($remaining / 1024 / 1024 / 1024, 2);

            $subject = "[{$appName}] 共享套餐流量即将用完提醒";
            $content = "
                <h2>共享套餐流量即将用完</h2>
                <p>以下共享套餐的流量使用已达到 " . round($percentage, 2) . "%：</p>
                <ul>
                    <li><strong>套餐名称：</strong>{$plan->name}</li>
                    <li><strong>套餐ID：</strong>{$plan->id}</li>
                    <li><strong>流量使用率：</strong>" . round($percentage, 2) . "%</li>
                    <li><strong>剩余流量：</strong>{$remainingGB} GB</li>
                </ul>
                <p>请及时充值或更换订阅以避免服务中断。</p>
            ";

            SendEmailJob::dispatch([
                'email' => $adminEmail,
                'subject' => $subject,
                'template_name' => 'notify',
                'template_value' => [
                    'name' => 'Admin',
                    'content' => $content,
                    'url' => admin_setting('app_url') . '/admin/shared-plans/' . $plan->id,
                ],
            ]);

            Log::info('Sent traffic warning notification', [
                'plan_id' => $plan->id,
                'usage_percentage' => round($percentage, 2),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send traffic warning', [
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * 解析订阅响应头中的流量信息
     * 
     * @param array $headers
     * @return TrafficInfo|null
     */
    public function parseTrafficInfo(array $headers): ?TrafficInfo
    {
        return $this->parserService->parseTrafficInfoFromHeaders($headers);
    }

    /**
     * 更新套餐状态
     * 
     * @param int $planId
     * @param string $status
     * @return void
     */
    public function updatePlanStatus(int $planId, string $status): void
    {
        $plan = SharedPlan::find($planId);

        if (!$plan) {
            throw new \Exception("Shared plan not found: {$planId}");
        }

        $plan->sync_status = $status;
        $plan->save();

        // 更新可见性
        $plan->updateVisibility();
    }
}
