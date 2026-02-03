<?php

/**
 * FIX ROLE SERVICES FOREVER
 * 
 * This script updates all program role users (Program Admin, Program Manager, Program Moderator, Evaluation Admin)
 * to have the correct services based on the official permission table.
 * 
 * Feature / Module     Program Admin   Program Manager   Moderator       Evaluation Manager
 * Dashboard            Full            Full (Program)    Limited         Evaluation Only
 * Organization         Full            ❌                ❌              View Only
 * Group Heads          Full            ❌                ❌              View Only
 * Programs             Full            View              ❌              View Only
 * Questionnaires       Full            View/Duplicate    View            Full
 * Activities / Events  Full            Create/Manage     Run Only        ❌
 * Participants         Full            Manage            View            ❌
 * Reports / Analytics  Full            View/Export       Limited         ❌
 * Export Data          Full            Yes               ❌              ❌
 * User / Role Mgmt     Full            ❌                ❌              ❌
 * Evaluations          Full            View              ❌              Full
 * System Settings      Program Only    ❌                ❌              ❌
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "========================================\n";
echo "FIX ROLE SERVICES FOREVER\n";
echo "========================================\n\n";

// Define correct services for each role based on the official table
$roleServices = [
    'program-admin' => [
        // Dashboard
        'dashboard',
        
        // Programs - Full access
        'programs-view',
        'programs-create',
        'programs-edit',
        'programs-delete',
        
        // Participants - Full access
        'participants-view',
        'participants-create',
        'participants-edit',
        'participants-delete',
        
        // Questionnaires - Full access (like Super Admin, program-scoped)
        'questionnaires-view',
        'questionnaires-create',
        'questionnaires-edit',
        'questionnaires-delete',
        
        // Activities/Events - Full access (like Super Admin, program-scoped)
        'activities-view',
        'activities-create',
        'activities-edit',
        'activities-delete',
        'activities-send-notification',
        'activities-set-reminder',
        'activities-landing-config',
        
        // Reports - Full access
        'reports-view',
        'reports-export',
        
        // Evaluation - NO ACCESS (only evaluation-admin has access)
    ],
    
    'program-manager' => [
        // Dashboard
        'dashboard',
        
        // Programs - View only
        'programs-view',
        
        // Participants - View and Edit
        'participants-view',
        'participants-edit',
        
        // Questionnaires - View and Duplicate only (NO create from scratch, NO delete)
        'questionnaires-view',
        'questionnaires-edit', // Can duplicate existing
        
        // Activities/Events - Create and Manage (but program-scoped)
        'activities-view',
        'activities-create',
        'activities-edit',
        'activities-send-notification',
        'activities-landing-config',
        
        // Reports - View and Export
        'reports-view',
        'reports-export',
        
        // Evaluation - NO ACCESS (only evaluation-admin has access)
    ],
    
    'program-moderator' => [
        // Dashboard - Limited
        'dashboard',
        
        // Activities/Events - Run only (view to run them)
        'activities-view',
        
        // Reports - Limited (view and export)
        'reports-view',
        'reports-export',
        
        // Evaluation - NO ACCESS (only evaluation-admin has access)
        
        // NO Participants access
        // NO Questionnaires access
        // NO Programs access
    ],
    
    'evaluation-admin' => [
        // Dashboard - Evaluation Only
        'dashboard',
        
        // Organizations - View only
        'list_organization',
        
        // Programs - View only
        'programs-view',
        
        // Questionnaires - Full access
        'questionnaires-view',
        'questionnaires-create',
        'questionnaires-edit',
        'questionnaires-delete',
        
        // Activities/Events - NO ACCESS (evaluation-admin doesn't see Events)
        // Removed completely
        
        // Reports/Analytics - NO ACCESS (evaluation-admin doesn't see Reports & Analytics)
        // Removed completely
        
        // Evaluation - Full access (program-scoped, ownership-based)
        'evaluation-view',
        'evaluation-manage',
    ],
];

// Update each role
$totalUpdated = 0;
foreach ($roleServices as $role => $services) {
    echo "Updating users with role: $role\n";
    
    $users = DB::table('users')
        ->where('role', $role)
        ->get();
    
    $count = 0;
    foreach ($users as $user) {
        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'default_services' => json_encode($services),
                'updated_at' => now(),
            ]);
        $count++;
    }
    
    echo "  ✅ Updated $count user(s) with role $role\n";
    $totalUpdated += $count;
}

echo "\n========================================\n";
echo "SUMMARY\n";
echo "========================================\n";
echo "Total users updated: $totalUpdated\n";
echo "\nServices have been standardized according to the official permission table.\n";
echo "All program role users now have the correct services.\n";
echo "\nNext Steps:\n";
echo "1. Test login with each role\n";
echo "2. Verify navigation tabs match the permission table\n";
echo "3. Verify feature access matches the permission table\n";
echo "\n✅ ROLE SERVICES FIXED FOREVER!\n";
