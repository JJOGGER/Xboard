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
        Schema::create('v2_plan_slots', function (Blueprint $table) {
            $table->id();
            
            // 关联信息
            $table->unsignedBigInteger('shared_plan_id')->comment('共享套餐ID');
            $table->integer('user_id')->comment('用户ID');
            $table->unsignedBigInteger('order_id')->nullable()->comment('订单ID');
            
            // 订阅token
            $table->string('subscription_token', 64)->unique()->comment('用户订阅token');
            
            // 时间信息
            $table->timestamp('allocated_at')->useCurrent()->comment('分配时间');
            $table->timestamp('expire_at')->comment('过期时间');
            $table->timestamp('released_at')->nullable()->comment('释放时间');
            
            // 状态
            $table->string('status', 50)->default('active')->comment('active/expired/cancelled');
            
            $table->timestamps();
            
            // 外键约束
            $table->foreign('shared_plan_id')
                ->references('id')
                ->on('v2_shared_plans')
                ->onDelete('cascade');
            
            $table->foreign('user_id')
                ->references('id')
                ->on('v2_user')
                ->onDelete('cascade');
            
            // 索引
            $table->unique(['shared_plan_id', 'user_id'], 'uk_plan_user');
            $table->index('subscription_token');
            $table->index('status');
            $table->index('expire_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('v2_plan_slots');
    }
};
