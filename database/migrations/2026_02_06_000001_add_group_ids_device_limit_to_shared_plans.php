<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('v2_shared_plans', 'group_ids')) {
                $table->json('group_ids')->nullable()->after('group_id')->comment('权限组ID列表（JSON数组）');
            }

            if (!Schema::hasColumn('v2_shared_plans', 'device_limit')) {
                $table->unsignedInteger('device_limit')->nullable()->after('max_slots')->comment('设备数量限制');
            }
        });
    }

    public function down(): void
    {
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            if (Schema::hasColumn('v2_shared_plans', 'group_ids')) {
                $table->dropColumn('group_ids');
            }
            if (Schema::hasColumn('v2_shared_plans', 'device_limit')) {
                $table->dropColumn('device_limit');
            }
        });
    }
};
