<?php

namespace App\Console\Commands;

use App\Services\SubscriptionSyncService;
use Illuminate\Console\Command;

class SyncSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '同步所有共享套餐的第三方订阅内容';

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
    public function handle(SubscriptionSyncService $syncService)
    {
        $this->info('开始同步共享套餐订阅...');
        
        try {
            $syncService->syncAll();
            $this->info('订阅同步完成');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('订阅同步失败: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
