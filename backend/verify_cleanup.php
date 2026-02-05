<?php
require '/var/www/QSightsOrg2.0/backend/vendor/autoload.php';
$app = require '/var/www/QSightsOrg2.0/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "\n========================================\n";
echo "DATABASE CLEANUP VERIFICATION\n";
echo "========================================\n\n";

$tables = [
    'organizations' => 'Organizations',
    'group_heads' => 'Group Heads',
    'programs' => 'Programs',
    'questionnaires' => 'Questionnaires',
    'activities' => 'Activities',
    'participants' => 'Participants',
    'responses' => 'Responses',
    'answers' => 'Answers',
    'evaluation_departments' => 'Evaluation Departments',
    'evaluation_staff' => 'Evaluation Staff',
    'program_roles' => 'Program Roles'
];

$totalRemaining = 0;
$cleanTables = [];
$dirtyTables = [];

foreach ($tables as $table => $label) {
    try {
        $count = Illuminate\Support\Facades\DB::table($table)
            ->whereNotNull('deleted_at')
            ->count();
        
        if ($count > 0) {
            $dirtyTables[] = "$label: $count records";
            $totalRemaining += $count;
        } else {
            $cleanTables[] = $label;
        }
    } catch (Exception $e) {
        echo "Error checking $label: " . $e->getMessage() . "\n";
    }
}

echo "✅ CLEAN TABLES:\n";
foreach ($cleanTables as $table) {
    echo "   - $table\n";
}

if (count($dirtyTables) > 0) {
    echo "\n❌ TABLES WITH REMAINING SOFT-DELETED RECORDS:\n";
    foreach ($dirtyTables as $table) {
        echo "   - $table\n";
    }
    echo "\nTotal remaining: $totalRemaining records\n";
} else {
    echo "\n🎉 SUCCESS! All soft-deleted records permanently removed!\n";
}

echo "\n========================================\n";
