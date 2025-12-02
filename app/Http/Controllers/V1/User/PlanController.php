<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Models\User;
use App\Services\PlanService;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    protected PlanService $planService;

    public function __construct(PlanService $planService)
    {
        $this->planService = $planService;
    }
    public function fetch(Request $request)
    {
        $user = User::find($request->user()->id);
        // 从 Header 或 body 中提取设备标识（优先使用 Header）
        $deviceId = $request->header('X-Device-Id', $request->input('device_id'));

        if ($request->input('id')) {
            $plan = Plan::where('id', $request->input('id'))->first();
            if (!$plan) {
                return $this->fail([400, __('Subscription plan does not exist')]);
            }
            if (!$this->planService->isPlanAvailableForUser($plan, $user)) {
                return $this->fail([400, __('Subscription plan does not exist')]);
            }
            if ($deviceId && $plan->isTrial()) {
                $plan->trial_used_by_device = \App\Models\PlanTrialDevice::where('plan_id', $plan->id)
                    ->where('device_id', $deviceId)
                    ->exists();
            }
            return $this->success(PlanResource::make($plan));
        }

        $plans = $this->planService->getAvailablePlans();

        if ($deviceId) {
            $trialPlanIds = $plans->filter(fn(Plan $plan) => $plan->isTrial())->pluck('id')->all();
            if (!empty($trialPlanIds)) {
                $usedPlanIds = \App\Models\PlanTrialDevice::whereIn('plan_id', $trialPlanIds)
                    ->where('device_id', $deviceId)
                    ->pluck('plan_id')
                    ->all();
                $usedPlanIds = array_map('intval', $usedPlanIds);

                $plans->transform(function (Plan $plan) use ($usedPlanIds) {
                    if ($plan->isTrial() && in_array((int) $plan->id, $usedPlanIds, true)) {
                        $plan->trial_used_by_device = true;
                    }
                    return $plan;
                });
            }
        }

        return $this->success(PlanResource::collection($plans));
    }
}
