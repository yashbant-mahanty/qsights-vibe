<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Updating all role user services to match ProgramRoleController...\n\n";

// Define default services for each role
$roleServices = [
    'program-admin' => [
        // Dashboard
        'dashboard',
        
        // Organizations - View only for program-admin
        'list_organization',
        
        // Programs - Full access
        'list_programs', 'add_programs', 'edit_programs', 'disable_programs',
        
        // Group Heads
        'list_group_head', 'add_group_head', 'edit_group_head', 'disable_group_head',
        
        // Participants - Full access
        'list_program_participants', 'add_program_participants', 'list_participants', 
        'add_participants', 'edit_participants', 'disable_participants',
        
        // Activities - Full access
        'list_activity', 'activity_add', 'activity_status', 'activity_files_listing',
        'activity_files_upload', 'delete_activity_files', 'generate_activity_link',
        
        // Questionnaires - Full access
        'category_list', 'category_add', 'category_edit', 'category_status',
        'question_list', 'question_add', 'question_edit',
        'question_bank_list', 'question_bank_add', 'question_bank_edit', 'question_bank_status',
        'question_header_list', 'question_header_add', 'question_header_edit',
        
        // Reports - Full access
        'view_report', 'report_download', 'filter_report', 'edit_dynamic_report',
        'dynamic_report_status', 'dynamic_report_list', 'generate_dynamic_report',
        
        // Communications
        'send_email', 'email_status', 'list_email', 'send_sms', 'sms_status', 'sms_edit',
        
        // Users & Roles
        'list_user', 'add_user', 'edit_user', 'map_user',
        'list_roles', 'add_roles', 'edit_roles',
    ],
    
    'program-manager' => [
        // Dashboard
        'dashboard',
        
        // Organizations - View only
        'list_organization',
        
        // Programs - View only
        'list_programs',
        
        // Participants - View and Edit
        'list_program_participants', 'list_participants', 'edit_participants',
        
        // Activities - View, Create, Edit
        'list_activity', 'activity_add', 'activity_status', 'activity_files_listing',
        'generate_activity_link',
        
        // Questionnaires - View and Edit
        'category_list', 'question_list', 'question_edit',
        'question_bank_list', 'question_header_list',
        
        // Reports - View and Export
        'view_report', 'report_download', 'filter_report',
        
        // Communications - Send notifications
        'send_email', 'email_status',
    ],
    
    'program-moderator' => [
        // Dashboard
        'dashboard',
        
        // Activities - View only
        'list_activity', 'activity_status',
        
        // Reports - View and Export
        'view_report', 'report_download', 'filter_report',
    ],
    
    'evaluation-admin' => [
        // Dashboard
        'dashboard',
        
        // Organizations - View only
        'list_organization',
        
        // Programs - View only
        'list_programs',
        
        // Questionnaires - Full access
        'category_list', 'category_add', 'category_edit', 'category_status',
        'question_list', 'question_add', 'question_edit',
        'question_bank_list', 'question_bank_add', 'question_bank_edit', 'question_bank_status',
        'question_header_list', 'question_header_add', 'question_header_edit',
        
        // Activities - Full access
        'list_activity', 'activity_add', 'activity_status', 'activity_files_listing',
        'activity_files_upload', 'delete_activity_files', 'generate_activity_link',
        
        // Evaluation - Full access
        'list_evaluation', 'add_evaluation', 'edit_evaluation', 'disable_evaluation', 'view_evaluation_results',
        
        // Reports - View and Export
        'view_report', 'report_download', 'filter_report',
    ],
];

// Update each role
foreach ($roleServices as $role => $services) {
    $updated = DB::table('users')
        ->where('role', $role)
        ->update([
            'default_services' => json_encode($services),
            'updated_at' => now(),
        ]);
    
    if ($updated > 0) {
        echo "✅ Updated $updated {$role} user(s) with " . count($services) . " services\n";
    } else {
        echo "⚠️  No {$role} users found to update\n";
    }
}

echo "\n✨ All role services have been updated!\n";
