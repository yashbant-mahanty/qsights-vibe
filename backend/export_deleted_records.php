<?php

/**
 * Export Deleted Records to JSON - Before Permanent Deletion
 * 
 * This script exports all soft-deleted records to JSON files for archival
 * before permanently deleting them from the database
 * 
 * Date: February 5, 2026
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

class ExportDeletedRecords
{
    private $exportDir;

    public function __construct()
    {
        $this->exportDir = __DIR__ . '/deleted_records_backup_' . date('Ymd_His');
        mkdir($this->exportDir, 0755, true);
    }

    public function export()
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "EXPORT DELETED RECORDS TO JSON\n";
        echo str_repeat("=", 80) . "\n";
        echo "Export directory: {$this->exportDir}\n";
        echo str_repeat("=", 80) . "\n\n";

        $tables = [
            'organizations',
            'group_heads',
            'programs',
            'questionnaires',
            'activities',
            'participants',
            'responses',
            'answers',
            'evaluation_departments',
            'evaluation_staff',
            'program_roles',
        ];

        $totalRecords = 0;

        foreach ($tables as $table) {
            $count = $this->exportTable($table);
            $totalRecords += $count;
        }

        echo "\n" . str_repeat("=", 80) . "\n";
        echo "EXPORT SUMMARY\n";
        echo str_repeat("=", 80) . "\n";
        echo "Total records exported: {$totalRecords}\n";
        echo "Export directory: {$this->exportDir}\n";
        echo str_repeat("=", 80) . "\n\n";

        return $this->exportDir;
    }

    private function exportTable($tableName)
    {
        try {
            // Check if table has deleted_at column
            $hasDeletedAt = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = 'deleted_at'", [$tableName]);
            
            if (empty($hasDeletedAt)) {
                return 0;
            }

            // Get soft-deleted records
            $records = DB::table($tableName)
                ->whereNotNull('deleted_at')
                ->get()
                ->toArray();

            $count = count($records);

            if ($count > 0) {
                $filename = "{$this->exportDir}/{$tableName}_deleted.json";
                file_put_contents(
                    $filename,
                    json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
                );
                
                echo "✅ Exported {$tableName}: {$count} records -> {$filename}\n";
            } else {
                echo "⚪ {$tableName}: No deleted records\n";
            }

            return $count;
        } catch (\Exception $e) {
            echo "❌ Error exporting {$tableName}: " . $e->getMessage() . "\n";
            return 0;
        }
    }
}

$exporter = new ExportDeletedRecords();
$exportDir = $exporter->export();

echo "Export completed! Archive directory: {$exportDir}\n\n";
