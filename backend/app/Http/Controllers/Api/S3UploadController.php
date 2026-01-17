<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\SystemSetting;
use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Exception;
use Illuminate\Support\Str;

class S3UploadController extends Controller
{
    /**
     * Get S3 configuration from system settings
     */
    private function getS3Config()
    {
        $settings = SystemSetting::whereIn('key', [
            's3_bucket',
            's3_folder',
            's3_region',
            's3_access_key',
            's3_secret_key',
            's3_url',
            's3_cloudfront_url',
        ])->get();
        
        $config = [];
        foreach ($settings as $setting) {
            $config[$setting->key] = $setting->decrypted_value ?? $setting->value;
        }
        
        return $config;
    }

    /**
     * Check if S3 is configured
     */
    public function checkConfig()
    {
        try {
            $config = $this->getS3Config();
            
            $isConfigured = !empty($config['s3_bucket']) && 
                           !empty($config['s3_region']) && 
                           !empty($config['s3_access_key']) && 
                           !empty($config['s3_secret_key']);
            
            return response()->json([
                'status' => 'success',
                'configured' => $isConfigured,
                'bucket' => $isConfigured ? $config['s3_bucket'] : null,
                'region' => $isConfigured ? $config['s3_region'] : null,
                'folder' => $isConfigured ? ($config['s3_folder'] ?? null) : null,
                'has_cloudfront' => !empty($config['s3_cloudfront_url']),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'configured' => false,
                'message' => 'Failed to check S3 configuration'
            ], 500);
        }
    }

    /**
     * Upload image to S3
     */
    public function upload(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:png,jpg,jpeg,gif,svg,webp|max:15360', // 15MB max
                'folder' => 'nullable|string|max:100',
                'questionnaire_id' => 'nullable|integer',
                'question_id' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get S3 configuration
            $config = $this->getS3Config();
            
            if (empty($config['s3_bucket']) || empty($config['s3_region']) || 
                empty($config['s3_access_key']) || empty($config['s3_secret_key'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'S3 is not configured. Please configure AWS S3 in System Settings.'
                ], 400);
            }

            // Get the uploaded file
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $size = $file->getSize();

            // Generate unique filename
            $folder = $request->input('folder', 'questionnaire-images');
            $questionnaireId = $request->input('questionnaire_id');
            $questionId = $request->input('question_id');
            
            // Build the S3 key (path) - include the base folder from settings
            $baseFolder = !empty($config['s3_folder']) ? rtrim($config['s3_folder'], '/') : '';
            $timestamp = now()->format('Ymd_His');
            $uniqueId = Str::random(8);
            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
            $filename = "{$timestamp}_{$uniqueId}_{$safeName}.{$extension}";
            
            // Construct the full S3 key with base folder
            if ($baseFolder) {
                if ($questionnaireId) {
                    $s3Key = "{$baseFolder}/{$folder}/questionnaire_{$questionnaireId}/{$filename}";
                } else {
                    $s3Key = "{$baseFolder}/{$folder}/{$filename}";
                }
            } else {
                if ($questionnaireId) {
                    $s3Key = "{$folder}/questionnaire_{$questionnaireId}/{$filename}";
                } else {
                    $s3Key = "{$folder}/{$filename}";
                }
            }

            // Create S3 client
            $s3Client = new S3Client([
                'region' => $config['s3_region'],
                'version' => 'latest',
                'credentials' => [
                    'key' => $config['s3_access_key'],
                    'secret' => $config['s3_secret_key'],
                ],
            ]);

            // Upload to S3 (bucket uses bucket-owner-enforced ACL setting)
            $result = $s3Client->putObject([
                'Bucket' => $config['s3_bucket'],
                'Key' => $s3Key,
                'Body' => fopen($file->getPathname(), 'rb'),
                'ContentType' => $mimeType,
                'CacheControl' => 'max-age=31536000', // Cache for 1 year
            ]);

            // Get the URL
            $s3Url = $result['ObjectURL'] ?? "https://{$config['s3_bucket']}.s3.{$config['s3_region']}.amazonaws.com/{$s3Key}";
            
            // Use CloudFront URL if configured
            $publicUrl = $s3Url;
            if (!empty($config['s3_cloudfront_url'])) {
                $cloudfrontUrl = rtrim($config['s3_cloudfront_url'], '/');
                $publicUrl = "{$cloudfrontUrl}/{$s3Key}";
            }

            \Log::info('S3 upload successful', [
                'key' => $s3Key,
                'url' => $publicUrl,
                'size' => $size,
                'mime' => $mimeType,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Image uploaded successfully',
                'data' => [
                    'url' => $publicUrl,
                    's3_url' => $s3Url,
                    'key' => $s3Key,
                    'filename' => $filename,
                    'original_name' => $originalName,
                    'size' => $size,
                    'mime_type' => $mimeType,
                ]
            ]);

        } catch (AwsException $e) {
            \Log::error('S3 upload failed', [
                'error' => $e->getMessage(),
                'code' => $e->getAwsErrorCode(),
            ]);

            $friendlyMessage = match ($e->getAwsErrorCode()) {
                'AccessDenied' => 'Access denied. Please check S3 bucket permissions.',
                'NoSuchBucket' => 'S3 bucket not found. Please check the bucket name.',
                'InvalidAccessKeyId' => 'Invalid AWS credentials. Please check System Settings.',
                default => 'S3 upload failed: ' . $e->getAwsErrorMessage(),
            };

            return response()->json([
                'status' => 'error',
                'message' => $friendlyMessage
            ], 400);

        } catch (Exception $e) {
            \Log::error('Upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete image from S3
     */
    public function delete(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'key' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'S3 key is required',
                    'errors' => $validator->errors()
                ], 422);
            }

            $config = $this->getS3Config();
            
            if (empty($config['s3_bucket'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'S3 is not configured'
                ], 400);
            }

            $s3Client = new S3Client([
                'region' => $config['s3_region'],
                'version' => 'latest',
                'credentials' => [
                    'key' => $config['s3_access_key'],
                    'secret' => $config['s3_secret_key'],
                ],
            ]);

            $s3Client->deleteObject([
                'Bucket' => $config['s3_bucket'],
                'Key' => $request->input('key'),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Image deleted successfully'
            ]);

        } catch (Exception $e) {
            \Log::error('S3 delete failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete image: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get presigned URL for direct upload (optional - for large files)
     */
    public function getPresignedUrl(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'filename' => 'required|string|max:255',
                'content_type' => 'required|string|in:image/png,image/jpeg,image/gif,image/svg+xml,image/webp',
                'folder' => 'nullable|string|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $config = $this->getS3Config();
            
            if (empty($config['s3_bucket'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'S3 is not configured'
                ], 400);
            }

            $folder = $request->input('folder', 'questionnaire-images');
            $filename = $request->input('filename');
            $extension = pathinfo($filename, PATHINFO_EXTENSION);
            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
            
            // Include base folder from settings
            $baseFolder = !empty($config['s3_folder']) ? rtrim($config['s3_folder'], '/') : '';
            $timestamp = now()->format('Ymd_His');
            $uniqueId = Str::random(8);
            
            if ($baseFolder) {
                $s3Key = "{$baseFolder}/{$folder}/{$timestamp}_{$uniqueId}_{$safeName}.{$extension}";
            } else {
                $s3Key = "{$folder}/{$timestamp}_{$uniqueId}_{$safeName}.{$extension}";
            }

            $s3Client = new S3Client([
                'region' => $config['s3_region'],
                'version' => 'latest',
                'credentials' => [
                    'key' => $config['s3_access_key'],
                    'secret' => $config['s3_secret_key'],
                ],
            ]);

            // Generate presigned URL valid for 15 minutes (bucket uses bucket-owner-enforced ACL)
            $cmd = $s3Client->getCommand('PutObject', [
                'Bucket' => $config['s3_bucket'],
                'Key' => $s3Key,
                'ContentType' => $request->input('content_type'),
            ]);

            $presignedRequest = $s3Client->createPresignedRequest($cmd, '+15 minutes');
            $presignedUrl = (string) $presignedRequest->getUri();

            // Build the public URL
            $publicUrl = "https://{$config['s3_bucket']}.s3.{$config['s3_region']}.amazonaws.com/{$s3Key}";
            if (!empty($config['s3_cloudfront_url'])) {
                $cloudfrontUrl = rtrim($config['s3_cloudfront_url'], '/');
                $publicUrl = "{$cloudfrontUrl}/{$s3Key}";
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'upload_url' => $presignedUrl,
                    'public_url' => $publicUrl,
                    'key' => $s3Key,
                    'expires_in' => 900, // 15 minutes in seconds
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to generate presigned URL', ['error' => $e->getMessage()]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate upload URL: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate presigned URL for viewing/downloading an S3 object
     * Use this when the bucket doesn't have public read access
     */
    public function getViewUrl(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'key' => 'required|string',
                'expires' => 'nullable|integer|min:60|max:604800', // 1 min to 7 days
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $config = $this->getS3Config();
            
            if (empty($config['s3_bucket'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'S3 is not configured'
                ], 400);
            }

            $s3Client = new S3Client([
                'region' => $config['s3_region'],
                'version' => 'latest',
                'credentials' => [
                    'key' => $config['s3_access_key'],
                    'secret' => $config['s3_secret_key'],
                ],
            ]);

            $s3Key = $request->input('key');
            $expiresIn = $request->input('expires', 3600); // Default 1 hour

            $cmd = $s3Client->getCommand('GetObject', [
                'Bucket' => $config['s3_bucket'],
                'Key' => $s3Key,
            ]);

            $presignedRequest = $s3Client->createPresignedRequest($cmd, "+{$expiresIn} seconds");
            $presignedUrl = (string) $presignedRequest->getUri();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'url' => $presignedUrl,
                    'key' => $s3Key,
                    'expires_in' => $expiresIn,
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to generate view URL', ['error' => $e->getMessage()]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate view URL: ' . $e->getMessage()
            ], 500);
        }
    }
}
