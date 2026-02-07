<?php

/**
 * Database Cleanup Script - Remove Soft Deleted Records
 * 
 * This script permanently removes soft-deleted records from the database
 * WARNING: This operation is IRREVERSIBLE. Ensure backups are taken before running.
 * 
 * Date: February 5, 2026
 * Purpose: Clean up deleted organizations, programs, questionnaires, activities, participants, etc.
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DatabaseCleanup
{
    private $dryRun = true;
    private $results = [];

    public function __construct($dryRun = true)
    {
        $this->dryRun = $dryRun;
    }

    public function run()
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "DATABASE CLEANUP SCRIPT\n";
        echo str_repeat("=", 80) . "\n";
        echo "Mode: " . ($this->dryRun ? "DRY RUN (no changes will be made)" : "LIVE MODE (changes will be permanent)") . "\n";
        echo "Date: " . date('Y-m-d H:i:s') . "\n";
        echo str_repeat("=", 80) . "\n\n";

        // 1. Check soft-deleted Organizations
        $this->checkTable('organizations', 'Organizations');

        // 2. Check soft-deleted Group Heads
        $this->checkTable('group_heads', 'Group Heads');

        // 3. Check soft-deleted Programs
        $this->checkTable('programs', 'Programs');

        // 4. Check soft-deleted Questionnaires
        $this->checkTable('questionnaires', 'Questionnaires');

        // 5. Check soft-deleted Questions
        $this->checkTable('questions', 'Questions');

        // 6. Check soft-deleted Activities
        $this->checkTable('activities', 'Activities');

        // 7. Check soft-deleted Participants
        $this->checkTable('participants', 'Participants');

        // 8. Check soft-deleted Responses
        $this->checkTable('responses', 'Responses');

        // 9. Check soft-deleted Answers
        $this->checkTable('answers', 'Answers');

        // 10. Check soft-deleted Evaluation Events
        $this->checkTable('evaluation_events', 'Evaluation Events');

        // 11. Check soft-deleted Evaluation Departments
        $this->checkTable('evaluation_departments', 'Evaluation Departments');

        // 12. Check soft-deleted Evaluation Staff
        $this->checkTable('evaluation_staff', 'Evaluation Staff');

        // 13. Check soft-deleted Notifications
        $this->checkTable('notifications', 'Notifications');

        // 14. Check soft-deleted Program Roles
        $this->checkTable('program_roles', 'Program Roles');

        // Print summary
        $this->printSummary();

        return $this->results;
    }

    private function checkTable($tableName, $displayName)
    {
        try {
            // Check if table has deleted_at column
            $hasDeletedAt = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = 'deleted_at'", [$tableName]);
            
            if (empty($hasDeletedAt)) {
                echo "⚠️  {$displayName}: No soft delete support\n";
                return;
            }

            // Count soft-deleted records
            $count = DB::table($tableName)
                ->whereNotNull('deleted_at')
                ->count();

            if ($count > 0) {
                echo "🗑️  {$displayName}: Found {$count} soft-deleted records\n";
                
                $this->results[$tableName] = [
                    'display_name' => $displayName,
                    'count' => $count,
                    'status' => 'pending'
                ];

                // Show sample of deleted records
                $sample = DB::table($tableName)
                    ->whereNotNull('deleted_at')
                    ->select('id', 'deleted_at')
                    ->limit(5)
                    ->get();
                
                echo "   Sample IDs: ";
                foreach ($sample as $record) {
                    echo $record->id . " (deleted: " . $record->deleted_at . "), ";
                }
                echo "\n";

                // If not dry run, delete permanently
                if (!$this->dryRun) {
                    $deleted = DB::table($tableName)
                        ->whereNotNull('deleted_at')
                        ->delete();
                    
                    $this->results[$tableName]['status'] = 'deleted';
                    $this->results[$tableName]['deleted_count'] = $deleted;
                    echo "   ✅ Permanently deleted {$deleted} records\n";
                }
            } else {
                echo "✅ {$displayName}: No soft-deleted records\n";
            }
        } catch (\Exception $e) {
            echo "❌ {$displayName}: Error - " . $e->getMessage() . "\n";
            $this->results[$tableName] = [
                'display_name' => $displayName,
                'error' => $e->getMessage()
            ];
        }
        
        echo "\n";
    }

    private function printSummary()
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "CLEANUP SUMMARY\n";
        echo str_repeat("=", 80) . "\n\n";

        $totalRecords = 0;
        $totalDeleted = 0;

        foreach ($this->results as $table => $data) {
            if (isset($data['count'])) {
                $totalRecords += $data['count'];
                if (isset($data['deleted_count'])) {
                    $totalDeleted += $data['deleted_count'];
                }
            }
        }

        echo "Total soft-deleted records found: {$totalRecords}\n";
        
        if (!$this->dryRun) {
            echo "Total records permanently deleted: {$totalDeleted}\n";
        } else {
            echo "Mode: DRY RUN - No records were deleted\n";
            echo "\nTo permanently delete these records, run:\n";
            echo "php cleanup_deleted_data.php --live\n";
        }

        echo "\n" . str_repeat("=", 80) . "\n";
    }
}

// Parse command line arguments
$dryRun = true;
if (isset($argv[1]) && $argv[1] === '--live') {
    echo "\n⚠️  WARNING: Running in LIVE MODE\n";
    echo "This will PERMANENTLY delete all soft-deleted records.\n";
    echo "Press Ctrl+C to cancel or wait 5 seconds to continue...\n\n";
    sleep(5);
    $dryRun = false;
}

$cleanup = new DatabaseCleanup($dryRun);
$results = $cleanup->run();

echo "\nCleanup completed at " . date('Y-m-d H:i:s') . "\n\n";
