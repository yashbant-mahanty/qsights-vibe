<?php
require_once 'vendor/autoload.php';

use SendGrid\Mail\Mail;

$sendgrid = new \SendGrid('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');

$email = new Mail();
$email->setFrom('yashbant.mahanty@bioquestglobal.com', 'QSights System');
$email->addTo('yashbant.mahanty@bioquestglobal.com', 'Super Admin');
$email->setSubject('QSights Production SendGrid Test - ' . date('Y-m-d H:i:s'));

$htmlContent = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #2563eb;">SendGrid Production Test</h2>
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
        <h3 style="color: #059669;">✅ Production Email Test Successful</h3>
        <p>This email was sent from the production server to verify SendGrid integration is working correctly.</p>
        <p><strong>Server Details:</strong></p>
        <ul>
            <li>Environment: Production</li>
            <li>Sender: yashbant.mahanty@bioquestglobal.com</li>
            <li>Timestamp: ' . date('Y-m-d H:i:s T') . '</li>
            <li>API Status: Active</li>
        </ul>
    </div>
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
            This is an automated test from QSights Production Server<br>
            Test completed successfully on ' . date('Y-m-d H:i:s') . '
        </p>
    </div>
</div>';

$email->addContent('text/html', $htmlContent);

try {
    $response = $sendgrid->send($email);
    
    echo "SUCCESS!\n";
    echo "Status Code: " . $response->statusCode() . "\n";
    echo "Response Body: " . $response->body() . "\n";
    
    $headers = $response->headers();
    if (isset($headers['X-Message-Id'])) {
        echo "Message ID: " . (is_array($headers['X-Message-Id']) ? $headers['X-Message-Id'][0] : $headers['X-Message-Id']) . "\n";
    }
    
    echo "SendGrid production test completed successfully!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>