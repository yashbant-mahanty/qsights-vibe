<?php
require '/var/www/QSightsOrg2.0/backend/vendor/autoload.php';

$app = require '/var/www/QSightsOrg2.0/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$backupDir = '/tmp/qsights_deleted_backup';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0777, true);
}

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
    'program_roles'
];

echo "Starting backup of soft-deleted records...\n\n";

$totalRecords = 0;

foreach ($tables as $table) {
    try {
        $records = Illuminate\Support\Facades\DB::table($table)
            ->whereNotNull('deleted_at')
            ->get();
        
        if ($records->count() > 0) {
            $filename = "{$backupDir}/{$table}.json";
            file_put_contents($filename, json_encode($records, JSON_PRETTY_PRINT));
            echo "✓ {$table}: {$records->count()} records backed up\n";
            $totalRecords += $records->count();
        }
    } catch (Exception $e) {
        echo "✗ {$table}: Error - {$e->getMessage()}\n";
    }
}

echo "\n===========================================\n";
echo "Backup Complete!\n";
echo "Total Records Backed Up: {$totalRecords}\n";
echo "Location: {$backupDir}\n";
echo "===========================================\n";
