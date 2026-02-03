<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Updating evaluation-admin user services...\n";

// Correct services matching ProgramRoleController's available services
$correctServices = [
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
];

// Update all evaluation-admin users
$updated = DB::table('users')
    ->where('role', 'evaluation-admin')
    ->update([
        'default_services' => json_encode($correctServices),
        'updated_at' => now(),
    ]);

echo "✅ Updated $updated evaluation-admin user(s) with correct services\n";
echo "\nServices assigned:\n";
foreach ($correctServices as $service) {
    echo "  - $service\n";
}
