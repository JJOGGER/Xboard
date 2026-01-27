<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration removes the old price and duration_days columns
     * from v2_shared_plans table after data has been migrated to the
     * new prices JSON field.
     * 
     * Requirements: 5.4, 5.5
     */
    public function up(): void
    {
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            // Drop old pricing columns
            $table->dropColumn(['price', 'duration_days']);
        });
    }

    /**
     * Reverse the migrations.
     * 
     * Note: This will restore the columns but NOT the data.
     * If you need to rollback, ensure you have a database backup.
     */
    public function down(): void
    {
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            // Restore old columns as nullable
            $table->decimal('price', 10, 2)->nullable()->after('sync_fail_count');
            $table->unsignedInteger('duration_days')->nullable()->after('price');
        });
    }
};
