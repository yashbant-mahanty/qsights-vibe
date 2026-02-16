<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\GroupHeadController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\QuestionnaireController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ActivityApprovalRequestController;
use App\Http\Controllers\Api\ManagerReviewController;
use App\Http\Controllers\Api\ProgramController;
use App\Http\Controllers\Api\ProgramRoleController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\QuestionnaireImportController;
use App\Http\Controllers\Api\SendGridWebhookController;
use App\Http\Controllers\Api\HierarchyController;

// Public Authentication Routes
Route::post('/auth/validate-email', [AuthController::class, 'validateEmail']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Password Reset Routes (Public)
Route::post('/auth/forgot-password', [App\Http\Controllers\Api\PasswordResetController::class, 'requestOTP']);
Route::post('/auth/find-accounts', [App\Http\Controllers\Api\PasswordResetController::class, 'findAccounts']);
Route::post('/auth/verify-otp', [App\Http\Controllers\Api\PasswordResetController::class, 'verifyOTP']);
Route::post('/auth/reset-password', [App\Http\Controllers\Api\PasswordResetController::class, 'resetPassword']);

// Email-Embedded Response Submission (Public - No Auth Required)
Route::get('/public/email-response', [App\Http\Controllers\Api\Public\EmailResponseController::class, 'submit']);

// Generated Link Validation (Public - No Auth Required for participants)
Route::get('/public/generated-link/validate/{token}', [App\Http\Controllers\Api\Public\GeneratedLinkValidationController::class, 'validate']);
Route::post('/public/generated-link/mark-used', [App\Http\Controllers\Api\Public\GeneratedLinkValidationController::class, 'markAsUsed']);

// Manager Review Public Routes (No Auth Required - Token-based access)
Route::prefix('manager/review')->group(function () {
    Route::get('/{token}', [ManagerReviewController::class, 'validateToken']);
    Route::post('/{token}', [ManagerReviewController::class, 'submitReview']);
});

// SendGrid Webhook (Public - No Auth Required, SendGrid will POST to this)
Route::post('/webhooks/sendgrid', [SendGridWebhookController::class, 'handle']);

// Protected Authentication Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Dashboard Routes (Super Admin, Admin, Evaluation Admin, and System User)
Route::middleware(['auth:sanctum', 'role:super-admin,admin,evaluation-admin,system-user'])->prefix('dashboard')->group(function () {
    Route::get('/global-statistics', [DashboardController::class, 'globalStatistics']);
    Route::get('/organization-performance', [DashboardController::class, 'organizationPerformance']);
    Route::get('/subscription-metrics', [DashboardController::class, 'subscriptionMetrics']);
});

// Program Engagement Trends - Accessible by program roles
Route::middleware(['auth:sanctum', 'role:super-admin,program-admin,program-manager,program-moderator'])->group(function () {
    Route::get('/dashboard/program-engagement-trends', [DashboardController::class, 'programEngagementTrends']);
});

// Theme/Landing Config Routes
Route::prefix('landing-config')->group(function () {
    // Public read endpoint (for loading landing page)
    Route::get('/', function () {
        $configPath = storage_path('app/landing-config.json');
        if (file_exists($configPath)) {
            return response()->json(json_decode(file_get_contents($configPath), true));
        }
        // Return default config
        return response()->json([
            'general' => [
                'template_style' => ['value' => 'advanced']
            ]
        ]);
    });
    
    // Admin only endpoints
    Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(function () {
        Route::post('/', function (\Illuminate\Http\Request $request) {
            $configPath = storage_path('app/landing-config.json');
            file_put_contents($configPath, json_encode($request->all(), JSON_PRETTY_PRINT));
            return response()->json(['message' => 'Configuration saved successfully']);
        });
    });
});

// Organization Routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Public read operations (all authenticated users including system-user)
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{id}', [OrganizationController::class, 'show']);
    
    // Admin-only operations
    Route::middleware(['role:super-admin,admin'])->group(function () {
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::put('/organizations/{id}', [OrganizationController::class, 'update']);
        Route::patch('/organizations/{id}', [OrganizationController::class, 'update']);
        Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
        Route::post('/organizations/{id}/deactivate', [OrganizationController::class, 'deactivate']);
        Route::post('/organizations/{id}/activate', [OrganizationController::class, 'activate']);
        Route::post('/organizations/{id}/restore', [OrganizationController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/organizations/{id}/force', [OrganizationController::class, 'forceDestroy']);
    });
});

// Group Head Routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Public read operations (all authenticated users including system-user)
    Route::get('/group-heads', [GroupHeadController::class, 'index']);
    Route::get('/group-heads/{id}', [GroupHeadController::class, 'show']);
    
    // Admin-only operations (super-admin and admin can manage group heads)
    Route::middleware(['role:super-admin,admin'])->group(function () {
        Route::post('/group-heads', [GroupHeadController::class, 'store']);
        Route::put('/group-heads/{id}', [GroupHeadController::class, 'update']);
        Route::patch('/group-heads/{id}', [GroupHeadController::class, 'update']);
        Route::delete('/group-heads/{id}', [GroupHeadController::class, 'destroy']);
        Route::post('/group-heads/{id}/deactivate', [GroupHeadController::class, 'deactivate']);
        Route::post('/group-heads/{id}/activate', [GroupHeadController::class, 'activate']);
        Route::post('/group-heads/{id}/reset-password', [GroupHeadController::class, 'resetPassword']);
        Route::post('/group-heads/{id}/restore', [GroupHeadController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/group-heads/{id}/force', [GroupHeadController::class, 'forceDestroy']);
    });
});

// Program Routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Public read operations (all authenticated users including system-user)
    Route::get('/programs', [ProgramController::class, 'index']);
    Route::get('/programs/{id}', [ProgramController::class, 'show']);
    Route::get('/programs/{id}/statistics', [ProgramController::class, 'statistics']);
    Route::get('/programs/{id}/users', [ProgramController::class, 'getProgramUsers']);
    
    // Program Users Management (Super Admin and Program Admin only)
    Route::middleware(['role:super-admin,program-admin'])->group(function () {
        Route::put('/programs/{id}/users/{userId}', [ProgramController::class, 'updateProgramUser']);
        Route::patch('/programs/{id}/users/{userId}', [ProgramController::class, 'updateProgramUser']);
        Route::delete('/programs/{id}/users/{userId}', [ProgramController::class, 'deleteProgramUser']);
        Route::post('/programs/{id}/users/{userId}/reset-password', [ProgramController::class, 'resetProgramUserPassword']);
    });
    
    // Update user services (Super Admin and Admin only)
    Route::middleware(['role:super-admin,admin'])->group(function () {
        Route::put('/programs/{id}/users/{userId}/services', [ProgramController::class, 'updateProgramUserServices']);
        Route::patch('/programs/{id}/users/{userId}/services', [ProgramController::class, 'updateProgramUserServices']);
    });
    
    // Get available services for a role (for filtering modal)
    Route::get('/roles/{roleName}/available-services', [ProgramController::class, 'getRoleAvailableServices']);
    
    // Program Roles Routes (Super Admin and Program Admin only)
    Route::middleware(['role:super-admin,program-admin'])->group(function () {
        Route::get('/programs/{programId}/roles', [ProgramRoleController::class, 'index']);
        Route::get('/programs/{programId}/roles/available-activities', [ProgramRoleController::class, 'getAvailableActivities']);
        Route::get('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'show']);
        Route::post('/programs/{programId}/roles', [ProgramRoleController::class, 'store']);
        Route::put('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'update']);
        Route::patch('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'update']);
        Route::delete('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'destroy']);
        Route::post('/programs/{programId}/roles/{roleId}/restore', [ProgramRoleController::class, 'restore']);
    });

    // System-wide Roles Routes (Super Admin only)
    Route::middleware(['role:super-admin'])->group(function () {
        Route::get('/system-roles', [ProgramRoleController::class, 'indexSystemRoles']);
        Route::get('/system-roles/available-services', [ProgramRoleController::class, 'getAvailableServicesForSystemRoles']);
        Route::post('/system-roles', [ProgramRoleController::class, 'storeSystemRole']);
        Route::get('/system-roles/{roleId}', [ProgramRoleController::class, 'showSystemRole']);
        Route::put('/system-roles/{roleId}', [ProgramRoleController::class, 'updateSystemRole']);
        Route::delete('/system-roles/{roleId}', [ProgramRoleController::class, 'destroySystemRole']);
    });

    // Hierarchy Mapping Routes (Super Admin and Program Admin)
    Route::middleware(['role:super-admin,program-admin'])->group(function () {
        Route::get('/hierarchy-mappings', [\App\Http\Controllers\Api\HierarchyMappingController::class, 'index']);
        Route::post('/hierarchy-mappings', [\App\Http\Controllers\Api\HierarchyMappingController::class, 'store']);
        Route::delete('/hierarchy-mappings/{id}', [\App\Http\Controllers\Api\HierarchyMappingController::class, 'destroy']);
        Route::get('/hierarchy-mappings/program/{programId}', [\App\Http\Controllers\Api\HierarchyMappingController::class, 'getHierarchyTree']);
    });
    
    // Admin and Group Head can manage programs
    Route::middleware(['role:super-admin,admin,group-head'])->group(function () {
        Route::post('/programs', [ProgramController::class, 'store']);
        Route::put('/programs/{id}', [ProgramController::class, 'update']);
        Route::patch('/programs/{id}', [ProgramController::class, 'update']);
        Route::delete('/programs/{id}', [ProgramController::class, 'destroy']);
        Route::post('/programs/{id}/deactivate', [ProgramController::class, 'deactivate']);
        Route::post('/programs/{id}/activate', [ProgramController::class, 'activate']);
        Route::post('/programs/{id}/restore', [ProgramController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/programs/{id}/force', [ProgramController::class, 'forceDestroy']);
    });
});

// Participant Routes
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Public read operations
    Route::get('/participants', [ParticipantController::class, 'index']);
    Route::get('/participants/{id}', [ParticipantController::class, 'show']);
    Route::get('/participants/template/download', [ParticipantController::class, 'downloadTemplate']);
    
    // Admin, Program roles, and System User can manage participants
    Route::middleware(['role:super-admin,admin,group-head,program-admin,program-manager,system-user'])->group(function () {
        Route::post('/participants', [ParticipantController::class, 'store']);
        Route::post('/participants/bulk-import', [ParticipantController::class, 'bulkImport']);
        Route::post('/participants/bulk-delete', [ParticipantController::class, 'bulkDelete']);
        Route::put('/participants/{id}', [ParticipantController::class, 'update']);
        Route::patch('/participants/{id}', [ParticipantController::class, 'update']);
        Route::delete('/participants/{id}', [ParticipantController::class, 'destroy']);
        Route::post('/participants/{id}/activate', [ParticipantController::class, 'activate']);
        Route::post('/participants/{id}/deactivate', [ParticipantController::class, 'deactivate']);
        Route::post('/participants/{id}/assign-programs', [ParticipantController::class, 'assignPrograms']);
        Route::post('/participants/{id}/unassign-programs', [ParticipantController::class, 'unassignPrograms']);
        Route::post('/participants/{id}/restore', [ParticipantController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/participants/{id}/force', [ParticipantController::class, 'forceDestroy']);
    });
});

// S3 Upload Routes
Route::middleware(['auth:sanctum'])->prefix('uploads/s3')->group(function () {
    Route::get('/config', [App\Http\Controllers\Api\S3UploadController::class, 'checkConfig']);
    Route::post('/', [App\Http\Controllers\Api\S3UploadController::class, 'upload']);
    Route::post('/bulk', [App\Http\Controllers\Api\S3UploadController::class, 'uploadBulk']);
    Route::delete('/', [App\Http\Controllers\Api\S3UploadController::class, 'delete']);
    Route::post('/presigned-url', [App\Http\Controllers\Api\S3UploadController::class, 'getPresignedUrl']);
    Route::post('/view-url', [App\Http\Controllers\Api\S3UploadController::class, 'getViewUrl']);
    Route::post('/bulk-view-urls', [App\Http\Controllers\Api\S3UploadController::class, 'getBulkViewUrls']);
});

// Video Upload Routes (Questionnaire Videos)
Route::middleware(['auth:sanctum'])->prefix('videos')->group(function () {
    Route::post('/upload', [App\Http\Controllers\Api\VideoUploadController::class, 'uploadVideo']);
    Route::post('/metadata', [App\Http\Controllers\Api\VideoUploadController::class, 'saveVideoMetadata']);
    Route::get('/questionnaire/{questionnaireId}', [App\Http\Controllers\Api\VideoUploadController::class, 'getVideoByQuestionnaire']);
    Route::delete('/{videoId}', [App\Http\Controllers\Api\VideoUploadController::class, 'deleteVideo']);
    Route::get('/statistics/{questionnaireId}', [App\Http\Controllers\Api\VideoUploadController::class, 'getVideoStatistics']);
    
    // Video Question Upload (for VIDEO question type)
    Route::post('/question/upload', [App\Http\Controllers\Api\VideoUploadController::class, 'uploadVideoQuestion']);
});

// Public Video View Logging (No auth required for participants)
Route::post('/public/videos/log-view', [App\Http\Controllers\Api\VideoUploadController::class, 'logVideoView']);
Route::post('/public/videos/watch-log', [App\Http\Controllers\Api\VideoUploadController::class, 'getParticipantWatchLog']);
Route::get('/public/videos/questionnaire/{questionnaireId}', [App\Http\Controllers\Api\VideoUploadController::class, 'getVideoByQuestionnaire']);

// Video Question Watch Tracking (Public - for participants taking activity)
Route::post('/public/videos/question/track-progress', [App\Http\Controllers\Api\VideoUploadController::class, 'trackVideoQuestionProgress']);
Route::post('/public/videos/question/get-progress', [App\Http\Controllers\Api\VideoUploadController::class, 'getVideoQuestionProgress']);

// Public S3 View URL - For displaying videos and images on public pages (take activity, etc.)
Route::post('/public/s3/view-url', [App\Http\Controllers\Api\S3UploadController::class, 'getViewUrl']);

// Video Question Analytics (for reports)
Route::get('/videos/question/{questionId}/view-logs', [App\Http\Controllers\Api\VideoUploadController::class, 'getVideoQuestionViewLogs']);
Route::get('/videos/question/statistics/{questionId}', [App\Http\Controllers\Api\VideoUploadController::class, 'getVideoQuestionStatistics']);

// Questionnaire Routes
Route::middleware(['auth:sanctum'])->group(function () {

    
    // Public read operations
    Route::get('/questionnaires', [QuestionnaireController::class, 'index']);
    Route::get('/questionnaires/{id}', [QuestionnaireController::class, 'show']);
    
    // Admin and Program roles can manage questionnaires (including evaluation-admin for custom evaluation forms)
    Route::middleware(['role:super-admin,admin,group-head,program-admin,program-manager,evaluation-admin'])->group(function () {
        Route::post('/questionnaires', [QuestionnaireController::class, 'store']);
        Route::put('/questionnaires/{id}', [QuestionnaireController::class, 'update']);
        Route::patch('/questionnaires/{id}', [QuestionnaireController::class, 'update']);
        Route::delete('/questionnaires/{id}', [QuestionnaireController::class, 'destroy']);
        Route::post('/questionnaires/{id}/publish', [QuestionnaireController::class, 'publish']);
        Route::post('/questionnaires/{id}/archive', [QuestionnaireController::class, 'archive']);
        Route::post('/questionnaires/{id}/duplicate', [QuestionnaireController::class, 'duplicate']);
        Route::post('/questionnaires/{id}/restore', [QuestionnaireController::class, 'restore']);
        
        // Import functionality
        Route::get('/questionnaires/import/template', [QuestionnaireImportController::class, 'downloadTemplate']);
        Route::post('/questionnaires/import/parse', [QuestionnaireImportController::class, 'parseFile']);
        Route::post('/questionnaires/import', [QuestionnaireImportController::class, 'import']);
        
        // Section management
        Route::post('/questionnaires/{id}/sections', [QuestionnaireController::class, 'addSection']);
        Route::put('/questionnaires/{questionnaire}/sections/{section}', [QuestionnaireController::class, 'updateSection']);
        Route::delete('/questionnaires/{questionnaire}/sections/{section}', [QuestionnaireController::class, 'deleteSection']);
        
        // Question management
        Route::post('/questionnaires/{questionnaire}/sections/{section}/questions', [QuestionnaireController::class, 'addQuestion']);
        Route::put('/questionnaires/{questionnaire}/sections/{section}/questions/{question}', [QuestionnaireController::class, 'updateQuestion']);
        Route::delete('/questionnaires/{questionnaire}/sections/{section}/questions/{question}', [QuestionnaireController::class, 'deleteQuestion']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/questionnaires/{id}/force', [QuestionnaireController::class, 'forceDestroy']);
    });
});

// Activity Routes
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Activity Approval Requests
    Route::prefix('activity-approvals')->group(function () {
        Route::get('/', [ActivityApprovalRequestController::class, 'index']);
        Route::get('/my-requests', [ActivityApprovalRequestController::class, 'myRequests'])
            ->middleware(['role:program-admin,program-manager']);
        
        // Manager Review Routes (authenticated)
        Route::post('/{id}/send-manager-review', [ManagerReviewController::class, 'sendManagerReview'])
            ->middleware(['role:program-admin,program-manager,super-admin']);
        Route::post('/{id}/resend-manager-review', [ManagerReviewController::class, 'resendManagerReview'])
            ->middleware(['role:program-admin,program-manager,super-admin']);
        Route::get('/statistics', [ActivityApprovalRequestController::class, 'statistics']);
        Route::get('/{id}', [ActivityApprovalRequestController::class, 'show']);
        Route::post('/', [ActivityApprovalRequestController::class, 'store'])
            ->middleware(['role:program-admin,program-manager']);
        Route::post('/{id}/resend', [ActivityApprovalRequestController::class, 'resend'])
            ->middleware(['role:program-admin,program-manager']);
        Route::post('/{id}/review', [ActivityApprovalRequestController::class, 'review'])
            ->middleware(['role:super-admin,admin']);
    });
    
    // Public read operations (all authenticated users including system-user)
    Route::get('/activities', [ActivityController::class, 'index']);
    Route::get('/activities/statistics', [ActivityController::class, 'statistics']);
    Route::post('/activities/participant-counts', [ActivityController::class, 'getParticipantCounts']);
    Route::get('/activities/{id}/participants', [ActivityController::class, 'getParticipants']);
    Route::get('/activities/{id}', [ActivityController::class, 'show']);
    Route::get('/activities/{id}/links', [ActivityController::class, 'getActivityLinks']);
    
    // Generated Event Links (Unique one-time-use links)
    Route::prefix('activities/{id}/generated-links')->group(function ($id) {
        Route::get('/', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'index']);
        Route::get('/groups', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'getGroups']);
        Route::get('/statistics', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'statistics']);
        Route::get('/export', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'export']);
        
        Route::middleware(['role:super-admin,admin,program-admin'])->group(function () {
            Route::post('/', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'generate']);
            Route::post('/email', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'emailLinks']);
            Route::post('/groups', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'createGroup']);
            Route::patch('/{linkId}', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'updateStatus']);
            Route::delete('/{linkId}', [App\Http\Controllers\Api\GeneratedEventLinkController::class, 'destroy']);
        });
    });
    
    // Admin and Program roles can manage activities
    Route::middleware(['role:super-admin,admin,group-head,program-admin,program-manager'])->group(function () {
        Route::post('/activities', [ActivityController::class, 'store']);
        Route::put('/activities/{id}', [ActivityController::class, 'update']);
        Route::patch('/activities/{id}', [ActivityController::class, 'update']);
        Route::patch('/activities/{id}/toggle-reminders', [ActivityController::class, 'toggleParticipantReminders']);
        
        // Activity participant management
        Route::get('/activities/{id}/participants/available', [ActivityController::class, 'getAvailableParticipants']);
        Route::post('/activities/{id}/participants/new', [ActivityController::class, 'addNewParticipant']);
        Route::post('/activities/{id}/participants/existing', [ActivityController::class, 'addExistingParticipants']);
        Route::post('/activities/{id}/participants/import', [ActivityController::class, 'importParticipants']);
        Route::patch('/activities/{id}/participants/{participantId}', [ActivityController::class, 'updateActivityParticipant']);
        Route::delete('/activities/{id}/participants/{participantId}', [ActivityController::class, 'removeParticipant']);
        Route::patch('/participants/{participantId}/toggle-status', [ActivityController::class, 'toggleParticipantStatus']);
        
        // Landing page configuration
        Route::get('/activities/{id}/landing-config', [ActivityController::class, 'getLandingConfig']);
        Route::post('/activities/{id}/landing-config', [ActivityController::class, 'saveLandingConfig']);
        
        // Notification statistics
        Route::get('/activities/{id}/notification-stats', [ActivityController::class, 'getNotificationStats']);
        
        // Export routes
        Route::get('/activities/{id}/export', [App\Http\Controllers\Api\ExportController::class, 'exportActivityResults']);
    });
    
    // Activity delete - program-manager CANNOT delete (only super-admin, admin, group-head, program-admin)
    Route::middleware(['role:super-admin,admin,group-head,program-admin'])->group(function () {
        Route::delete('/activities/{id}', [ActivityController::class, 'destroy']);
    });
    
    // Questionnaire assignment - program-manager can still do these
    Route::middleware(['role:super-admin,admin,group-head,program-admin,program-manager'])->group(function () {
        Route::post('/activities/{id}/assign-questionnaire', [ActivityController::class, 'assignQuestionnaire']);
        Route::delete('/activities/{id}/unassign-questionnaire', [ActivityController::class, 'unassignQuestionnaire']);
        
        // Status management
        Route::post('/activities/{id}/archive', [ActivityController::class, 'archive']);
        Route::post('/activities/{id}/activate', [ActivityController::class, 'activate']);
        Route::post('/activities/{id}/restore', [ActivityController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/activities/{id}/force', [ActivityController::class, 'forceDestroy']);
        
        // System Settings
        Route::get('/system-settings', [App\Http\Controllers\Api\SystemSettingsController::class, 'index']);
        Route::post('/system-settings', [App\Http\Controllers\Api\SystemSettingsController::class, 'store']);
        Route::post('/system-settings/test-email', [App\Http\Controllers\Api\SystemSettingsController::class, 'testEmail']);
    });
});

// Response Submission Routes
Route::middleware('auth:sanctum')->group(function () {
    // Start/resume responses
    Route::post('/activities/{activity}/responses/start', [App\Http\Controllers\Api\ResponseController::class, 'start']);
    Route::post('/activities/{activity}/responses/resume', [App\Http\Controllers\Api\ResponseController::class, 'resume']);
    
    // Save and submit responses
    Route::post('/responses/{response}/save', [App\Http\Controllers\Api\ResponseController::class, 'saveProgress']);
    Route::post('/responses/{response}/submit', [App\Http\Controllers\Api\ResponseController::class, 'submit']);
    
    // Get progress
    Route::get('/responses/{response}/progress', [App\Http\Controllers\Api\ResponseController::class, 'getProgress']);
    
    // Admin/Moderator routes
    Route::middleware('role:super-admin,admin,group-head,program-admin,program-manager,program-moderator')->group(function () {
        Route::get('/activities/{activity}/responses', [App\Http\Controllers\Api\ResponseController::class, 'index']);
        Route::get('/activities/{activity}/responses/statistics', [App\Http\Controllers\Api\ResponseController::class, 'statistics']);
        Route::delete('/activities/{activity}/responses/{response}', [App\Http\Controllers\Api\ResponseController::class, 'destroy']);
    });
});

// Report Routes
Route::middleware(['auth:sanctum'])->prefix('reports')->group(function () {
    // Activity-level reports
    Route::get('/participation/{activityId}', [App\Http\Controllers\Api\ReportController::class, 'participationMetrics']);
    Route::get('/completion/{activityId}', [App\Http\Controllers\Api\ReportController::class, 'completionMetrics']);
    Route::get('/responses/{activityId}', [App\Http\Controllers\Api\ReportController::class, 'drillDownResponses']);
    Route::get('/question/{activityId}/{questionId}', [App\Http\Controllers\Api\ReportController::class, 'questionAnalytics']);
    
    // Program-level reports
    Route::get('/program/{programId}', [App\Http\Controllers\Api\ReportController::class, 'programOverview']);
});

// AI-Based Report Builder Routes
Route::middleware(['auth:sanctum'])->prefix('report-builder')->group(function () {
    // Report Templates
    Route::get('/templates', [App\Http\Controllers\Api\ReportBuilderController::class, 'index']);
    Route::get('/templates/{id}', [App\Http\Controllers\Api\ReportBuilderController::class, 'show']);
    Route::post('/templates', [App\Http\Controllers\Api\ReportBuilderController::class, 'store']);
    Route::put('/templates/{id}', [App\Http\Controllers\Api\ReportBuilderController::class, 'update']);
    Route::delete('/templates/{id}', [App\Http\Controllers\Api\ReportBuilderController::class, 'destroy']);
    Route::post('/templates/{id}/clone', [App\Http\Controllers\Api\ReportBuilderController::class, 'clone']);
    
    // Default Templates
    Route::get('/default-templates', [App\Http\Controllers\Api\ReportBuilderController::class, 'getDefaultTemplates']);
    
    // Generate Reports
    Route::post('/templates/{templateId}/generate', [App\Http\Controllers\Api\ReportBuilderController::class, 'generate']);
    Route::post('/analytics', [App\Http\Controllers\Api\ReportBuilderController::class, 'getAnalytics']);
    Route::post('/question-analytics', [App\Http\Controllers\Api\ReportBuilderController::class, 'getQuestionAnalytics']);
    
    // Report Snapshots
    Route::post('/snapshots', [App\Http\Controllers\Api\ReportBuilderController::class, 'createSnapshot']);
    Route::get('/snapshots', [App\Http\Controllers\Api\ReportBuilderController::class, 'getSnapshots']);
    
    // Export endpoints
    Route::get('/export/{activityId}/{format}', [App\Http\Controllers\Api\ReportController::class, 'exportReport'])->where('format', 'csv|excel|pdf');
    Route::get('/export/program/{programId}', [App\Http\Controllers\Api\ReportController::class, 'exportProgramReport']);
});

// AI Report Agent Routes (Natural Language Query Interface)
Route::middleware(['auth:sanctum'])->prefix('ai-agent')->group(function () {
    // Main AI query endpoint
    Route::post('/ask', [App\Http\Controllers\Api\AIReportAgentController::class, 'ask']);
    
    // Conversation history
    Route::get('/history', [App\Http\Controllers\Api\AIReportAgentController::class, 'getHistory']);
    
    // User feedback
    Route::post('/feedback', [App\Http\Controllers\Api\AIReportAgentController::class, 'feedback']);
    
    // Popular/suggested queries
    Route::get('/popular-queries', [App\Http\Controllers\Api\AIReportAgentController::class, 'popularQueries']);
});

// Public Activity Routes (no authentication required)
Route::prefix('public')->group(function () {
    Route::get('activities/{id}', [App\Http\Controllers\Api\PublicActivityController::class, 'show']);
    Route::post('activities/{id}/register', [App\Http\Controllers\Api\PublicActivityController::class, 'registerParticipant']);
    Route::post('activities/{id}/save-progress', [App\Http\Controllers\Api\PublicActivityController::class, 'saveProgress']);
    Route::get('activities/{id}/load-progress/{participantId}', [App\Http\Controllers\Api\PublicActivityController::class, 'loadProgress']);
    Route::post('activities/{id}/submit', [App\Http\Controllers\Api\PublicActivityController::class, 'submitResponse']);
    Route::get('questionnaires/{id}', [App\Http\Controllers\Api\PublicQuestionnaireController::class, 'show']);
    Route::post('activities/validate-link-token', [App\Http\Controllers\Api\ActivityController::class, 'validateLinkToken']);
    Route::get('questionnaire/{id}', [App\Http\Controllers\Api\PublicQuestionnaireController::class, 'show']); // Singular alias for compatibility
    
    // Temporary submissions for post-submission registration flow
    Route::post('activities/{id}/temporary-submissions', [App\Http\Controllers\Api\TemporarySubmissionController::class, 'store']);
    Route::get('activities/{id}/temporary-submissions/{sessionToken}', [App\Http\Controllers\Api\TemporarySubmissionController::class, 'show']);
    Route::post('activities/{id}/temporary-submissions/link', [App\Http\Controllers\Api\TemporarySubmissionController::class, 'link']);
    
    // Token-based access routes
    Route::get('access-tokens/{token}/validate', [App\Http\Controllers\Api\PublicActivityController::class, 'validateAccessToken']);
    Route::post('access-tokens/{token}/mark-used', [App\Http\Controllers\Api\PublicActivityController::class, 'markTokenAsUsed']);
});

// Email Notification routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/notifications/send', [App\Http\Controllers\Api\NotificationController::class, 'send']);
    Route::post('/notifications/send-bulk', [App\Http\Controllers\Api\NotificationController::class, 'sendBulk']);
    
    // New SendGrid notification routes
    Route::post('/notifications/send-emails', [App\Http\Controllers\Api\NotificationController::class, 'sendNotifications']);
    
    // OLD: Aggregated reports (kept for backward compatibility)
    Route::get('/notifications/reports', [App\Http\Controllers\Api\NotificationController::class, 'getAllReports']);
    Route::get('/notifications/reports/{activityId}', [App\Http\Controllers\Api\NotificationController::class, 'getReports']);
    
    // NEW: Detailed notification logs with participant info
    Route::get('/notifications/logs', [App\Http\Controllers\Api\NotificationController::class, 'getNotificationLogs']);
    Route::get('/notifications/logs/{activityId}', [App\Http\Controllers\Api\NotificationController::class, 'getNotificationLogsForActivity']);
    
    Route::get('/notifications/analytics', [App\Http\Controllers\Api\NotificationController::class, 'getAnalytics']);
    Route::get('/notifications/test', [App\Http\Controllers\Api\NotificationController::class, 'testEndpoint']);
    
    // Email-Embedded Survey routes
    Route::post('/email-embedded-survey/send', [App\Http\Controllers\Api\EmailEmbeddedSurveyController::class, 'send']);
    Route::get('/email-embedded-survey/questions/{activityId}', [App\Http\Controllers\Api\EmailEmbeddedSurveyController::class, 'getEmbeddableQuestions']);
});

// User Notifications (In-App) Routes
Route::middleware('auth:sanctum')->prefix('notifications')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\UserNotificationController::class, 'index']);
    Route::get('/unread-count', [App\Http\Controllers\Api\UserNotificationController::class, 'unreadCount']);
    Route::post('/{id}/read', [App\Http\Controllers\Api\UserNotificationController::class, 'markAsRead']);
    Route::post('/mark-all-read', [App\Http\Controllers\Api\UserNotificationController::class, 'markAllAsRead']);
    Route::post('/clear-all', [App\Http\Controllers\Api\UserNotificationController::class, 'clearAll']);
    Route::delete('/{id}', [App\Http\Controllers\Api\UserNotificationController::class, 'destroy']);
    
    // Internal/System routes for creating notifications
    Route::post('/create', [App\Http\Controllers\Api\UserNotificationController::class, 'store']);
    Route::post('/bulk-create', [App\Http\Controllers\Api\UserNotificationController::class, 'bulkStore']);
});

// Notification Template Management Routes
Route::middleware(['auth:sanctum'])->prefix('activities/{activityId}/notification-templates')->group(function () {
    // List all templates for an activity
    Route::get('/', [App\Http\Controllers\Api\NotificationTemplateController::class, 'index']);
    
    // Get template by notification type
    Route::get('/type/{type}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'getByType']);
    
    // Create or update template
    Route::post('/', [App\Http\Controllers\Api\NotificationTemplateController::class, 'store']);
    
    // Get specific template
    Route::get('/{templateId}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'show']);
    
    // Update specific template
    Route::put('/{templateId}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'update']);
    
    // Delete template (revert to default)
    Route::delete('/{templateId}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'destroy']);
    
    // Reset template to default
    Route::post('/reset/{type}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'resetToDefault']);
    
    // Preview template with sample data
    Route::post('/preview', [App\Http\Controllers\Api\NotificationTemplateController::class, 'preview']);
    
    // Bulk create default templates
    Route::post('/create-defaults', [App\Http\Controllers\Api\NotificationTemplateController::class, 'createDefaults']);
});

// Notification template utilities
Route::middleware(['auth:sanctum'])->prefix('notification-templates')->group(function () {
    Route::get('/types', [App\Http\Controllers\Api\NotificationTemplateController::class, 'getNotificationTypes']);
    Route::get('/placeholders', [App\Http\Controllers\Api\NotificationTemplateController::class, 'getPlaceholders']);
});

// Profile and Account Management Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/profile/update', [ProfileController::class, 'update']);
    Route::post('/account/change-password', [ProfileController::class, 'changePassword']);
    Route::put('/account/preferences', [ProfileController::class, 'updatePreferences']);
});

// App Settings Routes
Route::prefix('app-settings')->group(function () {
    // Public endpoint for getting app settings
    Route::get('/', [\App\Http\Controllers\Api\AppSettingsController::class, 'get']);
    
    // Protected endpoint for updating app settings - accessible to authenticated users
    Route::put('/', [\App\Http\Controllers\Api\AppSettingsController::class, 'update'])->middleware('auth:sanctum');
});

// CMS Content Routes
Route::prefix('cms')->group(function () {
    // Public endpoints (no auth required for reading CMS content)
    Route::get('/content', [App\Http\Controllers\Api\CmsContentController::class, 'index']);
    Route::get('/content/{pageKey}', [App\Http\Controllers\Api\CmsContentController::class, 'show']);
    
    // Admin only endpoints (Super Admin and Admin)
    Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(function () {
        Route::put('/content/{pageKey}', [App\Http\Controllers\Api\CmsContentController::class, 'update']);
        Route::post('/content/bulk', [App\Http\Controllers\Api\CmsContentController::class, 'bulkUpdate']);
    });
});

// Theme Settings Routes
Route::prefix('theme')->group(function () {
    // Public endpoints (no auth required for reading theme settings)
    Route::get('/settings', [App\Http\Controllers\Api\ThemeSettingController::class, 'index']);
    Route::get('/settings/{key}', [App\Http\Controllers\Api\ThemeSettingController::class, 'show']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::put('/settings/{key}', [App\Http\Controllers\Api\ThemeSettingController::class, 'update']);
        Route::post('/settings/bulk', [App\Http\Controllers\Api\ThemeSettingController::class, 'bulkUpdate']);
        Route::post('/upload', [App\Http\Controllers\Api\ThemeSettingController::class, 'uploadImage']);
        Route::delete('/settings/{key}', [App\Http\Controllers\Api\ThemeSettingController::class, 'destroy']);
    });
});

// Landing Pages Routes
Route::prefix('landing-pages')->group(function () {
    // Public endpoints (no auth required for viewing landing pages)
    Route::get('/', [App\Http\Controllers\Api\LandingPageController::class, 'index']);
    Route::get('/{slug}', [App\Http\Controllers\Api\LandingPageController::class, 'show']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::post('/', [App\Http\Controllers\Api\LandingPageController::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\Api\LandingPageController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\Api\LandingPageController::class, 'destroy']);
        
        // Section management
        Route::post('/{pageId}/sections', [App\Http\Controllers\Api\LandingPageController::class, 'addSection']);
        Route::put('/{pageId}/sections/{sectionId}', [App\Http\Controllers\Api\LandingPageController::class, 'updateSection']);
        Route::delete('/{pageId}/sections/{sectionId}', [App\Http\Controllers\Api\LandingPageController::class, 'deleteSection']);
    });
});

// Demo Request Routes
Route::prefix('demo-requests')->group(function () {
    // Public endpoint (no auth required for submitting demo request)
    Route::post('/', [App\Http\Controllers\Api\DemoRequestController::class, 'store']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\DemoRequestController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\DemoRequestController::class, 'show']);
        Route::patch('/{id}/status', [App\Http\Controllers\Api\DemoRequestController::class, 'updateStatus']);
        Route::delete('/{id}', [App\Http\Controllers\Api\DemoRequestController::class, 'destroy']);
    });
});

// Contact Sales Routes
Route::prefix('contact-sales')->group(function () {
    // Public endpoint (no auth required for submitting contact sales request)
    Route::post('/', [App\Http\Controllers\Api\ContactSalesController::class, 'store']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\ContactSalesController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\ContactSalesController::class, 'show']);
        Route::patch('/{id}/status', [App\Http\Controllers\Api\ContactSalesController::class, 'updateStatus']);
        Route::delete('/{id}', [App\Http\Controllers\Api\ContactSalesController::class, 'destroy']);
    });
});

// Contact Us Routes
Route::prefix('contact-requests')->group(function () {
    // Public endpoint (no auth required for submitting contact request)
    Route::post('/', [App\Http\Controllers\Api\ContactRequestController::class, 'store']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\ContactRequestController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\ContactRequestController::class, 'show']);
        Route::patch('/{id}/status', [App\Http\Controllers\Api\ContactRequestController::class, 'updateStatus']);
        Route::delete('/{id}', [App\Http\Controllers\Api\ContactRequestController::class, 'destroy']);
    });
});

// Event Contact Messages Routes
Route::prefix('event-contact-messages')->group(function () {
    // Public endpoint (no auth required for submitting contact message during event)
    Route::post('/', [App\Http\Controllers\Api\EventContactMessageController::class, 'store']);
    
    // Admin only endpoints (Admin & Super Admin)
    Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\EventContactMessageController::class, 'index']);
        Route::get('/unread-count', [App\Http\Controllers\Api\EventContactMessageController::class, 'unreadCount']);
        Route::get('/{id}', [App\Http\Controllers\Api\EventContactMessageController::class, 'show']);
        Route::patch('/{id}/read', [App\Http\Controllers\Api\EventContactMessageController::class, 'markAsRead']);
        Route::patch('/{id}/responded', [App\Http\Controllers\Api\EventContactMessageController::class, 'markAsResponded']);
        Route::delete('/{id}', [App\Http\Controllers\Api\EventContactMessageController::class, 'destroy']);
    });
});

// =====================================================
// HIERARCHY-BASED EVALUATION EVENT ROUTES
// =====================================================

// Public Evaluation Taking Routes (Token-based access, no auth required)
Route::prefix('evaluation/take')->group(function () {
    Route::get('/{token}', [App\Http\Controllers\Api\EvaluationTakeController::class, 'getByToken']);
    Route::post('/{token}/submit', [App\Http\Controllers\Api\EvaluationTakeController::class, 'submit']);
});

// Protected Evaluation Routes
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Evaluation Events CRUD (Admin and Program Admin can manage)
    Route::prefix('evaluation-events')->group(function () {
        // Read operations (all authenticated users including system-user can list their accessible events)
        Route::get('/', [App\Http\Controllers\Api\EvaluationEventController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\EvaluationEventController::class, 'show']);
        
        // Admin-only operations (create, update, delete) - includes system-user
        Route::middleware(['role:super-admin,admin,group-head,program-admin,system-user'])->group(function () {
            Route::post('/', [App\Http\Controllers\Api\EvaluationEventController::class, 'store']);
            Route::put('/{id}', [App\Http\Controllers\Api\EvaluationEventController::class, 'update']);
            Route::patch('/{id}', [App\Http\Controllers\Api\EvaluationEventController::class, 'update']);
            Route::delete('/{id}', [App\Http\Controllers\Api\EvaluationEventController::class, 'destroy']);
            
            // Status management
            Route::post('/{id}/activate', [App\Http\Controllers\Api\EvaluationEventController::class, 'activate']);
            Route::post('/{id}/pause', [App\Http\Controllers\Api\EvaluationEventController::class, 'pause']);
            Route::post('/{id}/complete', [App\Http\Controllers\Api\EvaluationEventController::class, 'complete']);
            
            // Auto-generate assignments from hierarchy
            Route::post('/{id}/generate-assignments', [App\Http\Controllers\Api\EvaluationEventController::class, 'generateAssignments']);
        });
        
        // Manager operations (trigger evaluation for their direct reports)
        Route::get('/{id}/available-evaluatees', [App\Http\Controllers\Api\EvaluationEventController::class, 'getAvailableEvaluatees']);
        Route::post('/{id}/trigger', [App\Http\Controllers\Api\EvaluationEventController::class, 'triggerEvaluation']);
        Route::get('/{id}/my-assignments', [App\Http\Controllers\Api\EvaluationEventController::class, 'getMyAssignments']);
        Route::post('/{id}/assignments/{assignmentId}/remind', [App\Http\Controllers\Api\EvaluationEventController::class, 'sendReminder']);
        
        // Reports (role-based access controlled in controller)
        Route::prefix('{id}/reports')->group(function () {
            Route::get('/summary', [App\Http\Controllers\Api\EvaluationReportController::class, 'getSummary']);
            Route::get('/by-evaluatee', [App\Http\Controllers\Api\EvaluationReportController::class, 'getByEvaluatee']);
            Route::get('/completion-status', [App\Http\Controllers\Api\EvaluationReportController::class, 'getCompletionStatus']);
            Route::get('/my-team', [App\Http\Controllers\Api\EvaluationReportController::class, 'getMyTeamReport']);
            Route::get('/export', [App\Http\Controllers\Api\EvaluationReportController::class, 'exportReport']);
        });
    });
    
    // Evaluation Custom Questionnaires (persistent storage for evaluation form selection)
    Route::prefix('evaluation-custom-questionnaires')->group(function () {
        Route::get('/', [App\Http\Controllers\EvaluationCustomQuestionnaireController::class, 'index']);
        Route::post('/', [App\Http\Controllers\EvaluationCustomQuestionnaireController::class, 'store']);
        Route::delete('/{questionnaireId}', [App\Http\Controllers\EvaluationCustomQuestionnaireController::class, 'destroy']);
    });
    
    // My Evaluations (for logged-in staff to see/complete their pending evaluations)
    Route::prefix('my-evaluations')->group(function () {
        Route::get('/pending', [App\Http\Controllers\Api\EvaluationTakeController::class, 'getMyPendingEvaluations']);
        Route::get('/completed', [App\Http\Controllers\Api\EvaluationTakeController::class, 'getMyCompletedEvaluations']);
    });
    
    // System Settings (Super Admin only)
    Route::middleware(['role:super-admin'])->prefix('system-settings')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\SystemSettingsController::class, 'index']);
        Route::post('/', [App\Http\Controllers\Api\SystemSettingsController::class, 'store']);
        Route::post('/test-email', [App\Http\Controllers\Api\SystemSettingsController::class, 'testEmail']);
        Route::get('/s3', [App\Http\Controllers\Api\SystemSettingsController::class, 'getS3Config']);
        Route::post('/s3', [App\Http\Controllers\Api\SystemSettingsController::class, 'saveS3Config']);
        Route::post('/s3/test', [App\Http\Controllers\Api\SystemSettingsController::class, 'testS3Connection']);
    });
    
    // Data Safety Settings (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('data-safety')->group(function () {
        Route::get('/settings', [App\Http\Controllers\Api\DataSafetyController::class, 'getSettings']);
        Route::post('/settings', [App\Http\Controllers\Api\DataSafetyController::class, 'updateSettings']);
        Route::get('/health', [App\Http\Controllers\Api\DataSafetyController::class, 'getHealthCheck']);
        Route::get('/response-audit/stats', [App\Http\Controllers\Api\DataSafetyController::class, 'getResponseAuditStats']);
        Route::get('/notifications/stats', [App\Http\Controllers\Api\DataSafetyController::class, 'getNotificationStats']);
        Route::get('/migration-stats', [App\Http\Controllers\Api\DataSafetyController::class, 'migrationStats']);
        Route::get('/backups', [App\Http\Controllers\Api\DataSafetyController::class, 'getBackups']);
        Route::post('/migrate', [App\Http\Controllers\Api\DataSafetyController::class, 'migrateJsonToBackups']);
        
        // Database Maintenance Routes
        Route::post('/flush-deleted-data', [App\Http\Controllers\Api\DataSafetyController::class, 'flushDeletedData']);
        Route::post('/backup-database', [App\Http\Controllers\Api\DataSafetyController::class, 'backupDatabase']);
        Route::get('/deleted-data-stats', [App\Http\Controllers\Api\DataSafetyController::class, 'getDeletedDataStats']);
    });
    
    // System Design Document (SDD) & Engineering Governance (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('system-design')->group(function () {
        // SDD Generation & Management
        Route::get('/data', [App\Http\Controllers\Api\SystemDesignController::class, 'getSDDData']);
        Route::post('/generate-pdf', [App\Http\Controllers\Api\SystemDesignController::class, 'generatePDF']);
        Route::get('/download/{filename}', [App\Http\Controllers\Api\SystemDesignController::class, 'downloadPDF']);
        
        // Critical Features Management
        Route::get('/critical-features', [App\Http\Controllers\Api\SystemDesignController::class, 'getCriticalFeatures']);
        Route::post('/critical-features', [App\Http\Controllers\Api\SystemDesignController::class, 'updateCriticalFeatures']);
        
        // Pre-Deployment Testing
        Route::post('/run-tests', [App\Http\Controllers\Api\SystemDesignController::class, 'runPreDeploymentTests']);
        
        // Schema Validation
        Route::post('/validate-schema', [App\Http\Controllers\Api\SystemDesignController::class, 'validateSchema']);
        
        // Rollback Procedures
        Route::get('/rollback-procedures', [App\Http\Controllers\Api\SystemDesignController::class, 'getRollbackProcedures']);
    });
});

// ============================================
// HIERARCHY & REPORTING MANAGEMENT ROUTES
// ============================================

// Hierarchy Routes - Admin and Program Admin access (with audit logging)
Route::middleware(['auth:sanctum', 'role:super-admin,admin,group-head,program-admin', 'log.manager.actions'])->prefix('hierarchy')->group(function () {
    // Roles
    Route::get('/roles', [HierarchyController::class, 'getRoles']);
    
    // Manager Assignment
    Route::post('/assign-manager', [HierarchyController::class, 'assignManager']);
    Route::delete('/remove-manager', [HierarchyController::class, 'removeManager']);
    Route::post('/validate-assignment', [HierarchyController::class, 'validateAssignment']);
    
    // Hierarchy Tree & User Info
    Route::get('/programs/{programId}/tree', [HierarchyController::class, 'getHierarchyTree']);
    Route::get('/programs/{programId}/available-managers', [HierarchyController::class, 'getAvailableManagers']);
    Route::get('/users/{userId}/info', [HierarchyController::class, 'getUserHierarchy']);
    
    // Dashboard Access Management
    Route::get('/managers/{managerId}/dashboard-access', [HierarchyController::class, 'getDashboardAccess']);
    Route::put('/managers/{managerId}/dashboard-access', [HierarchyController::class, 'updateDashboardAccess']);
    
    // Change Logs (Audit Trail)
    Route::get('/change-logs', [HierarchyController::class, 'getChangeLogs']);
});

// Manager Dashboard Routes - Managers only (with data scoping and audit logging)
Route::middleware(['auth:sanctum', 'log.manager.actions', 'validate.data.scope'])->prefix('hierarchy/managers')->group(function () {
    Route::get('/{managerId}/team', [HierarchyController::class, 'getManagerTeam']);
    Route::get('/{managerId}/analytics', [HierarchyController::class, 'getTeamAnalytics']);
    Route::post('/{managerId}/send-notification', [HierarchyController::class, 'sendTeamNotification'])
        ->middleware('rate.limit.notifications'); // Rate limit notification sending
});

// Team Member Details - Managers only (with data scoping and audit logging)
Route::middleware(['auth:sanctum', 'log.manager.actions', 'validate.data.scope'])->prefix('hierarchy')->group(function () {
    Route::get('/team-members/{memberId}', [HierarchyController::class, 'getTeamMemberDetails']);
});

// ==========================================
// EVALUATION MODULE ROUTES
// ==========================================

// Public evaluation access (token-based, NO AUTH REQUIRED)
Route::prefix('evaluation')->group(function () {
    Route::get('/triggered/{id}', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'show']);
    Route::post('/triggered/{id}/submit', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'submit']);
});

Route::middleware(['auth:sanctum'])->prefix('evaluation')->group(function () {
    
    // Trigger Evaluations (Admin + Evaluation Admin)
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/trigger', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'trigger']);
        Route::get('/triggered', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'index']);
        Route::put('/triggered/{id}', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'update']);
        Route::delete('/triggered/{id}', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'destroy']);
        Route::patch('/triggered/{id}/toggle-active', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'toggleActive']);
        Route::post('/triggered/{id}/resend', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'resend']);
    });
    
    // Evaluation Reports (Admin + Evaluation Admin + Managers/Staff with subordinates)
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin,moderator,evaluation_staff'])->group(function () {
        Route::get('/reports', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'reports']);
        Route::get('/reports/summary', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'reportsSummary']);
        Route::get('/reports/evaluators', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'evaluatorsList']);
        Route::get('/reports/staff', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'evaluatedStaff']);
        Route::get('/reports/staff/{staffId}', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'staffDetail']);
        Route::get('/reports/export', [App\Http\Controllers\Api\EvaluationTriggerController::class, 'exportReports']);
        
        // NEW: Advanced Analytics Endpoints (Date-range based reporting)
        Route::get('/analytics/summary', [App\Http\Controllers\Api\EvaluationAnalyticsController::class, 'summary']);
        Route::get('/analytics/evaluator-performance', [App\Http\Controllers\Api\EvaluationAnalyticsController::class, 'evaluatorPerformance']);
        Route::get('/analytics/subordinate-performance', [App\Http\Controllers\Api\EvaluationAnalyticsController::class, 'subordinatePerformance']);
        Route::get('/analytics/competency-analysis', [App\Http\Controllers\Api\EvaluationAnalyticsController::class, 'competencyAnalysis']);
        Route::get('/analytics/department-comparison', [App\Http\Controllers\Api\EvaluationAnalyticsController::class, 'departmentComparison']);
        Route::get('/analytics/trends', [App\Http\Controllers\Api\EvaluationAnalyticsController::class, 'trends']);
    });
    
    // Evaluation Notification Configuration (Admin + Evaluation Admin)
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->prefix('notifications')->group(function () {
        Route::get('/config', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'getConfig']);
        Route::put('/config', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'updateConfig']);
        Route::get('/logs', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'getNotificationLogs']);
        Route::get('/stats', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'getStats']);
    });
    
    // Bell Notifications (All authenticated users)
    Route::prefix('bell-notifications')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'getBellNotifications']);
        Route::patch('/{id}/read', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'markNotificationAsRead']);
        Route::post('/mark-all-read', [App\Http\Controllers\Api\EvaluationNotificationConfigController::class, 'markAllAsRead']);
    });
    
    // Bulk Import (Evaluation Admin and Super Admin only)
    Route::middleware(['role:super-admin,evaluation-admin'])->group(function () {
        Route::post('/bulk-import', [App\Http\Controllers\Api\EvaluationBulkImportController::class, 'import']);
        Route::get('/bulk-import/sample', [App\Http\Controllers\Api\EvaluationBulkImportController::class, 'downloadSample']);
    });
    
    // Evaluation Departments (Admin-only for create/update/delete)
    Route::get('/departments', [App\Http\Controllers\Api\EvaluationDepartmentController::class, 'index']);
    Route::get('/departments/{id}', [App\Http\Controllers\Api\EvaluationDepartmentController::class, 'show']);
    
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/departments', [App\Http\Controllers\Api\EvaluationDepartmentController::class, 'store']);
        Route::put('/departments/{id}', [App\Http\Controllers\Api\EvaluationDepartmentController::class, 'update']);
        Route::delete('/departments/{id}', [App\Http\Controllers\Api\EvaluationDepartmentController::class, 'destroy']);
    });
    
    // Evaluation Roles (Admin-only for create/update/delete)
    Route::get('/roles', [App\Http\Controllers\Api\EvaluationRoleController::class, 'index']);
    Route::get('/roles/{id}', [App\Http\Controllers\Api\EvaluationRoleController::class, 'show']);
    
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/roles', [App\Http\Controllers\Api\EvaluationRoleController::class, 'store']);
        Route::put('/roles/{id}', [App\Http\Controllers\Api\EvaluationRoleController::class, 'update']);
        Route::delete('/roles/{id}', [App\Http\Controllers\Api\EvaluationRoleController::class, 'destroy']);
    });
    
    // Evaluation Staff (Admin-only for create/update/delete)
    Route::get('/staff', [App\Http\Controllers\Api\EvaluationStaffController::class, 'index']);
    Route::get('/staff/{id}', [App\Http\Controllers\Api\EvaluationStaffController::class, 'show']);
    
    // Staff Dashboard - My Performance & Team Performance
    Route::get('/my-performance', [App\Http\Controllers\Api\EvaluationStaffController::class, 'myPerformance']);
    Route::get('/team-performance', [App\Http\Controllers\Api\EvaluationStaffController::class, 'teamPerformance']);
    
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/staff', [App\Http\Controllers\Api\EvaluationStaffController::class, 'store']);
        Route::put('/staff/{id}', [App\Http\Controllers\Api\EvaluationStaffController::class, 'update']);
        Route::delete('/staff/{id}', [App\Http\Controllers\Api\EvaluationStaffController::class, 'destroy']);
    });
    
    // Evaluation Settings
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::get('/settings/new-joinee-questionnaire', [App\Http\Controllers\Api\EvaluationStaffController::class, 'getNewJoineeQuestionnaire']);
        Route::post('/settings/new-joinee-questionnaire', [App\Http\Controllers\Api\EvaluationStaffController::class, 'saveNewJoineeQuestionnaire']);
    });
    
    // Evaluation Hierarchy (Admin-only for create/update/delete)
    Route::get('/hierarchy', [App\Http\Controllers\Api\EvaluationHierarchyController::class, 'index']);
    Route::get('/hierarchy/tree', [App\Http\Controllers\Api\EvaluationHierarchyController::class, 'getTree']);
    
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/hierarchy', [App\Http\Controllers\Api\EvaluationHierarchyController::class, 'store']);
        Route::put('/hierarchy/{id}', [App\Http\Controllers\Api\EvaluationHierarchyController::class, 'update']);
        Route::delete('/hierarchy/{id}', [App\Http\Controllers\Api\EvaluationHierarchyController::class, 'destroy']);
    });
    
    // Evaluation Assignments (Admin-only for create/update/delete)
    Route::get('/assignments', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'index']);
    Route::get('/assignments/{id}', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'show']);
    
    // My Assignments - For current user to see their evaluations to complete
    Route::get('/my-assignments', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'myAssignments']);
    
    // Taking Evaluations
    Route::get('/assignments/{id}/take', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'takeEvaluation']);
    Route::post('/assignments/{id}/save-progress', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'saveProgress']);
    Route::post('/assignments/{id}/submit', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'submitEvaluation']);
    
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/assignments', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'store']);
        Route::post('/assignments/auto-assign', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'autoAssign']);
        Route::put('/assignments/{id}', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'update']);
        Route::delete('/assignments/{id}', [App\Http\Controllers\Api\EvaluationAssignmentController::class, 'destroy']);
    });
    
    // Evaluation Results (Admin-only for calculate/publish/delete)
    Route::get('/results', [App\Http\Controllers\Api\EvaluationResultsController::class, 'index']);
    Route::get('/results/{id}', [App\Http\Controllers\Api\EvaluationResultsController::class, 'show']);
    
    Route::middleware(['role:super-admin,admin,program-admin,evaluation-admin'])->group(function () {
        Route::post('/results/calculate', [App\Http\Controllers\Api\EvaluationResultsController::class, 'calculate']);
        Route::post('/results/{id}/publish', [App\Http\Controllers\Api\EvaluationResultsController::class, 'publish']);
        Route::delete('/results/{id}', [App\Http\Controllers\Api\EvaluationResultsController::class, 'destroy']);
    });
});
