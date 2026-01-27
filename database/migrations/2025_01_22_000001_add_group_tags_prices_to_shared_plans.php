<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration adds new fields to support:
     * - Server group assignment (group_id)
     * - Tag management (tags)
     * - Flexible multi-tier pricing (prices)
     * 
     * Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 5.8
     */
    public function up(): void
    {
        // Step 1: Add new columns
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            // Add group_id column (nullable to allow plans without group restrictions)
            $table->unsignedBigInteger('group_id')
                ->nullable()
                ->after('name')
                ->comment('权限组ID');
            
            // Add tags column (JSON array for flexible categorization)
            $table->json('tags')
                ->nullable()
                ->after('description')
                ->comment('标签（JSON数组）');
            
            // Add prices column (JSON object for multi-tier pricing)
            $table->json('prices')
                ->nullable()
                ->after('sync_fail_count')
                ->comment('价格配置（JSON对象）');
            
            // Add foreign key constraint
            $table->foreign('group_id')
                ->references('id')
                ->on('v2_server_group')
                ->onDelete('set null');
            
            // Add index for performance
            $table->index('group_id');
        });
        
        // Step 2: Migrate existing data from old price/duration_days to new prices format
        $this->migrateExistingPrices();
    }

    /**
     * Migrate existing price/duration_days to new prices JSON format
     * 
     * Converts old single price + duration to appropriate period in prices object
     * Requirements: 10.1
     */
    private function migrateExistingPrices(): void
    {
        $plans = DB::table('v2_shared_plans')->get();
        
        foreach ($plans as $plan) {
            // Skip if no price or duration set
            if ($plan->price === null || $plan->duration_days === null || $plan->price <= 0) {
                continue;
            }
            
            // Convert duration to appropriate period
            $period = $this->convertDurationToPeriod($plan->duration_days);
            
            // Convert price from decimal to cents (integer)
            // Use round() to avoid floating-point precision issues
            $priceInCents = (int) round($plan->price * 100);
            
            // Create prices JSON object
            $prices = json_encode([
                $period => $priceInCents
            ]);
            
            // Update the record
            DB::table('v2_shared_plans')
                ->where('id', $plan->id)
                ->update(['prices' => $prices]);
        }
    }

    /**
     * Convert duration in days to appropriate pricing period
     * 
     * @param int $days Duration in days
     * @return string Period key (monthly, quarterly, etc.)
     */
    private function convertDurationToPeriod(int $days): string
    {
        return match(true) {
            $days <= 30 => 'monthly',
            $days <= 90 => 'quarterly',
            $days <= 180 => 'half_yearly',
            $days <= 365 => 'yearly',
            $days <= 730 => 'two_yearly',
            default => 'three_yearly',
        };
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['group_id']);
            
            // Drop indexes
            $table->dropIndex(['group_id']);
            
            // Drop new columns
            $table->dropColumn(['group_id', 'tags', 'prices']);
        });
        
        // Note: We don't restore NOT NULL constraints on price/duration_days
        // because there may be records with NULL values that were created
        // after the migration. The original migration will handle the constraints.
    }
};
