<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use App\Models\PlanSlot;
use App\Models\ServerGroup;
use App\Services\SharedSubscribeLinkService;
use App\Services\SubscriptionImportService;
use App\Services\SubscriptionParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/**
 * 共享套餐管理控制器
 * 
 * 管理员用于管理第三方订阅导入的共享套餐
 */
class SharedPlanController extends Controller
{
    private const SHARED_SUBSCRIBE_HEARTBEAT_TTL_SECONDS = 90;

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
            'group_ids' => 'nullable|array|max:10',
            'group_ids.*' => 'integer|exists:v2_server_group,id',
            'device_limit' => 'nullable|integer|min:0',
            'tags' => 'nullable|array|max:10', // Requirements 8.4
            'tags.*' => 'string|max:20', // Requirements 8.5
            'prices' => 'required|array|min:1', // Requirements 4.9, 8.3
            'prices.*' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return $this->fail([400, $validator->errors()->first()]);
        }

        try {
            // 获取价格配置
            $prices = $request->input('prices');

            if (is_array($prices) && array_key_exists(SharedPlan::PERIOD_ONETIME, $prices)) {
                return $this->fail([400, '不支持一次性价格']);
            }
            
            // 验证至少有一个价格大于0（Requirements 4.9, 8.3）
            if (empty($prices) || !array_filter($prices, fn($p) => $p > 0)) {
                return $this->fail([400, '至少需要设置一个价格']);
            }

            $groupIds = $request->input('group_ids');
            if (!is_array($groupIds) || empty($groupIds)) {
                $groupId = $request->input('group_id');
                $groupIds = $groupId ? [(int) $groupId] : [];
            }

            $primaryGroupId = !empty($groupIds) ? (int) $groupIds[0] : null;

            // 导入订阅并创建套餐
            $plan = $this->importService->importAndCreatePlan(
                $request->input('subscription_url'),
                [
                    'name' => $request->input('name'),
                    'description' => $request->input('description'),
                    'max_slots' => $request->input('max_slots'),
                    'group_id' => $primaryGroupId,
                    'group_ids' => $groupIds,
                    'device_limit' => $request->input('device_limit'),
                    'tags' => $request->input('tags'), // Requirements 3.1, 3.2, 3.3
                    'prices' => $prices, // Requirements 4.1
                ],
                $request->input('auth_params', [])
            );

            // 加载关联关系
            $plan->load('group');
            $groups = !empty($plan->group_ids)
                ? \App\Models\ServerGroup::query()->whereIn('id', $plan->group_ids)->get(['id', 'name'])
                : collect();

            // 返回创建的套餐信息（Requirements 7.1）
            $sanitizedPrices = $plan->prices;
            if (is_array($sanitizedPrices) && array_key_exists(SharedPlan::PERIOD_ONETIME, $sanitizedPrices)) {
                unset($sanitizedPrices[SharedPlan::PERIOD_ONETIME]);
            }

            return $this->success([
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'subscription_format' => $plan->subscription_format,
                'nodes_count' => $plan->nodes_count,
                'max_slots' => $plan->max_slots,
                'used_slots' => $plan->used_slots,
                'group_id' => $plan->group_id,
                'group_ids' => $plan->group_ids ?? [],
                'group' => $plan->group ? [
                    'id' => $plan->group->id,
                    'name' => $plan->group->name,
                    'server_count' => $plan->group->server_count,
                ] : null,
                'groups' => $groups,
                'tags' => $plan->tags,
                'prices' => $sanitizedPrices,
                'device_limit' => $plan->device_limit,
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

            $linkService = app(SharedSubscribeLinkService::class);

            $planIds = $plans->getCollection()->pluck('id')->values();
            $slotsByPlanId = collect();
            if ($planIds->isNotEmpty()) {
                $slotsByPlanId = PlanSlot::whereIn('shared_plan_id', $planIds)
                    ->with('user:id,email,created_at', 'sharedPlan:id,subscription_url,device_limit')
                    ->orderBy('allocated_at', 'desc')
                    ->get()
                    ->groupBy('shared_plan_id');
            }

            // 格式化返回数据（Requirements 2.6, 3.4, 4.1, 7.3）
            $data = $plans->getCollection()->map(function ($plan) use ($slotsByPlanId, $linkService) {
                $groups = !empty($plan->group_ids)
                    ? \App\Models\ServerGroup::query()->whereIn('id', $plan->group_ids)->get(['id', 'name'])
                    : collect();

                $sanitizedPrices = $plan->prices;
                if (is_array($sanitizedPrices) && array_key_exists(SharedPlan::PERIOD_ONETIME, $sanitizedPrices)) {
                    unset($sanitizedPrices[SharedPlan::PERIOD_ONETIME]);
                }

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
                    'users' => ($slotsByPlanId->get($plan->id, collect()))->map(function ($slot) use ($linkService) {
                        $subscriptionContentUrl = null;
                        $sharedSubscribeLink = null;
                        $slotError = null;
                        $onlineCount = $this->getSharedSubscribeOnlineDeviceCount((int) $slot->id);
                        $deviceLimit = (int) ($slot->sharedPlan?->device_limit ?? 0);

                        try {
                            $subscriptionContentUrl = $slot->getSubscriptionUrl();
                            $thirdPartySubscribeUrl = (string) ($slot->sharedPlan?->subscription_url ?? '');
                            $sharedSubscribeLink = $linkService->buildToken([
                                'subscribe_url' => $thirdPartySubscribeUrl !== '' ? $thirdPartySubscribeUrl : $subscriptionContentUrl,
                                'shared_plan_id' => (int) $slot->shared_plan_id,
                                'slot_id' => (int) $slot->id,
                                'user_id' => $slot->user_id,
                                'email' => (string) ($slot->user?->email ?? ''),
                                'expire_at' => $slot->expire_at ? $slot->expire_at->getTimestamp() : null,
                            ]);
                        } catch (\Throwable $e) {
                            $slotError = $e->getMessage();
                        }

                        return [
                            'slot_id' => $slot->id,
                            'user_id' => $slot->user_id,
                            'user_email' => $slot->user?->email ?? 'N/A',
                            'subscription_token' => substr($slot->subscription_token, 0, 8) . '...' . substr($slot->subscription_token, -8),
                            'status' => $slot->status,
                            'allocated_at' => $slot->allocated_at?->toIso8601String(),
                            'expire_at' => $slot->expire_at?->toIso8601String(),
                            'released_at' => $slot->released_at?->toIso8601String(),
                            'online_devices_count' => $onlineCount,
                            'over_limit' => $deviceLimit > 0 ? ($onlineCount > $deviceLimit) : false,
                            'shared_subscribe_link' => $sharedSubscribeLink,
                            'subscription_content_url' => $subscriptionContentUrl,
                            'error' => $slotError,
                        ];
                    })->values(),
                    
                    // 新字段（Requirements 2.6, 3.4, 4.1）
                    'group_id' => $plan->group_id,
                    'group_ids' => $plan->group_ids ?? [],
                    'group' => $plan->group ? [
                        'id' => $plan->group->id,
                        'name' => $plan->group->name,
                        'server_count' => $plan->group->server_count,
                    ] : null,
                    'groups' => $groups,
                    'tags' => $plan->tags,
                    'prices' => $sanitizedPrices,
                    'device_limit' => $plan->device_limit,
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
        } catch (\Throwable $e) {
            $errorId = (string) Str::uuid();
            Log::error('Failed to fetch shared plans', [
                'error_id' => $errorId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'query' => $request->query(),
            ]);

            return $this->fail([
                500,
                '获取套餐列表失败',
            ], null, [
                'error_id' => $errorId,
                'error_message' => $e->getMessage(),
            ]);
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

            $linkService = app(SharedSubscribeLinkService::class);

            // 获取使用该套餐的用户列表
            $slots = PlanSlot::where('shared_plan_id', $id)
                ->with('user:id,email,created_at', 'sharedPlan:id,subscription_url,device_limit')
                ->orderBy('allocated_at', 'desc')
                ->get();

            $users = $slots->map(function ($slot) use ($linkService) {
                $subscriptionContentUrl = null;
                $sharedSubscribeLink = null;
                $slotError = null;
                $onlineCount = $this->getSharedSubscribeOnlineDeviceCount((int) $slot->id);
                $deviceLimit = (int) ($slot->sharedPlan?->device_limit ?? 0);

                try {
                    $subscriptionContentUrl = $slot->getSubscriptionUrl();
                    $thirdPartySubscribeUrl = (string) ($slot->sharedPlan?->subscription_url ?? '');
                    $sharedSubscribeLink = $linkService->buildToken([
                        'subscribe_url' => $thirdPartySubscribeUrl !== '' ? $thirdPartySubscribeUrl : $subscriptionContentUrl,
                        'shared_plan_id' => (int) $slot->shared_plan_id,
                        'slot_id' => (int) $slot->id,
                        'user_id' => $slot->user_id,
                        'email' => (string) ($slot->user?->email ?? ''),
                        'expire_at' => $slot->expire_at ? $slot->expire_at->getTimestamp() : null,
                    ]);
                } catch (\Throwable $e) {
                    $slotError = $e->getMessage();
                }

                return [
                    'slot_id' => $slot->id,
                    'user_id' => $slot->user_id,
                    'user_email' => $slot->user?->email ?? 'N/A',
                    'subscription_token' => substr($slot->subscription_token, 0, 8) . '...' . substr($slot->subscription_token, -8),
                    'status' => $slot->status,
                    'allocated_at' => $slot->allocated_at?->toIso8601String(),
                    'expire_at' => $slot->expire_at?->toIso8601String(),
                    'released_at' => $slot->released_at?->toIso8601String(),
                    'online_devices_count' => $onlineCount,
                    'over_limit' => $deviceLimit > 0 ? ($onlineCount > $deviceLimit) : false,
                    'shared_subscribe_link' => $sharedSubscribeLink,
                    'subscription_content_url' => $subscriptionContentUrl,
                    'error' => $slotError,
                ];
            });

            // 管理端直接返回原始订阅地址（与传统订阅对齐）
            $originalUrl = $plan->subscription_url;

            $sanitizedPrices = $plan->prices;
            if (is_array($sanitizedPrices) && array_key_exists(SharedPlan::PERIOD_ONETIME, $sanitizedPrices)) {
                unset($sanitizedPrices[SharedPlan::PERIOD_ONETIME]);
            }

            $result = [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'subscription_url' => $originalUrl, // 原始地址（与传统订阅对齐）
                'subscription_format' => $plan->subscription_format,
                'nodes_count' => $plan->nodes_count,
                'nodes_config' => $plan->nodes_config, // Include parsed nodes for admin view
                'max_slots' => $plan->max_slots,
                'device_limit' => $plan->device_limit,
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
                'group_ids' => $plan->group_ids ?? [],
                'group' => $plan->group ? [
                    'id' => $plan->group->id,
                    'name' => $plan->group->name,
                    'server_count' => $plan->group->server_count,
                ] : null,
                'groups' => !empty($plan->group_ids)
                    ? \App\Models\ServerGroup::query()->whereIn('id', $plan->group_ids)->get(['id', 'name'])
                    : [],
                'tags' => $plan->tags,
                'prices' => $sanitizedPrices,
                'device_limit' => $plan->device_limit,
            ];
            
            // 添加完整的定价详情（Requirements 7.4）
            if ($plan->prices) {
                $result['pricing_tiers'] = $plan->getActivePricingTiers();
            }

            return $this->success($result);
        } catch (\Throwable $e) {
            $errorId = (string) Str::uuid();
            Log::error('Failed to fetch shared plan details', [
                'error_id' => $errorId,
                'plan_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->fail([
                500,
                '获取套餐详情失败',
                [
                    'error_id' => $errorId,
                    'error_message' => $e->getMessage(),
                ]
            ]);
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
            'subscription_url' => 'sometimes|required|string|max:2048',
            'name' => 'sometimes|required|string|min:2|max:100', // Requirements 8.1
            'description' => 'nullable|string',
            'max_slots' => 'sometimes|required|integer|min:1|max:1000',
            
            // 新字段（Requirements 2.1, 3.1, 4.1）
            'group_id' => 'nullable|integer|exists:v2_server_group,id', // Requirements 2.7, 8.2
            'group_ids' => 'nullable|array|max:10',
            'group_ids.*' => 'integer|exists:v2_server_group,id',
            'device_limit' => 'nullable|integer|min:0',
            'tags' => 'nullable|array|max:10', // Requirements 8.4
            'tags.*' => 'string|max:20', // Requirements 8.5
            'prices' => 'nullable|array',
            'prices.*' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return $this->fail([400, $validator->errors()->first()]);
        }

        try {
            $plan = SharedPlan::find($id);

            if (!$plan) {
                return $this->fail([404, '套餐不存在']);
            }

            $shouldResync = false;
            $newSubscriptionUrl = null;

            if ($request->has('subscription_url')) {
                $newSubscriptionUrl = $request->input('subscription_url');
                $shouldResync = $newSubscriptionUrl !== $plan->subscription_url;
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
                if (is_array($prices) && array_key_exists(SharedPlan::PERIOD_ONETIME, $prices)) {
                    return $this->fail([400, '不支持一次性价格']);
                }
                if (empty($prices) || !array_filter($prices, fn($p) => $p > 0)) {
                    return $this->fail([400, '至少需要设置一个价格']);
                }
            }

            DB::transaction(function () use ($request, $plan, $shouldResync, $newSubscriptionUrl) {
                // 更新套餐基本字段
                $updateData = $request->only([
                    'subscription_url',
                    'name',
                    'description',
                    'max_slots',
                    'group_id',
                    'group_ids',
                    'device_limit',
                    'tags',
                    'prices'
                ]);

                // Compatibility: some environments (especially sqlite dev DB) may not have all columns.
                // Filter out keys that are not present to avoid SQL errors like "no such column".
                $table = $plan->getTable();
                foreach (array_keys($updateData) as $key) {
                    if (!Schema::hasColumn($table, $key)) {
                        unset($updateData[$key]);
                    }
                }

                // Backward/forward compatibility: ensure group_id is always present
                if ($request->has('group_ids')) {
                    $incomingGroupIds = $request->input('group_ids');
                    if (is_array($incomingGroupIds) && !empty($incomingGroupIds)) {
                        $updateData['group_id'] = (int) $incomingGroupIds[0];
                    } else {
                        $updateData['group_id'] = null;
                    }
                }

                if (!empty($updateData)) {
                    $plan->update($updateData);
                }

                if ($shouldResync) {
                    $response = $this->importService->fetchSubscription($newSubscriptionUrl);
                    $content = $response['content'];
                    $headers = $response['headers'];

                    $format = $this->parserService->detectFormat($content);
                    if ($format === SubscriptionParserService::FORMAT_UNKNOWN) {
                        throw new \Exception(
                            'Unsupported subscription format. Supported formats: ' .
                            implode(', ', $this->parserService->getSupportedFormats())
                        );
                    }

                    $nodes = $this->parserService->parse($content);
                    if (empty($nodes)) {
                        throw new \Exception('No nodes found in subscription');
                    }

                    $nodes = $this->filterFakeNodes($nodes);
                    if (empty($nodes)) {
                        throw new \Exception('No valid nodes found in subscription after filtering');
                    }

                    $trafficInfo = $this->parserService->parseTrafficInfoFromHeaders($headers);

                    $plan->subscription_format = $format;
                    $plan->nodes_config = $nodes;
                    $plan->nodes_count = count($nodes);
                    $plan->sync_status = SharedPlan::SYNC_STATUS_ACTIVE;
                    $plan->sync_error = null;
                    $plan->sync_fail_count = 0;
                    $plan->last_sync_at = now();

                    if ($trafficInfo) {
                        $plan->total_traffic = $trafficInfo->total;
                        $plan->used_traffic = $trafficInfo->getUsed();

                        if ($trafficInfo->expire) {
                            $plan->expire_at = \Carbon\Carbon::createFromTimestamp($trafficInfo->expire);
                        }
                    }

                    $plan->save();
                }
            });

            // 如果max_slots增加了，可能需要更新可见性
            if ($request->has('max_slots')) {
                $plan->updateVisibility();
            }
            
            // 加载关联关系
            $plan->load('group');

            $groups = !empty($plan->group_ids)
                ? \App\Models\ServerGroup::query()->whereIn('id', $plan->group_ids)->get(['id', 'name'])
                : collect();

            $sanitizedPrices = $plan->prices;
            if (is_array($sanitizedPrices) && array_key_exists(SharedPlan::PERIOD_ONETIME, $sanitizedPrices)) {
                unset($sanitizedPrices[SharedPlan::PERIOD_ONETIME]);
            }

            $result = [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'subscription_url' => $plan->subscription_url,
                'max_slots' => $plan->max_slots,
                'used_slots' => $plan->used_slots,
                'is_visible' => $plan->is_visible,
                'group_id' => $plan->group_id,
                'group_ids' => $plan->group_ids ?? [],
                'group' => $plan->group ? [
                    'id' => $plan->group->id,
                    'name' => $plan->group->name,
                    'server_count' => $plan->group->server_count,
                ] : null,
                'groups' => $groups,
                'tags' => $plan->tags,
                'prices' => $sanitizedPrices,
                'device_limit' => $plan->device_limit,
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

    private function getSharedSubscribeOnlineDeviceCount(int $slotId): int
    {
        if ($slotId <= 0) {
            return 0;
        }

        $cacheKey = 'SHARED_SUBSCRIBE_ONLINE_SLOT_' . $slotId;
        try {
            $devices = Cache::get($cacheKey, []);
        } catch (\Throwable $e) {
            return 0;
        }
        if (!is_array($devices) || empty($devices)) {
            return 0;
        }

        $now = time();
        foreach ($devices as $deviceId => $lastSeen) {
            if (!is_numeric($lastSeen) || ($now - (int) $lastSeen) > self::SHARED_SUBSCRIBE_HEARTBEAT_TTL_SECONDS) {
                unset($devices[$deviceId]);
            }
        }

        try {
            Cache::put($cacheKey, $devices, now()->addSeconds(self::SHARED_SUBSCRIBE_HEARTBEAT_TTL_SECONDS));
        } catch (\Throwable $e) {
            // ignore
        }

        return count($devices);
    }
}
