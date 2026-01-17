<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use App\Models\SystemSetting;
use App\Mail\TestEmail;
use Exception;
use Aws\Exception\AwsException;
use Aws\S3\S3Client;

class SystemSettingsController extends Controller
{
    /**
     * Get system settings
     */
    public function index()
    {
        try {
            $settings = SystemSetting::whereIn('key', [
                'email_sendgrid_api_key',
                'email_sender_email',
                'email_sender_name',
                'email_sendgrid_api_id',
            ])->get();
            
            $data = [
                'sendgrid_api_key' => '',
                'sender_email' => 'info@qsights.com',
                'sender_name' => 'QSights Support',
                'sendgrid_api_id' => 'dFz6dyicT3C61aTtN019Ew',
            ];
            
            foreach ($settings as $setting) {
                $key = str_replace('email_', '', $setting->key);
                // Get decrypted value if encrypted
                $data[$key] = $setting->decrypted_value ?? $setting->value;
            }
            
            return response()->json([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (Exception $e) {
            \Log::error('Failed to load system settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load system settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store system settings
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'sendgrid_api_key' => 'required|string|min:20',
                'sender_email' => 'required|email',
                'sender_name' => 'nullable|string|max:255',
                'sendgrid_api_id' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $settings = [
                'email_sendgrid_api_key' => [
                    'value' => $request->sendgrid_api_key,
                    'is_encrypted' => true,
                    'description' => 'SendGrid API Key for email delivery',
                ],
                'email_sender_email' => [
                    'value' => $request->sender_email,
                    'is_encrypted' => false,
                    'description' => 'Verified sender email address',
                ],
                'email_sender_name' => [
                    'value' => $request->sender_name ?? 'QSights Support',
                    'is_encrypted' => false,
                    'description' => 'Sender name shown in emails',
                ],
                'email_sendgrid_api_id' => [
                    'value' => $request->sendgrid_api_id ?? '',
                    'is_encrypted' => false,
                    'description' => 'SendGrid API Key ID',
                ],
            ];

            foreach ($settings as $key => $data) {
                SystemSetting::updateOrCreate(
                    ['key' => $key],
                    $data
                );
            }

            return response()->json([
                'status' => 'success',
                'message' => 'System settings updated successfully'
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to save system settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save system settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test email configuration
     */
    public function testEmail(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'test_email' => 'required|email',
                'config.sendgrid_api_key' => 'required|string',
                'config.sender_email' => 'required|email',
                'config.sender_name' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $config = $request->config;
            
            // Extract the actual API key if it's encrypted
            $apiKey = $config['sendgrid_api_key'];
            if (str_starts_with($apiKey, 'encrypted:')) {
                $apiKey = decrypt(substr($apiKey, 10));
            }
            
            // Validate API key format
            if (!str_starts_with($apiKey, 'SG.')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid SendGrid API key format. Key should start with "SG."'
                ], 400);
            }

            // Send test email using SendGrid directly
            $sendgrid = new \SendGrid($apiKey);
            
            $email = new \SendGrid\Mail\Mail();
            $email->setFrom($config['sender_email'], $config['sender_name'] ?? 'QSights Support');
            $email->addTo($request->test_email, "Super Admin");
            $email->setSubject("QSights - Test Email Configuration");
            
            $htmlContent = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #2563eb; text-align: center;'>✅ QSights Test Email</h2>
                <div style='background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='color: #059669; margin-top: 0;'>Email Configuration Test Successful!</h3>
                    <p>This test email was sent to verify your SendGrid email configuration.</p>
                    <p><strong>Configuration Details:</strong></p>
                    <ul>
                        <li><strong>Sender Email:</strong> {$config['sender_email']}</li>
                        <li><strong>Sender Name:</strong> " . ($config['sender_name'] ?? 'QSights Support') . "</li>
                        <li><strong>Test Email:</strong> {$request->test_email}</li>
                        <li><strong>Timestamp:</strong> " . now()->toDateTimeString() . "</li>
                    </ul>
                    <p>✓ If you received this email, your SendGrid integration is working correctly!</p>
                </div>
                <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;'>
                    <p style='color: #6b7280; font-size: 14px;'>
                        This is an automated test email from QSights System Settings.<br>
                        Generated on " . now()->toDateTimeString() . "
                    </p>
                </div>
            </div>";
            
            $email->addContent("text/html", $htmlContent);

            $response = $sendgrid->send($email);
            
            \Log::info('SendGrid test email response', [
                'status_code' => $response->statusCode(),
                'headers' => $response->headers(),
                'body' => $response->body()
            ]);
            
            if ($response->statusCode() >= 200 && $response->statusCode() < 300) {
                $messageId = 'N/A';
                if (isset($response->headers()['X-Message-Id'])) {
                    $messageId = is_array($response->headers()['X-Message-Id']) 
                        ? $response->headers()['X-Message-Id'][0] 
                        : $response->headers()['X-Message-Id'];
                }
                
                return response()->json([
                    'status' => 'success',
                    'message' => 'Test email sent successfully! Check your inbox.',
                    'sendgrid_status' => $response->statusCode(),
                    'message_id' => $messageId
                ]);
            } else {
                $errorBody = $response->body();
                \Log::error('SendGrid API error', [
                    'status' => $response->statusCode(),
                    'body' => $errorBody
                ]);
                
                throw new Exception('SendGrid returned status: ' . $response->statusCode() . ' - ' . $errorBody);
            }

        } catch (Exception $e) {
            \Log::error('Failed to send test email', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send test email: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get S3 configuration settings
     */
    public function getS3Config()
    {
        try {
            $settings = SystemSetting::whereIn('key', [
                's3_bucket',
                's3_folder',
                's3_region',
                's3_access_key',
                's3_secret_key',
                's3_url',
                's3_cloudfront_url',
            ])->get();
            
            $data = [
                'aws_s3_bucket' => '',
                'aws_s3_folder' => '',
                'aws_region' => 'ap-southeast-1',
                'aws_access_key_id' => '',
                'aws_secret_access_key' => '',
                'aws_s3_url' => '',
                'aws_cloudfront_url' => '',
            ];
            
            foreach ($settings as $setting) {
                // Map database keys to frontend keys
                $frontendKey = match($setting->key) {
                    's3_bucket' => 'aws_s3_bucket',
                    's3_folder' => 'aws_s3_folder',
                    's3_region' => 'aws_region',
                    's3_access_key' => 'aws_access_key_id',
                    's3_secret_key' => 'aws_secret_access_key',
                    's3_url' => 'aws_s3_url',
                    's3_cloudfront_url' => 'aws_cloudfront_url',
                    default => null
                };
                
                if ($frontendKey) {
                    // Get decrypted value if encrypted
                    $data[$frontendKey] = $setting->decrypted_value ?? $setting->value;
                }
            }
            
            return response()->json([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (Exception $e) {
            \Log::error('Failed to load S3 settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load S3 settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save S3 configuration settings
     */
    public function saveS3Config(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'aws_s3_bucket' => 'required|string',
                'aws_s3_folder' => 'nullable|string',
                'aws_region' => 'required|string',
                'aws_access_key_id' => 'required|string',
                'aws_secret_access_key' => 'required|string',
                'aws_s3_url' => 'nullable|url',
                'aws_cloudfront_url' => 'nullable|url',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $settings = [
                's3_bucket' => [
                    'value' => $request->aws_s3_bucket,
                    'is_encrypted' => false,
                    'description' => 'S3 bucket name for file storage',
                ],
                's3_folder' => [
                    'value' => $request->aws_s3_folder ?? '',
                    'is_encrypted' => false,
                    'description' => 'S3 folder/prefix for uploads',
                ],
                's3_region' => [
                    'value' => $request->aws_region,
                    'is_encrypted' => false,
                    'description' => 'AWS region where S3 bucket is located',
                ],
                's3_access_key' => [
                    'value' => $request->aws_access_key_id,
                    'is_encrypted' => true,
                    'description' => 'AWS IAM access key with S3 permissions',
                ],
                's3_secret_key' => [
                    'value' => $request->aws_secret_access_key,
                    'is_encrypted' => true,
                    'description' => 'AWS IAM secret key',
                ],
                's3_url' => [
                    'value' => $request->aws_s3_url ?? '',
                    'is_encrypted' => false,
                    'description' => 'S3 base URL for public access',
                ],
                's3_cloudfront_url' => [
                    'value' => $request->aws_cloudfront_url ?? '',
                    'is_encrypted' => false,
                    'description' => 'CloudFront CDN URL for better performance',
                ],
            ];

            foreach ($settings as $key => $data) {
                SystemSetting::updateOrCreate(
                    ['key' => $key],
                    $data
                );
            }

            return response()->json([
                'status' => 'success',
                'message' => 'S3 configuration saved successfully'
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to save S3 settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save S3 settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test S3 connection
     */
    public function testS3Connection(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'config.aws_s3_bucket' => 'required|string',
                'config.aws_region' => 'required|string',
                'config.aws_access_key_id' => 'required|string',
                'config.aws_secret_access_key' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $config = $request->config;
            
            // Create S3 client
            $s3Client = new S3Client([
                'region' => $config['aws_region'],
                'version' => 'latest',
                'credentials' => [
                    'key' => $config['aws_access_key_id'],
                    'secret' => $config['aws_secret_access_key'],
                ],
            ]);

            // Test: Check if bucket exists and is accessible
            try {
                $s3Client->headBucket([
                    'Bucket' => $config['aws_s3_bucket']
                ]);
            } catch (AwsException $e) {
                if ($e->getAwsErrorCode() === 'NotFound') {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'S3 bucket not found: ' . $config['aws_s3_bucket']
                    ], 404);
                } elseif ($e->getAwsErrorCode() === 'Forbidden') {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Access denied to S3 bucket. Check IAM permissions.'
                    ], 403);
                } else {
                    throw $e;
                }
            }

            // Test: Upload a small test file
            $testContent = 'QSights S3 Configuration Test - ' . now()->toDateTimeString();
            $testKey = ($config['aws_s3_folder'] ?? '') . '/test-uploads/config-test-' . time() . '.txt';
            
            $result = $s3Client->putObject([
                'Bucket' => $config['aws_s3_bucket'],
                'Key' => $testKey,
                'Body' => $testContent,
                'ContentType' => 'text/plain',
            ]);

            // Test: Delete the test file
            $s3Client->deleteObject([
                'Bucket' => $config['aws_s3_bucket'],
                'Key' => $testKey,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'S3 connection test successful! Bucket is accessible and writable.',
                'details' => [
                    'bucket' => $config['aws_s3_bucket'],
                    'region' => $config['aws_region'],
                    'test_file' => $testKey,
                ]
            ]);

        } catch (AwsException $e) {
            \Log::error('S3 connection test failed', [
                'error' => $e->getMessage(),
                'aws_error_code' => $e->getAwsErrorCode(),
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'S3 connection test failed: ' . $e->getMessage()
            ], 500);
        } catch (Exception $e) {
            \Log::error('S3 connection test failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'S3 connection test failed: ' . $e->getMessage()
            ], 500);
        }
    }
}