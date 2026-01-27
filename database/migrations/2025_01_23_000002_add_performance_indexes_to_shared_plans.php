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
     * This migration adds performance indexes to the v2_shared_plans table
     * to improve query performance for common operations.
     * 
     * Requirements: Performance optimization
     */
    public function up(): void
    {
        Schema::table('v2_shared_plans', function (Blueprint $table) {
            // Add index on group_id for faster joins with v2_server_group
            // Note: This index may already exist from the foreign key constraint
            // We check first to avoid duplicate index errors
            if (!$this->indexExists('v2_shared_plans', 'v2_shared_plans_group_id_index')) {
                $table->index('group_id', 'v2_shared_plans_group_id_index');
            }
        });

        // Add index on tags JSON field for faster tag filtering
        // MySQL 5.7+ and MariaDB 10.2+ support functional indexes on JSON
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'mysql') {
            // For MySQL, we create a generated column and index it
            // This allows efficient querying of JSON array contents
            DB::statement('
                ALTER TABLE v2_shared_plans 
                ADD COLUMN tags_text TEXT GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(tags, "$"))) STORED
            ');
            
            DB::statement('
                CREATE INDEX v2_shared_plans_tags_text_index ON v2_shared_plans(tags_text(255))
            ');
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't support generated columns in the same way
            // We'll skip the JSON index for SQLite (typically used in testing)
            // In production, MySQL/MariaDB should be used
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'mysql') {
            // Drop the generated column and its index
            DB::statement('DROP INDEX v2_shared_plans_tags_text_index ON v2_shared_plans');
            DB::statement('ALTER TABLE v2_shared_plans DROP COLUMN tags_text');
        }

        Schema::table('v2_shared_plans', function (Blueprint $table) {
            // Drop the group_id index if it exists and is not part of foreign key
            if ($this->indexExists('v2_shared_plans', 'v2_shared_plans_group_id_index')) {
                $table->dropIndex('v2_shared_plans_group_id_index');
            }
        });
    }

    /**
     * Check if an index exists on a table
     * 
     * @param string $table
     * @param string $index
     * @return bool
     */
    private function indexExists(string $table, string $index): bool
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'mysql') {
            $result = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]);
            return !empty($result);
        } elseif ($driver === 'sqlite') {
            $result = DB::select("SELECT name FROM sqlite_master WHERE type='index' AND name=?", [$index]);
            return !empty($result);
        }
        
        return false;
    }
};
