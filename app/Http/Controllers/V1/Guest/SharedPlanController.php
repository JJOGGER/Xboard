<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\SharedPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SharedPlanController extends Controller
{
    /**
     * 获取可用的共享套餐列表（无需登录）
     * GET /api/v1/guest/shared-plans
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SharedPlan::where('is_visible', true)
                ->where('sync_status', SharedPlan::SYNC_STATUS_ACTIVE)
                ->orderBy('created_at', 'desc');

            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            if ($request->has('format')) {
                $query->where('subscription_format', $request->input('format'));
            }

            $perPage = $request->input('per_page', 15);
            $perPage = min($perPage, 50);

            $plans = $query->paginate($perPage);

            $data = $plans->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'subscription_format' => $plan->subscription_format,
                    'nodes_count' => $plan->nodes_count,
                    'pricing_tiers' => $plan->getActivePricingTiers(),
                    'max_slots' => $plan->max_slots,
                    'used_slots' => method_exists($plan, 'getActiveUsedSlotsCount') ? $plan->getActiveUsedSlotsCount() : $plan->used_slots,
                    'available_slots' => $plan->getAvailableSlotsCount(),
                    'expire_at' => $plan->expire_at?->toIso8601String(),
                    'created_at' => $plan->created_at->toIso8601String(),
                ];
            });

            return $this->success([
                'data' => $data,
                'total' => $plans->total(),
                'per_page' => $plans->perPage(),
                'current_page' => $plans->currentPage(),
                'last_page' => $plans->lastPage(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch shared plans for guest', [
                'error' => $e->getMessage(),
            ]);
            return $this->fail([500, '获取套餐列表失败']);
        }
    }
}
