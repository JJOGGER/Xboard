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
        Schema::table('v2_order', function (Blueprint $table) {
            // 添加套餐类型字段
            $table->enum('plan_type', ['traditional', 'shared'])
                  ->default('traditional')
                  ->after('plan_id')
                  ->comment('套餐类型: traditional=传统套餐, shared=共享订阅');
            
            // 添加共享套餐ID字段
            $table->unsignedBigInteger('shared_plan_id')
                  ->nullable()
                  ->after('plan_type')
                  ->comment('共享套餐ID（当plan_type=shared时使用）');
            
            // 添加外键约束
            $table->foreign('shared_plan_id')
                  ->references('id')
                  ->on('v2_shared_plans')
                  ->onDelete('set null');
            
            // 添加索引以提高查询性能
            $table->index('plan_type');
            $table->index('shared_plan_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('v2_order', function (Blueprint $table) {
            // 删除外键约束
            $table->dropForeign(['shared_plan_id']);
            
            // 删除索引
            $table->dropIndex(['plan_type']);
            $table->dropIndex(['shared_plan_id']);
            
            // 删除字段
            $table->dropColumn(['plan_type', 'shared_plan_id']);
        });
    }
};
