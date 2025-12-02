<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 为订单表添加 device_id 字段（用于在订单生命周期内暂存设备标识）
        Schema::table('v2_order', function (Blueprint $table) {
            if (!Schema::hasColumn('v2_order', 'device_id')) {
                $table->string('device_id', 128)
                    ->nullable()
                    ->after('user_id')
                    ->comment('下单设备唯一标识，用于试用套餐设备限制');
                $table->index('device_id', 'v2_order_device_id_index');
            }
        });

        // 创建套餐与设备的试用绑定关系表
        if (!Schema::hasTable('v2_plan_trial_devices')) {
            Schema::create('v2_plan_trial_devices', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('plan_id')->comment('套餐ID');
                $table->string('device_id', 128)->comment('设备唯一标识');
                $table->integer('order_id')->nullable()->comment('关联订单ID');
                $table->integer('created_at');
                $table->integer('updated_at');

                $table->unique(['plan_id', 'device_id'], 'plan_device_unique');
                $table->index('device_id', 'plan_device_device_id_index');
            });
        }
    }

    public function down(): void
    {
        Schema::table('v2_order', function (Blueprint $table) {
            if (Schema::hasColumn('v2_order', 'device_id')) {
                $table->dropIndex('v2_order_device_id_index');
                $table->dropColumn('device_id');
            }
        });

        Schema::dropIfExists('v2_plan_trial_devices');
    }
};


