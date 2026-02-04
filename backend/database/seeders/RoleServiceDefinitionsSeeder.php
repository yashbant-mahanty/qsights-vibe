<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleServiceDefinitionsSeeder extends Seeder
{
    /**
     * Run the database seeder.
     * 
     * This defines which services each role TYPE can have selected.
     * These services match what the navigation and permissions actually check for.
     */
    public function run(): void
    {
        $definitions = [
            [
                'role_name' => 'super-admin',
                'description' => 'System administrators with full access to all features',
                'is_system_role' => true,
                'allow_custom_services' => true,
                'available_services' => json_encode([]) // Empty = all services allowed
            ],
            [
                'role_name' => 'admin',
                'description' => 'Organization administrators with full access',
                'is_system_role' => true,
                'allow_custom_services' => true,
                'available_services' => json_encode([]) // Empty = all services allowed
            ],
            [
                'role_name' => 'program-admin',
                'description' => 'Program administrators with full program-scoped access',
                'is_system_role' => false,
                'allow_custom_services' => false,
                'available_services' => json_encode([
                    // Dashboard
                    'dashboard',
                    
                    // Organizations
                    'list_organization',
                    'add_organization',
                    'edit_organization',
                    'disable_organization',
                    
                    // Group Heads
                    'list_group_head',
                    'add_group_head',
                    'edit_group_head',
                    'disable_group_head',
                    'add_group',
                    'edit_group',
                    'group_map',
                    'group_list',
                    'group_status',
                    'bulk_upload',
                    
                    // Programs
                    'list_programs',
                    'add_programs',
                    'edit_programs',
                    'disable_programs',
                    
                    // Participants
                    'list_program_participants',
                    'list_participants',
                    'add_participants',
                    'edit_participants',
                    'disable_participants',
                    'add_program_participants',
                    
                    // Questionnaires
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
                    
                    // Activities/Events
                    'list_activity',
                    'activity_add',
                    'activity_edit',
                    'activity_status',
                    'activity_files_listing',
                    'activity_files_upload',
                    'delete_activity_files',
                    'generate_activity_link',
                    
                    // Reports
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
                ])
            ],
            [
                'role_name' => 'program-manager',
                'description' => 'Program managers with operational access',
                'is_system_role' => false,
                'allow_custom_services' => false,
                'available_services' => json_encode([
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
                    
                    // Questionnaires - View and Edit
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
                ])
            ],
            [
                'role_name' => 'program-moderator',
                'description' => 'Program moderators with limited operational access',
                'is_system_role' => false,
                'allow_custom_services' => false,
                'available_services' => json_encode([
                    // Dashboard
                    'dashboard',
                    
                    // Activities/Events - View only
                    'list_activity',
                    'activity_status',
                    
                    // Reports - View and Export
                    'view_report',
                    'report_download',
                    'filter_report',
                ])
            ],
            [
                'role_name' => 'evaluation-admin',
                'description' => 'Evaluation administrators with questionnaire and evaluation access',
                'is_system_role' => false,
                'allow_custom_services' => false,
                'available_services' => json_encode([
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
                    
                    // NO Activities (list_activity excluded)
                    // NO Reports (view_report excluded)
                ])
            ],
            [
                'role_name' => 'group-head',
                'description' => 'Group heads with team management access',
                'is_system_role' => false,
                'allow_custom_services' => false,
                'available_services' => json_encode([
                    // Dashboard
                    'dashboard',
                    
                    // Team management
                    'list_participants',
                    'list_program_participants',
                    
                    // Reports - View only
                    'view_report',
                    'filter_report',
                ])
            ],
            [
                'role_name' => 'participant',
                'description' => 'Participants with basic access',
                'is_system_role' => false,
                'allow_custom_services' => false,
                'available_services' => json_encode([
                    // Dashboard
                    'dashboard',
                    
                    // Activities - Can participate
                    'list_activity',
                ])
            ],
        ];

        foreach ($definitions as $definition) {
            DB::table('role_service_definitions')->updateOrInsert(
                ['role_name' => $definition['role_name']],
                array_merge($definition, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✅ Role service definitions seeded successfully!');
    }
}
