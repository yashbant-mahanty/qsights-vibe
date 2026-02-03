<?php

/**
 * Clean up orphaned evaluation staff user accounts
 * 
 * This script finds and deletes user accounts where:
 * 1. User has role 'evaluation_staff'
 * 2. There is NO active evaluation_staff record (deleted or doesn't exist)
 * 
 * This handles the case where staff was deleted but user account remained.
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "========================================\n";
echo "CLEANUP ORPHANED EVALUATION STAFF ACCOUNTS\n";
echo "========================================\n\n";

// Find all evaluation_staff users
$evaluationStaffUsers = DB::table('users')
    ->where('role', 'evaluation_staff')
    ->orWhere('role', 'evaluation-staff')
    ->get();

echo "Found " . count($evaluationStaffUsers) . " evaluation staff user accounts\n\n";

$orphanedCount = 0;
$deletedCount = 0;

foreach ($evaluationStaffUsers as $user) {
    // Check if there's an active evaluation_staff record for this user
    $staffRecord = DB::table('evaluation_staff')
        ->where('user_id', $user->id)
        ->whereNull('deleted_at')
        ->first();
    
    if (!$staffRecord) {
        // This is an orphaned account
        $orphanedCount++;
        echo "Found orphaned account: {$user->email} (User ID: {$user->id})\n";
        
        // Delete the orphaned user account
        DB::table('users')->where('id', $user->id)->delete();
        $deletedCount++;
        echo "  ✅ Deleted\n";
    }
}

echo "\n========================================\n";
echo "SUMMARY\n";
echo "========================================\n";
echo "Total evaluation staff users: " . count($evaluationStaffUsers) . "\n";
echo "Orphaned accounts found: $orphanedCount\n";
echo "Orphaned accounts deleted: $deletedCount\n";

if ($deletedCount > 0) {
    echo "\n✅ Cleanup complete! Orphaned staff accounts have been removed.\n";
} else {
    echo "\n✅ No orphaned accounts found. All staff users have valid staff records.\n";
}
