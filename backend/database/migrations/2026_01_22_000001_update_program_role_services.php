<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Update existing Program role users with correct default services
     * to match the standardized role behavior.
     */
    public function up(): void
    {
        // Update Program Admin users
        DB::table('users')
            ->where('role', 'program-admin')
            ->update([
                'default_services' => json_encode([
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
                    
                    // Evaluation - Full access (like Super Admin, program-scoped)
                    'evaluation-view',
                    'evaluation-manage',
                ]),
                'updated_at' => now(),
            ]);

        // Update Program Manager users
        DB::table('users')
            ->where('role', 'program-manager')
            ->update([
                'default_services' => json_encode([
                    // Dashboard
                    'dashboard',
                    
                    // Programs - View only
                    'programs-view',
                    
                    // Participants - View and Edit
                    'participants-view',
                    'participants-edit',
                    
                    // Questionnaires - View and Edit only (NO create, NO delete)
                    'questionnaires-view',
                    'questionnaires-edit',
                    
                    // Activities/Events - View and Edit only (NO create, NO delete)
                    'activities-view',
                    'activities-edit',
                    'activities-send-notification',
                    'activities-landing-config',
                    
                    // Reports - View and Export
                    'reports-view',
                    'reports-export',
                    
                    // Evaluation - Full access (like Super Admin, program-scoped)
                    'evaluation-view',
                    'evaluation-manage',
                ]),
                'updated_at' => now(),
            ]);

        // Update Program Moderator users
        DB::table('users')
            ->where('role', 'program-moderator')
            ->update([
                'default_services' => json_encode([
                    // Dashboard
                    'dashboard',
                    
                    // Activities/Events - View only
                    'activities-view',
                    
                    // Reports - View and Export
                    'reports-view',
                    'reports-export',
                    
                    // Evaluation - Full access (like Super Admin, program-scoped)
                    'evaluation-view',
                    'evaluation-manage',
                ]),
                'updated_at' => now(),
            ]);

        \Log::info('Updated default services for existing Program role users', [
            'program_admin_count' => DB::table('users')->where('role', 'program-admin')->count(),
            'program_manager_count' => DB::table('users')->where('role', 'program-manager')->count(),
            'program_moderator_count' => DB::table('users')->where('role', 'program-moderator')->count(),
        ]);
    }

    /**
     * Reverse the migrations.
     * 
     * Revert to previous default services (if needed)
     */
    public function down(): void
    {
        // Revert to old services (this is for safety, usually not needed)
        DB::table('users')
            ->where('role', 'program-admin')
            ->update([
                'default_services' => json_encode([
                    'dashboard',
                    'activities-view',
                    'activities-create',
                    'activities-edit',
                    'activities-delete',
                    'activities-send-notification',
                    'activities-set-reminder',
                    'activities-landing-config',
                    'participants-view',
                    'participants-create',
                    'participants-edit',
                    'participants-delete',
                    'reports-view',
                    'reports-export',
                ]),
            ]);

        DB::table('users')
            ->where('role', 'program-manager')
            ->update([
                'default_services' => json_encode([
                    'dashboard',
                    'activities-view',
                    'activities-create',
                    'activities-edit',
                    'activities-send-notification',
                    'activities-landing-config',
                    'participants-view',
                    'participants-edit',
                    'reports-view',
                    'reports-export',
                ]),
            ]);

        DB::table('users')
            ->where('role', 'program-moderator')
            ->update([
                'default_services' => json_encode([
                    'dashboard',
                    'activities-view',
                    'reports-view',
                    'reports-export',
                ]),
            ]);
    }
};
