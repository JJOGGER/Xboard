<?php

namespace App\Console\Commands;

use App\Models\PlanSlot;
use App\Models\SharedPlan;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireSubscriptionSlots extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:expire-slots';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '处理过期的共享套餐slot并释放';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('开始处理过期的slot...');
        
        try {
            $expiredCount = 0;
            
            // 查找所有过期但未释放的slot
            $expiredSlots = PlanSlot::where('status', 'active')
                ->where('expire_at', '<=', now())
                ->whereNull('released_at')
                ->get();
            
            foreach ($expiredSlots as $slot) {
                DB::transaction(function () use ($slot) {
                    // 标记slot为已过期
                    $slot->status = 'expired';
                    $slot->released_at = now();
                    $slot->save();
                    
                    // 减少共享套餐的已用slot计数
                    $sharedPlan = SharedPlan::lockForUpdate()->find($slot->shared_plan_id);
                    if ($sharedPlan && $sharedPlan->used_slots > 0) {
                        $sharedPlan->used_slots--;
                        
                        // 如果有可用slot，自动显示套餐
                        if ($sharedPlan->used_slots < $sharedPlan->max_slots) {
                            $sharedPlan->is_visible = true;
                        }
                        
                        $sharedPlan->save();
                    }
                });
                
                $expiredCount++;
            }
            
            $this->info("成功处理 {$expiredCount} 个过期的slot");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('处理过期slot失败: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
