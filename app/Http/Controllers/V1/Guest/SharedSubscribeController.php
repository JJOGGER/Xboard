<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\PlanSlot;
use App\Models\SharedPlan;
use App\Services\SharedSubscribeLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class SharedSubscribeController extends Controller
{
    private const HEARTBEAT_TTL_SECONDS = 90;
    private const CACHE_PREFIX = 'SHARED_SUBSCRIBE_ONLINE_SLOT_';

    /**
     * Shared subscribe heartbeat (no login required).
     * POST /api/v1/guest/shared-subscribe/heartbeat
     *
     * Body:
     * - token: string (raw v1... token)
     * - device_id: string (stable device identifier)
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|min:10',
            'device_id' => 'required|string|min:6|max:128',
        ]);

        $token = trim((string) $validated['token']);
        $deviceId = (string) $validated['device_id'];

        try {
            $payload = app(SharedSubscribeLinkService::class)->decode($token);
        } catch (\Throwable $e) {
            return $this->fail([400, '无效的订阅令牌'], null, [
                'reason' => 'invalid_token',
            ]);
        }

        $expireAt = $payload['expire_at'] ?? null;
        if (is_numeric($expireAt) && (int) $expireAt > 0 && time() > (int) $expireAt) {
            return $this->fail([403, '订阅已过期'], null, [
                'reason' => 'expired',
            ]);
        }

        $slotId = isset($payload['slot_id']) ? (int) $payload['slot_id'] : 0;
        $planId = isset($payload['shared_plan_id']) ? (int) $payload['shared_plan_id'] : 0;

        if ($slotId <= 0 || $planId <= 0) {
            return $this->fail([400, '无效的订阅令牌'], null, [
                'reason' => 'invalid_token',
            ]);
        }

        $slot = PlanSlot::query()->whereKey($slotId)->first();
        if (!$slot || (int) $slot->shared_plan_id !== $planId) {
            return $this->fail([404, '订阅不存在'], null, [
                'reason' => 'slot_not_found',
            ]);
        }

        if ($slot->status !== PlanSlot::STATUS_ACTIVE || $slot->expire_at?->isPast()) {
            return $this->fail([403, '订阅已失效'], null, [
                'reason' => 'inactive',
            ]);
        }

        $planQuery = SharedPlan::query()->whereKey($planId);
        if (Schema::hasColumn('v2_shared_plans', 'device_limit')) {
            $planQuery->select(['id', 'device_limit']);
        } else {
            $planQuery->select(['id']);
        }

        $plan = $planQuery->first();
        if (!$plan) {
            return $this->fail([404, '套餐不存在'], null, [
                'reason' => 'plan_not_found',
            ]);
        }

        $deviceLimit = (int) ($plan->device_limit ?? 0);
        if ($deviceLimit <= 0) {
            $deviceLimit = 999999;
        }

        $cacheKey = self::CACHE_PREFIX . $slotId;
        $now = time();
        $devices = Cache::get($cacheKey, []);
        if (!is_array($devices)) {
            $devices = [];
        }

        // cleanup
        foreach ($devices as $id => $lastSeen) {
            if (!is_numeric($lastSeen) || ($now - (int) $lastSeen) > self::HEARTBEAT_TTL_SECONDS) {
                unset($devices[$id]);
            }
        }

        $isNewDevice = !array_key_exists($deviceId, $devices);
        $onlineCount = count($devices);

        // Reject new device if already at limit
        if ($isNewDevice && $onlineCount >= $deviceLimit) {
            return $this->fail([429, '设备数量超过限制'], null, [
                'reason' => 'over_limit',
                'device_limit' => $deviceLimit,
                'online_count' => $onlineCount,
                'slot_id' => $slotId,
                'shared_plan_id' => $planId,
            ]);
        }

        $devices[$deviceId] = $now;
        $onlineCount = count($devices);

        // Keep TTL refreshed
        Cache::put($cacheKey, $devices, now()->addSeconds(self::HEARTBEAT_TTL_SECONDS));

        return $this->success([
            'status' => 'ok',
            'device_limit' => $deviceLimit,
            'online_count' => $onlineCount,
            'slot_id' => $slotId,
            'shared_plan_id' => $planId,
        ]);
    }
}
