<?php

/**
 * FIX ALL DEFAULT ROLE SERVICES - FINAL VERSION
 * 
 * This script ensures that ALL default role users have the correct services in the database
 * that match what they actually see in the navigation and what Role & Services modal should display.
 * 
 * Created: February 4, 2026
 * Purpose: Make database the source of truth - services in DB = what users see
 * 
 * ROLE DEFINITIONS BASED ON NAVIGATION LOGIC (permissions.ts):
 * 
 * Navigation Logic:
 * - Dashboard: requires 'dashboard' service
 * - Organizations: requires 'list_organization' service
 * - Programs: requires 'list_programs' service
 * - Participants: requires 'list_participants' or 'list_program_participants'
 * - Questionnaires: requires 'question_list' or 'category_list' or 'question_bank_list'
 * - Events/Activities: requires 'list_activity' service
 * - Reports & Analytics: requires 'view_report' or 'report_download' or 'filter_report'
 * - Roles & Services: only for super-admin and program-admin (no service check, role-based)
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "  FIX ALL DEFAULT ROLE SERVICES - FINAL VERSION\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "Making database services match navigation display...\n\n";

// Create backup first
$backupFile = '/tmp/role_services_backup_' . date('Y-m-d_His') . '.json';
echo "📦 Creating backup of current services...\n";

$allUsers = DB::table('users')
    ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator', 'evaluation-admin', 'group-head', 'participant'])
    ->select('id', 'email', 'role', 'default_services')
    ->get();

$backup = [];
foreach ($allUsers as $user) {
    $backup[] = [
        'id' => $user->id,
        'email' => $user->email,
        'role' => $user->role,
        'services' => json_decode($user->default_services ?? '[]', true)
    ];
}

file_put_contents($backupFile, json_encode($backup, JSON_PRETTY_PRINT));
echo "✅ Backup saved to: $backupFile\n";
echo "   Total users backed up: " . count($backup) . "\n\n";

// Define correct services for each role
// Services MUST match what navigation logic checks in permissions.ts
$roleServices = [
    'program-admin' => [
        // Dashboard
        'dashboard',
        
        // Organizations - Full access
        'list_organization',
        'add_organization',
        'edit_organization',
        'disable_organization',
        
        // Group Heads - Full access
        'list_group_head',
        'add_group_head',
        'edit_group_head',
        'disable_group_head',
        
        // Programs - Full access
        'list_programs',
        'add_program',
        'edit_program',
        'disable_program',
        
        // Participants - Full access
        'list_program_participants',
        'list_participants',
        'add_participants',
        'edit_participants',
        'disable_participants',
        
        // Questionnaires - Full access
        'category_list',
        'category_add',
        'category_edit',
        'category_status',
        'question_list',
        'question_add',
        'question_edit',
        'question_bank_list',
        'question_bank_add',
        'question_bank_edit',
        'question_bank_status',
        'question_header_list',
        'question_header_add',
        'question_header_edit',
        
        // Activities/Events - Full access
        'list_activity',
        'activity_add',
        'activity_edit',
        'activity_status',
        'activity_files_listing',
        'activity_files_upload',
        'delete_activity_files',
        'generate_activity_link',
        
        // Reports - Full access
        'view_report',
        'report_download',
        'filter_report',
        'edit_dynamic_report',
        'dynamic_report_status',
        'dynamic_report_list',
        'generate_dynamic_report',
        
        // Communications
        'send_email',
        'email_status',
        'list_email',
        'send_sms',
        'sms_status',
        'sms_edit',
        
        // Users & Roles
        'list_user',
        'add_user',
        'edit_user',
        'map_user',
        'list_roles',
        'add_roles',
        'edit_roles',
        
        // Evaluation - NO ACCESS
        // Activities services INCLUDED (program-admin manages all)
    ],
    
    'program-manager' => [
        // Dashboard
        'dashboard',
        
        // Organizations - View only
        'list_organization',
        
        // Programs - View only
        'list_programs',
        
        // Participants - View and Edit
        'list_program_participants',
        'list_participants',
        'edit_participants',
        
        // Questionnaires - View and Edit (can duplicate)
        'category_list',
        'question_list',
        'question_edit',
        'question_bank_list',
        'question_header_list',
        
        // Activities/Events - Create and Manage
        'list_activity',
        'activity_add',
        'activity_status',
        'activity_files_listing',
        'generate_activity_link',
        
        // Reports - View and Export
        'view_report',
        'report_download',
        'filter_report',
        
        // Communications
        'send_email',
        'email_status',
        
        // Evaluation - NO ACCESS
    ],
    
    'program-moderator' => [
        // Dashboard
        'dashboard',
        
        // Activities/Events - View only (to run them)
        'list_activity',
        'activity_status',
        
        // Reports - View and Export
        'view_report',
        'report_download',
        'filter_report',
        
        // NO Organizations
        // NO Programs
        // NO Participants
        // NO Questionnaires
        // NO Evaluation
    ],
    
    'evaluation-admin' => [
        // Dashboard
        'dashboard',
        
        // Organizations - View only
        'list_organization',
        
        // Programs - View only
        'list_programs',
        
        // Questionnaires - Full access
        'category_list',
        'category_add',
        'category_edit',
        'category_status',
        'question_list',
        'question_add',
        'question_edit',
        'question_bank_list',
        'question_bank_add',
        'question_bank_edit',
        'question_bank_status',
        'question_header_list',
        'question_header_add',
        'question_header_edit',
        
        // Evaluation - Full access
        'list_evaluation',
        'add_evaluation',
        'edit_evaluation',
        'disable_evaluation',
        'view_evaluation_results',
        
        // NO Activities/Events (removed list_activity)
        // NO Reports (removed view_report, report_download, filter_report)
        // NO Participants
    ],
    
    'group-head' => [
        // Dashboard
        'dashboard',
        
        // Team management
        'list_participants',
        'list_program_participants',
        
        // Reports - View only
        'view_report',
        'filter_report',
        
        // NO full access to other modules
    ],
    
    'participant' => [
        // Dashboard (limited)
        'dashboard',
        
        // Activities - Can participate
        'list_activity',
        
        // NO administrative access
    ],
];

echo "───────────────────────────────────────────────────────────────\n";
echo "UPDATING ROLE SERVICES\n";
echo "───────────────────────────────────────────────────────────────\n\n";

// Track changes
$stats = [];
$totalUpdated = 0;

foreach ($roleServices as $role => $services) {
    echo "🔧 Processing role: $role\n";
    
    $users = DB::table('users')
        ->where('role', $role)
        ->get();
    
    if ($users->isEmpty()) {
        echo "   ⚠️  No users found with this role\n\n";
        continue;
    }
    
    $count = 0;
    $serviceJson = json_encode($services);
    
    foreach ($users as $user) {
        // Check if services are different
        $currentServices = json_decode($user->default_services ?? '[]', true);
        sort($currentServices);
        $newServices = $services;
        sort($newServices);
        
        if ($currentServices !== $newServices) {
            DB::table('users')
                ->where('id', $user->id)
                ->update([
                    'default_services' => $serviceJson,
                    'updated_at' => now(),
                ]);
            $count++;
            echo "   ✅ Updated: {$user->email} (ID: {$user->id})\n";
        } else {
            echo "   ℹ️  Skipped: {$user->email} (already correct)\n";
        }
    }
    
    $stats[$role] = [
        'total' => $users->count(),
        'updated' => $count
    ];
    $totalUpdated += $count;
    
    echo "   📊 Total users: {$users->count()}, Updated: $count\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "SUMMARY\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

foreach ($stats as $role => $data) {
    echo sprintf("%-25s Total: %3d  |  Updated: %3d\n", 
        ucfirst(str_replace('-', ' ', $role)) . ':', 
        $data['total'], 
        $data['updated']
    );
}

echo "\n───────────────────────────────────────────────────────────────\n";
echo "Total users updated: $totalUpdated\n";
echo "Backup location: $backupFile\n";
echo "───────────────────────────────────────────────────────────────\n\n";

echo "✅ ALL DEFAULT ROLE SERVICES UPDATED!\n\n";

echo "NEXT STEPS:\n";
echo "1. Test login with each role type\n";
echo "2. Verify navigation tabs match the services above\n";
echo "3. Open 'Role & Services' modal - checkboxes should match database\n";
echo "4. Try adding/removing services for a user - should work correctly\n\n";

echo "WHAT WAS FIXED:\n";
echo "• evaluation-admin: Removed activities and reports services\n";
echo "• program-manager: Verified activities services are included\n";
echo "• program-moderator: Verified limited services\n";
echo "• program-admin: Verified full services\n";
echo "• Database now matches navigation logic in permissions.ts\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
