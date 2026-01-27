<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('v2_subscription_sync_logs', function (Blueprint $table) {
            $table->id();
            
            // 关联信息
            $table->unsignedBigInteger('shared_plan_id')->comment('共享套餐ID');
            
            // 同步状态
            $table->string('sync_status', 50)->comment('success/failed');
            $table->unsignedInteger('nodes_count')->nullable()->comment('同步到的节点数');
            
            // 流量信息快照
            $table->json('traffic_info')->nullable()->comment('流量信息快照');
            
            // 错误信息
            $table->text('error_message')->nullable()->comment('错误信息');
            
            // 性能指标
            $table->unsignedInteger('duration_ms')->nullable()->comment('同步耗时（毫秒）');
            
            $table->timestamp('created_at')->useCurrent();
            
            // 外键约束
            $table->foreign('shared_plan_id')
                ->references('id')
                ->on('v2_shared_plans')
                ->onDelete('cascade');
            
            // 索引
            $table->index(['shared_plan_id', 'created_at'], 'idx_plan_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('v2_subscription_sync_logs');
    }
};
