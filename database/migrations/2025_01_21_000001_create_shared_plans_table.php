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
        Schema::create('v2_shared_plans', function (Blueprint $table) {
            $table->id();
            
            // 基本信息
            $table->string('name')->comment('套餐名称');
            $table->text('description')->nullable()->comment('套餐描述');
            
            // 订阅信息
            $table->text('subscription_url')->comment('第三方订阅URL（加密存储）');
            $table->string('subscription_format', 50)->comment('订阅格式：clash/v2ray/shadowsocks/trojan/hysteria');
            
            // Slot管理
            $table->unsignedInteger('max_slots')->comment('最大用户数');
            $table->unsignedInteger('used_slots')->default(0)->comment('已使用slot数');
            
            // 节点配置
            $table->json('nodes_config')->comment('解析后的节点配置');
            $table->unsignedInteger('nodes_count')->default(0)->comment('节点数量');
            
            // 流量信息（从第三方订阅获取）
            $table->unsignedBigInteger('total_traffic')->nullable()->comment('总流量（字节）');
            $table->unsignedBigInteger('used_traffic')->nullable()->comment('已用流量（字节）');
            $table->timestamp('expire_at')->nullable()->comment('订阅过期时间');
            
            // 同步状态
            $table->timestamp('last_sync_at')->nullable()->comment('最后同步时间');
            $table->string('sync_status', 50)->default('active')->comment('active/failed/expired');
            $table->text('sync_error')->nullable()->comment('同步错误信息');
            $table->integer('sync_fail_count')->default(0)->comment('连续失败次数');
            
            // 套餐配置
            $table->decimal('price', 10, 2)->comment('售价');
            $table->unsignedInteger('duration_days')->comment('有效期（天）');
            $table->boolean('is_visible')->default(true)->comment('是否显示给用户');
            
            $table->timestamps();
            
            // 索引
            $table->index('sync_status');
            $table->index('is_visible');
            $table->index('last_sync_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('v2_shared_plans');
    }
};
