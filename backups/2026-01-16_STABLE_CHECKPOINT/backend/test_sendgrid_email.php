<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use SendGrid\Mail\Mail;

echo "=== SendGrid Email Test ===\n\n";

// Configuration
$apiKey = $_ENV['SENDGRID_API_KEY'];
$fromEmail = $_ENV['SENDGRID_FROM_EMAIL'];
$fromName = $_ENV['SENDGRID_FROM_NAME'];

// Test recipient (super admin email)
$toEmail = 'yashbant.mahanty@bioquestglobal.com';

echo "Configuration:\n";
echo "- API Key: " . substr($apiKey, 0, 20) . "...\n";
echo "- From: $fromName <$fromEmail>\n";
echo "- To: $toEmail\n\n";

try {
    $sendgrid = new \SendGrid($apiKey);
    
    $email = new Mail();
    $email->setFrom($fromEmail, $fromName);
    $email->setSubject("✅ SendGrid Test - QSights Configuration Updated");
    $email->addTo($toEmail);
    
    $htmlContent = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <h2 style='color: #2563eb;'>SendGrid Configuration Test</h2>
        <p>This is a test email to verify that the SendGrid configuration has been updated successfully.</p>
        
        <div style='background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='margin-top: 0;'>Configuration Details:</h3>
            <ul>
                <li><strong>Sender:</strong> $fromName</li>
                <li><strong>Email:</strong> $fromEmail</li>
                <li><strong>Timestamp:</strong> " . date('Y-m-d H:i:s') . "</li>
            </ul>
        </div>
        
        <p><strong>✓ If you received this email, the SendGrid configuration is working correctly!</strong></p>
        
        <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;'>
        
        <p style='color: #6b7280; font-size: 12px;'>
            This email was sent from the QSights application to test the SendGrid integration.
        </p>
    </div>
    ";
    
    $email->addContent("text/html", $htmlContent);
    
    echo "Sending email...\n";
    $response = $sendgrid->send($email);
    
    $statusCode = $response->statusCode();
    
    echo "\n=== Response ===\n";
    echo "Status Code: $statusCode\n";
    echo "Headers: " . json_encode($response->headers(), JSON_PRETTY_PRINT) . "\n";
    echo "Body: " . $response->body() . "\n\n";
    
    if ($statusCode >= 200 && $statusCode < 300) {
        echo "✅ SUCCESS! Email sent successfully!\n";
        echo "Please check your inbox at: $toEmail\n";
        echo "\nVerify:\n";
        echo "1. Email received in inbox\n";
        echo "2. Sender shows as: QSights Support <support@qsights.com>\n";
        echo "3. Subject: ✅ SendGrid Test - QSights Configuration Updated\n";
    } else {
        echo "❌ FAILED! Status code: $statusCode\n";
    }
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== Test Complete ===\n";
