<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\PlanSlot;
use App\Models\SubscriptionSyncLog;
use App\Services\SubscriptionImportService;
use App\Services\SubscriptionParserService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * 共享套餐管理控制器
 * 
 * 管理员用于管理第三方订阅导入的共享套餐
 */
class SharedPlanController extends Controller
{
    private SubscriptionImportService $importService;
    private SubscriptionParserService $parserService;

    public function __construct(
        SubscriptionImportService $importService,
        SubscriptionParserService $parserService
    ) {
        $this->importService = $importService;
        $this->parserService = $parserService;
    }

    /**
     * 8.0 预览订阅内容（导入前）
     * POST /api/v2/{admin_path}/shared-plans/preview
     * 
     * Requirements: 1.1, 1.2, 3.2
     */
    public function preview(Request $request): JsonResponse
    {
        // 验证请求数据
        $validator = Validator::make($request->all(), [
            'subscription_url' => 'required|string|max:2048',
            'auth_params' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->fail([400, $validator->errors()->first()]);
        }

        try {
            $subscriptionUrl = $request->input('subscription_url');
            $authParams = $request->input('auth_params', []);

            // 1. 获取订阅内容
            $response = $this->importService->fetchSubscription($subscriptionUrl, $authParams);
            $content = $response['content'];
            $headers = $response['headers'];

            // 2. 检测订阅格式
            $format = $this->parserService->detectFormat($content);
            
            if ($format === SubscriptionParserService::FORMAT_UNKNOWN) {
                return $this->fail([400, 
                    'Unsupported subscription format. Supported formats: ' . 
                    implode(', ', $this->parserService->getSupportedFormats())
                ]);
            }

            // 3. 解析节点
            $nodes = $this->parserService->parse($content);

            if (empty($nodes)) {
                return $this->fail([400, 'No nodes found in subscription']);
            }

            // 4. 过滤假节点（订阅提供商插入的提示信息）
            $nodes = $this->filterFakeNodes($nodes);

            if (empty($nodes)) {
                return $this->fail([400, 'No valid nodes found in subscription after filtering']);
            }

            // 5. 解析流量信息（如果有）
            $trafficInfo = $this->parserService->parseTrafficInfoFromHeaders($headers);

            // 6. 返回预览数据
            $previewData = [
                'format' => $format,
                'nodes_count' => count($nodes),
                'nodes' => $nodes, // 返回所有节点（Requirements 1.1, 1.2）
                'traffic_info' => null,
            ];

            if ($trafficInfo) {
                $expireAt = null;
                $remainingDays = null;
                $usagePercentage = null;
                
                // 计算过期时间和剩余天数（Requirements 1.5, 1.6）
                if ($trafficInfo->expire) {
                    $expireAt = \Carbon\Carbon::createFromTimestamp($trafficInfo->expire);
                    $remainingDays = max(0, now()->diffInDays($expireAt, false));
                    if ($remainingDays < 0) {
                        $remainingDays = 0;
                    }
                }
                
                // 计算流量使用百分比（Requirements 1.4）
                if ($trafficInfo->total > 0) {
                    $usagePercentage = round(($trafficInfo->getUsed() / $trafficInfo->total) * 100, 2);
                }
                
                $previewData['traffic_info'] = [
                    'total' => $trafficInfo->total,
                    'used' => $trafficInfo->getUsed(),
                    'remaining' => $trafficInfo->getRemaining(),
                    'usage_percentage' => $usagePercentage, // Requirements 1.4
                    'expire_at' => $expireAt ? $expireAt->toIso8601String() : null,
                    'remaining_days' => $remainingDays, // Requirements 1.6
                ];
            }

            return $this->success($previewData);
        } catch (\InvalidArgumentException $e) {
            // URL验证失败
            return $this->fail([400, $e->getMessage()]);
        } catch (\Exception $e) {
            Log::error('Failed to preview subscription', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->fail([500, '预览订阅失败: ' . $e->getMessage()]);
        }
    }

    /**
     * 8.1 导入订阅并创建套餐
     * POST /api/v2/{admin_path}/shared-plans/import
     * 
     * Requirements: 1.1, 1.2, 1.3, 2.1, 2.7, 3.1, 3.2, 3.3, 4.1, 4.9, 7.1, 7.6, 7.7
     */
    public function import(Request $request): JsonResponse
    {
        // 验证请求数据
        $validator = Validator::make($request->all(), [
            'subscription_url' => 'required|string|max:2048',
            'name' => 'required|string|min:2|max:100', // Requirements 8.1
            'description' => 'nullable|string',
            'max_slots' => 'required|integer|min:1|max:1000',
            'auth_params' => 'nullable|array',
            
            // Requirements 2.1, 3.1, 4.1
            'group_id' => 'nullable|integer|exists:v2_server_group,id', // Requirements 2.7, 8.2
            'tags' => 'nullable|array|max:10', // Requirements 8.4
            'tags.*' => 'string|max:20', // Requirements 8.5
            'prices' => 'required|array|min:1', // Requirements 4.9, 8.3
            'prices.*' => 'integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->fail([400, $validator->errors()->first()]);
        }

        try {
            // 获取价格配置
            $prices = $request->input('prices');
            
            // 验证至少有一个价格大于0（Requirements 4.9, 8.3）
            if (empty($prices) || !array_filter($prices, fn($p) => $p > 0)) {
                return $this->fail([400, '至少需要设置一个价格']);
            }

            // 导入订阅并创建套餐
            $plan = $this->importService->importAndCreatePlan(
                $request->input('subscription_url'),
                [
                    'name' => $request->input('name'),
                    'description' => $request->input('description'),
                    'max_slots' => $request->input('max_slots'),
                    'group_id' => $request->input('group_id'), // Requirements 2.1
                    'tags' => $request->input('tags'), // Requirements 3.1, 3.2, 3.3
                    'prices' => $prices, // Requirements 4.1
                ],
                $request->input('auth_params', [])
            );

            // 加载关联关系
            $plan->load('group');

            // 返回创建的套餐信息（Requirements 7.1）
            return $this->success([
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'subscription_format' => $plan->subscription_format,
                'nodes_count' => $plan->nodes_count,
                'max_slots' => $plan->max_slots,
                'used_slots' => $plan->used_slots,
                'group_id' => $plan->group_id,
                'group' => $plan->group ? [
                    'id' => $plan->group->id,
                    'name' => $plan->group->name,
                    'server_count' => $plan->group->server_count,
                ] : null,
                'tags' => $plan->tags,
                'prices' => $plan->prices,
                'is_visible' => $plan->is_visible,
                'sync_status' => $plan->sync_status,
                'total_traffic' => $plan->total_traffic,
                'used_traffic' => $plan->used_traffic,
                'expire_at' => $plan->expire_at?->toIso8601String(),
                'last_sync_at' => $plan->last_sync_at?->toIso8601String(),
                'created_at' => $plan->created_at->toIso8601String(),
            ]);
        } catch (\InvalidArgumentException $e) {
            // URL验证失败
            return $this->fail([400, $e->getMessage()]);
        } catch (\Exception $e) {
            Log::error('Failed to import subscription', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->fail([500, '导入订阅失败: ' . $e->getMessage()]);
        }
    }

    /**
     * 8.2 获取套餐列表
     * GET /api/v2/{admin_path}/shared-plans
     * 
     * Requirements: 2.6, 3.4, 3.5, 4.1, 7.3
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SharedPlan::query()->with('group'); // Requirements 2.6

            // 筛选：按状态
            if ($request->has('sync_status')) {
                $query->where('sync_status', $request->input('sync_status'));
            }

            // 筛选：按可见性
            if ($request->has('is_visible')) {
                $query->where('is_visible', $request->boolean('is_visible'));
            }

            // 筛选：按格式
            if ($request->has('subscription_format')) {
                $query->where('subscription_format', $request->input('subscription_format'));
            }

            // 筛选：按标签（Requirements 3.5, 7.3）
            if ($request->has('tag')) {
                $tag = $request->input('tag');
                $query->whereJsonContains('tags', $tag);
            }

            // 筛选：按权限组
            if ($request->has('group_id')) {
                $query->where('group_id', $request->input('group_id'));
            }

            // 搜索：按名称
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // 排序
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // 分页
            $perPage = $request->input('per_page', 15);
            $perPage = min($perPage, 100); // 最多100条
            
            $plans = $query->paginate($perPage);

            // 格式化返回数据（Requirements 2.6, 3.4, 4.1, 7.3）
            $data = $plans->map(function ($plan) {
                $result = [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'subscription_url' => $plan->subscription_url, // 原始地址（管理端直接返回）
                    'subscription_format' => $plan->subscription_format,
                    'nodes_count' => $plan->nodes_count,
                    'max_slots' => $plan->max_slots,
                    'used_slots' => $plan->used_slots,
                    'available_slots' => $plan->getAvailableSlotsCount(),
                    'is_visible' => $plan->is_visible,
                    'sync_status' => $plan->sync_status,
                    'sync_fail_count' => $plan->sync_fail_count,
                    'total_traffic' => $plan->total_traffic,
                    'used_traffic' => $plan->used_traffic,
                    'remaining_traffic' => $plan->getRemainingTraffic(),
                    'expire_at' => $plan->expire_at?->toIso8601String(),
                    'last_sync_at' => $plan->last_sync_at?->toIso8601String(),
                    'created_at' => $plan->created_at->toIso8601String(),
                    'updated_at' => $plan->updated_at->toIso8601String(),
                    
                    // 新字段（Requirements 2.6, 3.4, 4.1）
                    'group_id' => $plan->group_id,
                    'group' => $plan->group ? [
                        'id' => $plan->group->id,
                        'name' => $plan->group->name,
                        'server_count' => $plan->group->server_count,
                    ] : null,
                    'tags' => $plan->tags,
                    'prices' => $plan->prices,
                ];
                
                // 添加定价层级信息（Requirements 4.1）
                if ($plan->prices) {
                    $result['pricing_tiers'] = $plan->getActivePricingTiers();
                }
                
                return $result;
            });

            return $this->success([
                'data' => $data,
                'total' => $plans->total(),
                'per_page' => $plans->perPage(),
                'current_page' => $plans->currentPage(),
                'last_page' => $plans->lastPage(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch shared plans', [
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '获取套餐列表失败']);
        }
    }

    /**
     * 8.4 获取套餐详情
     * GET /api/v2/{admin_path}/shared-plans/{id}
     * 
     * Requirements: 7.1, 7.2, 7.4, 8.2
     */
    public function show(int $id): JsonResponse
    {
        try {
            $plan = SharedPlan::with('group')->find($id); // Requirements 7.4

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            // 获取使用该套餐的用户列表
            $slots = PlanSlot::where('shared_plan_id', $id)
                ->with('user:id,email,created_at')
                ->orderBy('allocated_at', 'desc')
                ->get();

            $users = $slots->map(function ($slot) {
                return [
                    'slot_id' => $slot->id,
                    'user_id' => $slot->user_id,
                    'user_email' => $slot->user->email ?? 'N/A',
                    'subscription_token' => substr($slot->subscription_token, 0, 8) . '...' . substr($slot->subscription_token, -8),
                    'status' => $slot->status,
                    'allocated_at' => $slot->allocated_at->toIso8601String(),
                    'expire_at' => $slot->expire_at->toIso8601String(),
                    'released_at' => $slot->released_at?->toIso8601String(),
                ];
            });

            // 管理端直接返回原始订阅地址（与传统订阅对齐）
            $originalUrl = $plan->subscription_url;

            $result = [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'subscription_url' => $originalUrl, // 原始地址（与传统订阅对齐）
                'subscription_format' => $plan->subscription_format,
                'nodes_count' => $plan->nodes_count,
                'nodes_config' => $plan->nodes_config, // Include parsed nodes for admin view
                'max_slots' => $plan->max_slots,
                'used_slots' => $plan->used_slots,
                'available_slots' => $plan->getAvailableSlotsCount(),
                'is_visible' => $plan->is_visible,
                'sync_status' => $plan->sync_status,
                'sync_error' => $plan->sync_error,
                'sync_fail_count' => $plan->sync_fail_count,
                'total_traffic' => $plan->total_traffic,
                'used_traffic' => $plan->used_traffic,
                'remaining_traffic' => $plan->getRemainingTraffic(),
                'expire_at' => $plan->expire_at?->toIso8601String(),
                'last_sync_at' => $plan->last_sync_at?->toIso8601String(),
                'created_at' => $plan->created_at->toIso8601String(),
                'updated_at' => $plan->updated_at->toIso8601String(),
                'users' => $users,
                
                // 新字段（Requirements 7.4）
                'group_id' => $plan->group_id,
                'group' => $plan->group ? [
                    'id' => $plan->group->id,
                    'name' => $plan->group->name,
                    'server_count' => $plan->group->server_count,
                ] : null,
                'tags' => $plan->tags,
                'prices' => $plan->prices,
            ];
            
            // 添加完整的定价详情（Requirements 7.4）
            if ($plan->prices) {
                $result['pricing_tiers'] = $plan->getActivePricingTiers();
            }

            return $this->success($result);
        } catch (\Exception $e) {
            Log::error('Failed to fetch shared plan details', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '获取套餐详情失败']);
        }
    }

    /**
     * 8.6 更新套餐配置
     * PUT /api/v2/{admin_path}/shared-plans/{id}
     * 
     * Requirements: 2.1, 3.1, 4.1, 7.6
     */
    public function update(int $id, Request $request): JsonResponse
    {
        // 验证请求数据
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|min:2|max:100', // Requirements 8.1
            'description' => 'nullable|string',
            'max_slots' => 'sometimes|required|integer|min:1|max:1000',
            
            // 新字段（Requirements 2.1, 3.1, 4.1）
            'group_id' => 'nullable|integer|exists:v2_server_group,id', // Requirements 2.7, 8.2
            'tags' => 'nullable|array|max:10', // Requirements 8.4
            'tags.*' => 'string|max:20', // Requirements 8.5
            'prices' => 'nullable|array',
            'prices.*' => 'integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->fail([400, $validator->errors()->first()]);
        }

        try {
            $plan = SharedPlan::find($id);

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            // 如果要更新max_slots，验证不小于used_slots
            if ($request->has('max_slots')) {
                $newMaxSlots = $request->input('max_slots');
                if ($newMaxSlots < $plan->used_slots) {
                    return $this->fail([
                        400,
                        "最大slot数不能小于当前已用slot数 ({$plan->used_slots})"
                    ]);
                }
            }
            
            // 如果要更新prices，验证至少有一个价格（Requirements 4.9, 8.3）
            if ($request->has('prices')) {
                $prices = $request->input('prices');
                if (empty($prices) || !array_filter($prices, fn($p) => $p > 0)) {
                    return $this->fail([400, '至少需要设置一个价格']);
                }
            }

            // 更新套餐
            $updateData = $request->only(['name', 'description', 'max_slots', 'group_id', 'tags', 'prices']);
            $plan->update($updateData);

            // 如果max_slots增加了，可能需要更新可见性
            if ($request->has('max_slots')) {
                $plan->updateVisibility();
            }
            
            // 加载关联关系
            $plan->load('group');

            $result = [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'max_slots' => $plan->max_slots,
                'used_slots' => $plan->used_slots,
                'is_visible' => $plan->is_visible,
                'group_id' => $plan->group_id,
                'group' => $plan->group ? [
                    'id' => $plan->group->id,
                    'name' => $plan->group->name,
                    'server_count' => $plan->group->server_count,
                ] : null,
                'tags' => $plan->tags,
                'prices' => $plan->prices,
                'updated_at' => $plan->updated_at->toIso8601String(),
            ];
            
            // 添加定价层级信息
            if ($plan->prices) {
                $result['pricing_tiers'] = $plan->getActivePricingTiers();
            }

            return $this->success($result);
        } catch (\Exception $e) {
            Log::error('Failed to update shared plan', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '更新套餐失败']);
        }
    }

    /**
     * 8.7 手动同步订阅
     * POST /api/v2/{admin_path}/shared-plans/{id}/sync
     * 
     * Requirements: 6.1, 6.2
     */
    public function sync(int $id): JsonResponse
    {
        try {
            $plan = SharedPlan::find($id);

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            $startTime = microtime(true);

            try {
                // 解密订阅URL
                $subscriptionUrl = $plan->getDecryptedSubscriptionUrl();

                // 获取订阅内容
                $response = $this->importService->fetchSubscription($subscriptionUrl);
                $content = $response['content'];
                $headers = $response['headers'];

                // 解析订阅内容
                $nodes = $this->parserService->parse($content);

                if (empty($nodes)) {
                    throw new \Exception('No nodes found in subscription');
                }

                // 解析流量信息
                $trafficInfo = $this->parserService->parseTrafficInfoFromHeaders($headers);

                // 计算耗时
                $durationMs = (int) ((microtime(true) - $startTime) * 1000);

                // 更新套餐
                DB::transaction(function () use ($plan, $nodes, $trafficInfo, $durationMs) {
                    $plan->nodes_config = $nodes;
                    $plan->nodes_count = count($nodes);
                    $plan->sync_status = SharedPlan::SYNC_STATUS_ACTIVE;
                    $plan->sync_error = null;
                    $plan->sync_fail_count = 0;
                    $plan->last_sync_at = now();

                    // 更新流量信息
                    if ($trafficInfo) {
                        $plan->total_traffic = $trafficInfo->total;
                        $plan->used_traffic = $trafficInfo->getUsed();
                        
                        if ($trafficInfo->expire) {
                            $plan->expire_at = \Carbon\Carbon::createFromTimestamp($trafficInfo->expire);
                        }
                    }

                    $plan->save();

                    // 记录同步日志
                    SubscriptionSyncLog::logSuccess(
                        $plan->id,
                        count($nodes),
                        $trafficInfo ? [
                            'upload' => $trafficInfo->upload,
                            'download' => $trafficInfo->download,
                            'total' => $trafficInfo->total,
                            'expire' => $trafficInfo->expire,
                        ] : null,
                        $durationMs
                    );
                });

                return $this->success([
                    'message' => '同步成功',
                    'nodes_count' => count($nodes),
                    'duration_ms' => $durationMs,
                    'traffic_info' => $trafficInfo ? [
                        'total' => $trafficInfo->total,
                        'used' => $trafficInfo->getUsed(),
                        'remaining' => $trafficInfo->getRemaining(),
                    ] : null,
                    'synced_at' => now()->toIso8601String(),
                ]);
            } catch (\Exception $e) {
                // 同步失败
                $durationMs = (int) ((microtime(true) - $startTime) * 1000);
                $errorMessage = $e->getMessage();

                DB::transaction(function () use ($plan, $errorMessage, $durationMs) {
                    $plan->sync_status = SharedPlan::SYNC_STATUS_FAILED;
                    $plan->sync_error = $errorMessage;
                    $plan->sync_fail_count++;
                    $plan->save();

                    // 记录同步日志
                    SubscriptionSyncLog::logFailure(
                        $plan->id,
                        $errorMessage,
                        $durationMs
                    );
                });

                return $this->fail([500, '同步失败: ' . $errorMessage]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to sync shared plan', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '同步失败']);
        }
    }

    /**
     * 8.5 删除套餐
     * DELETE /api/v2/{admin_path}/shared-plans/{id}
     * 
     * Requirements: 7.7
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $plan = SharedPlan::find($id);

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            // 检查是否有用户正在使用
            $usedSlots = PlanSlot::where('shared_plan_id', $id)
                ->where('status', PlanSlot::STATUS_ACTIVE)
                ->count();

            if ($usedSlots > 0) {
                return $this->fail([400, "无法删除：还有 {$usedSlots} 个用户正在使用此套餐"]);
            }

            // 删除所有相关的slot记录（已释放的）
            PlanSlot::where('shared_plan_id', $id)->delete();

            // 删除同步日志
            SubscriptionSyncLog::where('shared_plan_id', $id)->delete();

            // 删除套餐
            $plan->delete();

            return $this->success(['message' => '删除成功']);
        } catch (\Exception $e) {
            Log::error('Failed to delete shared plan', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '删除套餐失败']);
        }
    }

    /**
     * 8.8 获取同步日志
     * GET /api/v2/{admin_path}/shared-plans/{id}/sync-logs
     * 
     * Requirements: 10.1
     */
    public function syncLogs(int $id, Request $request): JsonResponse
    {
        try {
            $plan = SharedPlan::find($id);

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            $query = SubscriptionSyncLog::where('shared_plan_id', $id);

            // 筛选：按状态
            if ($request->has('sync_status')) {
                $query->where('sync_status', $request->input('sync_status'));
            }

            // 筛选：按时间范围
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->dateRange(
                    $request->input('start_date'),
                    $request->input('end_date')
                );
            }

            // 排序
            $query->latest();

            // 分页
            $perPage = $request->input('per_page', 20);
            $perPage = min($perPage, 100);
            
            $logs = $query->paginate($perPage);

            // 格式化返回数据
            $data = $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'sync_status' => $log->sync_status,
                    'nodes_count' => $log->nodes_count,
                    'traffic_info' => $log->getFormattedTrafficInfo(),
                    'error_message' => $log->error_message,
                    'duration' => $log->getFormattedDuration(),
                    'duration_ms' => $log->duration_ms,
                    'created_at' => $log->created_at->toIso8601String(),
                ];
            });

            return $this->success([
                'data' => $data,
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch sync logs', [
                'plan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '获取同步日志失败']);
        }
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
