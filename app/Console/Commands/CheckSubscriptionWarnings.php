<?php

namespace App\Console\Commands;

use App\Jobs\SendEmailJob;
use App\Jobs\SendTelegramJob;
use App\Models\SharedPlan;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckSubscriptionWarnings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:check-warnings';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '检查共享套餐的过期和流量预警并通知管理员';

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
        $this->info('开始检查共享套餐预警...');
        
        try {
            $warnings = [];
            
            // 检查即将过期的订阅（7天内）
            $expiringPlans = SharedPlan::whereNotNull('expire_at')
                ->where('expire_at', '>', now())
                ->where('expire_at', '<=', now()->addDays(7))
                ->where('sync_status', '!=', 'expired')
                ->get();
            
            foreach ($expiringPlans as $plan) {
                $daysLeft = now()->diffInDays($plan->expire_at);
                $warnings[] = [
                    'type' => 'expiry',
                    'plan' => $plan,
                    'message' => "共享套餐「{$plan->name}」将在 {$daysLeft} 天后过期"
                ];
            }
            
            // 检查流量即将用完的订阅（<10%）
            $lowTrafficPlans = SharedPlan::whereNotNull('total_traffic')
                ->whereNotNull('used_traffic')
                ->where('total_traffic', '>', 0)
                ->get()
                ->filter(function ($plan) {
                    $remaining = $plan->total_traffic - $plan->used_traffic;
                    $percentage = ($remaining / $plan->total_traffic) * 100;
                    return $percentage < 10 && $percentage > 0;
                });
            
            foreach ($lowTrafficPlans as $plan) {
                $remaining = $plan->total_traffic - $plan->used_traffic;
                $percentage = round(($remaining / $plan->total_traffic) * 100, 2);
                $remainingGB = round($remaining / 1024 / 1024 / 1024, 2);
                
                $warnings[] = [
                    'type' => 'traffic',
                    'plan' => $plan,
                    'message' => "共享套餐「{$plan->name}」流量仅剩 {$percentage}% ({$remainingGB} GB)"
                ];
            }
            
            // 如果有预警，发送通知给管理员
            if (count($warnings) > 0) {
                $this->sendWarningsToAdmins($warnings);
                $this->info("发现 " . count($warnings) . " 个预警，已通知管理员");
            } else {
                $this->info('未发现需要预警的套餐');
            }
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('检查预警失败: ' . $e->getMessage());
            Log::error('CheckSubscriptionWarnings failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * 发送预警通知给管理员
     *
     * @param array $warnings
     * @return void
     */
    private function sendWarningsToAdmins(array $warnings)
    {
        // 获取所有管理员
        $admins = User::where('is_admin', true)
            ->whereNotNull('email')
            ->get();
        
        if ($admins->isEmpty()) {
            $this->warn('未找到管理员用户，无法发送通知');
            return;
        }
        
        // 构建通知内容
        $subject = '共享套餐预警通知';
        $message = $this->buildWarningMessage($warnings);
        
        // 发送邮件通知
        foreach ($admins as $admin) {
            try {
                SendEmailJob::dispatch([
                    'email' => $admin->email,
                    'subject' => $subject,
                    'template_name' => 'notify',
                    'template_value' => [
                        'name' => $admin->email,
                        'content' => $message,
                        'url' => admin_setting('app_url', config('app.url'))
                    ]
                ]);
                
                // 如果管理员有Telegram ID，也发送Telegram通知
                if ($admin->telegram_id) {
                    SendTelegramJob::dispatch($admin->telegram_id, $message);
                }
            } catch (\Exception $e) {
                Log::error('Failed to send warning notification to admin', [
                    'admin_id' => $admin->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * 构建预警消息
     *
     * @param array $warnings
     * @return string
     */
    private function buildWarningMessage(array $warnings): string
    {
        $message = "您好，以下共享套餐需要注意：\n\n";
        
        foreach ($warnings as $warning) {
            $message .= "⚠️ " . $warning['message'] . "\n";
            $message .= "   套餐ID: " . $warning['plan']->id . "\n";
            $message .= "   已用Slot: " . $warning['plan']->used_slots . "/" . $warning['plan']->max_slots . "\n\n";
        }
        
        $message .= "请及时处理以避免影响用户使用。";
        
        return $message;
    }
}
