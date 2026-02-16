<?php
require __DIR__ . "/vendor/autoload.php";
$app = require_once __DIR__ . "/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\ActivityApprovalRequest;
use App\Services\EmailService;

$approvalRequest = ActivityApprovalRequest::find("a117acdc-e210-4165-84fc-da6f2ecb6eb2");
echo "Activity: " . $approvalRequest->name . "\n";
echo "Manager Review Status: " . $approvalRequest->manager_review_status . "\n";

$admin = User::where("role", "super-admin")->first();
$recipientEmail = $admin->communication_email ?: $admin->email;
echo "Sending to: " . $recipientEmail . "\n";

$emailService = app(EmailService::class);

$subject = "Manager Approved: Activity Ready for Final Review - " . $approvalRequest->name;
$htmlContent = "<html><body><h2>Manager Review Completed</h2><p>Activity: " . $approvalRequest->name . "</p><p>Type: " . $approvalRequest->type . "</p><p>Manager: " . $approvalRequest->manager_email . "</p><p>Status: " . $approvalRequest->manager_review_status . "</p><p>Please review and take action.</p></body></html>";

try {
    $emailService->send(
        $recipientEmail,
        $subject,
        $htmlContent,
        ["event" => "manager_review_completed_resend", "approval_request_id" => $approvalRequest->id]
    );
    echo "Email sent successfully!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
