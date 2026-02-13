<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuestionnaireVideo;
use App\Models\VideoViewLog;
use App\Models\Questionnaire;
use App\Models\SystemSetting;
use App\Models\VideoWatchTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Exception;

class VideoUploadController extends Controller
{
    /**
     * Maximum video file size (100MB)
     */
    private const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

    /**
     * Allowed video formats
     */
    private const ALLOWED_FORMATS = ['video/mp4', 'video/webm'];

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
     * Upload video to S3 (with validation)
     */
    public function uploadVideo(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:mp4,webm|max:102400', // 100MB max
                'questionnaire_id' => 'nullable|exists:questionnaires,id', // Accept both integer and UUID
                'video_type' => 'nullable|string|in:intro,section',
                'thumbnail' => 'nullable|file|mimes:jpeg,jpg,png,webp|max:5120', // 5MB thumbnail
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

            // Validate file size
            $file = $request->file('file');
            if ($file->getSize() > self::MAX_FILE_SIZE) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'File size exceeds maximum limit of 100MB'
                ], 422);
            }

            // Validate video format
            if (!in_array($file->getMimeType(), self::ALLOWED_FORMATS)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid video format. Only MP4 and WEBM are allowed.'
                ], 422);
            }

            $questionnaireId = $request->input('questionnaire_id');
            $videoType = $request->input('video_type', 'intro');
            
            // Generate unique filename for video
            $timestamp = now()->format('Ymd_His');
            $uniqueId = Str::random(8);
            $extension = $file->getClientOriginalExtension();
            $videoFilename = "video_{$timestamp}_{$uniqueId}.{$extension}";
            
            // Build S3 key for video
            $baseFolder = !empty($config['s3_folder']) ? rtrim($config['s3_folder'], '/') : '';
            $videoFolder = 'questionnaire-videos';
            
            if ($baseFolder) {
                $videoS3Key = "{$baseFolder}/{$videoFolder}/questionnaire_{$questionnaireId}/{$videoFilename}";
            } else {
                $videoS3Key = "{$videoFolder}/questionnaire_{$questionnaireId}/{$videoFilename}";
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

            // Upload video to S3
            $videoResult = $s3Client->putObject([
                'Bucket' => $config['s3_bucket'],
                'Key' => $videoS3Key,
                'Body' => fopen($file->getPathname(), 'rb'),
                'ContentType' => $file->getMimeType(),
                'CacheControl' => 'max-age=31536000',
            ]);

            // Get video URL
            $videoS3Url = $videoResult['ObjectURL'] ?? "https://{$config['s3_bucket']}.s3.{$config['s3_region']}.amazonaws.com/{$videoS3Key}";
            $videoPublicUrl = $videoS3Url;
            
            if (!empty($config['s3_cloudfront_url'])) {
                $cloudfrontUrl = rtrim($config['s3_cloudfront_url'], '/');
                $videoPublicUrl = "{$cloudfrontUrl}/{$videoS3Key}";
            }

            // Upload thumbnail if provided
            $thumbnailPublicUrl = null;
            if ($request->hasFile('thumbnail')) {
                $thumbnail = $request->file('thumbnail');
                $thumbnailExtension = $thumbnail->getClientOriginalExtension();
                $thumbnailFilename = "thumbnail_{$timestamp}_{$uniqueId}.{$thumbnailExtension}";
                
                if ($baseFolder) {
                    $thumbnailS3Key = "{$baseFolder}/{$videoFolder}/questionnaire_{$questionnaireId}/thumbnails/{$thumbnailFilename}";
                } else {
                    $thumbnailS3Key = "{$videoFolder}/questionnaire_{$questionnaireId}/thumbnails/{$thumbnailFilename}";
                }

                $thumbnailResult = $s3Client->putObject([
                    'Bucket' => $config['s3_bucket'],
                    'Key' => $thumbnailS3Key,
                    'Body' => fopen($thumbnail->getPathname(), 'rb'),
                    'ContentType' => $thumbnail->getMimeType(),
                    'CacheControl' => 'max-age=31536000',
                ]);

                $thumbnailS3Url = $thumbnailResult['ObjectURL'] ?? "https://{$config['s3_bucket']}.s3.{$config['s3_region']}.amazonaws.com/{$thumbnailS3Key}";
                $thumbnailPublicUrl = $thumbnailS3Url;
                
                if (!empty($config['s3_cloudfront_url'])) {
                    $thumbnailPublicUrl = "{$cloudfrontUrl}/{$thumbnailS3Key}";
                }
            }

            \Log::info('Video upload successful', [
                'video_key' => $videoS3Key,
                'video_url' => $videoPublicUrl,
                'thumbnail_url' => $thumbnailPublicUrl,
                'size' => $file->getSize(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Video uploaded successfully',
                'data' => [
                    'video_url' => $videoPublicUrl,
                    'video_s3_key' => $videoS3Key,
                    'thumbnail_url' => $thumbnailPublicUrl,
                    'filename' => $videoFilename,
                    'size' => $file->getSize(),
                ]
            ]);

        } catch (AwsException $e) {
            \Log::error('S3 video upload failed', [
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
            \Log::error('Video upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to upload video: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save video metadata to database
     */
    public function saveVideoMetadata(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'questionnaire_id' => 'required|uuid|exists:questionnaires,id',
                'video_url' => 'required|url',
                'thumbnail_url' => 'nullable|url',
                'video_type' => 'nullable|string|in:intro,section',
                'display_mode' => 'required|string|in:inline,modal',
                'must_watch' => 'required|boolean',
                'autoplay' => 'nullable|boolean',
                'video_duration_seconds' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if intro video already exists for this questionnaire
            $videoType = $request->input('video_type', 'intro');
            if ($videoType === 'intro') {
                $existingVideo = QuestionnaireVideo::where('questionnaire_id', $request->questionnaire_id)
                    ->where('video_type', 'intro')
                    ->first();
                
                if ($existingVideo) {
                    // Update existing video
                    $existingVideo->update([
                        'video_url' => $request->video_url,
                        'thumbnail_url' => $request->thumbnail_url,
                        'display_mode' => $request->display_mode,
                        'must_watch' => $request->must_watch,
                        'autoplay' => $request->autoplay ?? false,
                        'video_duration_seconds' => $request->video_duration_seconds,
                        'created_by' => auth()->id(),
                    ]);

                    return response()->json([
                        'status' => 'success',
                        'message' => 'Video metadata updated successfully',
                        'data' => $existingVideo
                    ]);
                }
            }

            // Create new video record
            $video = QuestionnaireVideo::create([
                'questionnaire_id' => $request->questionnaire_id,
                'video_url' => $request->video_url,
                'thumbnail_url' => $request->thumbnail_url,
                'video_type' => $videoType,
                'display_mode' => $request->display_mode,
                'must_watch' => $request->must_watch,
                'autoplay' => $request->autoplay ?? false,
                'video_duration_seconds' => $request->video_duration_seconds,
                'created_by' => auth()->id(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Video metadata saved successfully',
                'data' => $video
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to save video metadata', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save video metadata: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get video by questionnaire ID
     */
    public function getVideoByQuestionnaire($questionnaireId)
    {
        try {
            $video = QuestionnaireVideo::where('questionnaire_id', $questionnaireId)
                ->where('video_type', 'intro')
                ->first();

            if (!$video) {
                return response()->json([
                    'status' => 'success',
                    'data' => null
                ]);
            }

            return response()->json([
                'status' => 'success',
                'data' => $video
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to get video', ['error' => $e->getMessage()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get video'
            ], 500);
        }
    }

    /**
     * Delete video
     */
    public function deleteVideo($videoId)
    {
        try {
            $video = QuestionnaireVideo::findOrFail($videoId);
            $video->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Video deleted successfully'
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to delete video', ['error' => $e->getMessage()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete video'
            ], 500);
        }
    }

    /**
     * Log video view (idempotent - updates existing record if found)
     */
    public function logVideoView(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'questionnaire_id' => 'required|uuid|exists:questionnaires,id',
                'video_id' => 'required|uuid|exists:questionnaire_videos,id',
                'activity_id' => 'nullable|uuid|exists:activities,id',
                'participant_id' => 'nullable|uuid|exists:participants,id',
                'watch_duration_seconds' => 'required|integer|min:0',
                'completed' => 'required|boolean',
                'completion_percentage' => 'nullable|numeric|min:0|max:100',
                'participant_email' => 'nullable|email',
                'participant_name' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Idempotent operation - update existing log or create new one
            // Match based on: video_id + activity_id + participant_id
            $uniqueKey = [
                'video_id' => $request->video_id,
                'activity_id' => $request->activity_id,
                'participant_id' => $request->participant_id,
            ];

            // Only update if new duration is greater than existing (prevent backwards progress)
            $log = VideoViewLog::updateOrCreate(
                $uniqueKey,
                [
                    'user_id' => auth()->id(),
                    'questionnaire_id' => $request->questionnaire_id,
                    'watch_duration_seconds' => $request->watch_duration_seconds,
                    'completed' => $request->completed,
                    'completion_percentage' => $request->completion_percentage ?? 0,
                    'participant_email' => $request->participant_email,
                    'participant_name' => $request->participant_name,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Video view logged successfully',
                'data' => $log
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to log video view', ['error' => $e->getMessage()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to log video view'
            ], 500);
        }
    }

    /**
     * Get video view statistics for a questionnaire
     */
    public function getVideoStatistics($questionnaireId)
    {
        try {
            $video = QuestionnaireVideo::where('questionnaire_id', $questionnaireId)
                ->where('video_type', 'intro')
                ->first();

            if (!$video) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'total_views' => 0,
                        'completed_views' => 0,
                        'completion_rate' => 0,
                        'average_watch_duration' => '00:00:00',
                    ]
                ]);
            }

            $logs = VideoViewLog::where('video_id', $video->id)->get();
            $totalViews = $logs->count();
            $completedViews = $logs->where('completed', true)->count();
            $completionRate = $totalViews > 0 ? ($completedViews / $totalViews) * 100 : 0;
            $averageDuration = $logs->avg('watch_duration_seconds') ?? 0;

            // Format average duration
            $hours = floor($averageDuration / 3600);
            $minutes = floor(($averageDuration % 3600) / 60);
            $seconds = $averageDuration % 60;
            $formattedDuration = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_views' => $totalViews,
                    'completed_views' => $completedViews,
                    'completion_rate' => round($completionRate, 2),
                    'average_watch_duration' => $formattedDuration,
                    'average_watch_duration_seconds' => round($averageDuration),
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to get video statistics', ['error' => $e->getMessage()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get video statistics'
            ], 500);
        }
    }

    /**
     * Get participant's existing watch log for resume functionality
     * Public endpoint - no auth required
     */
    public function getParticipantWatchLog(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'video_id' => 'required|uuid|exists:questionnaire_videos,id',
                'activity_id' => 'required|uuid|exists:activities,id',
                'participant_id' => 'required|uuid|exists:participants,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $log = VideoViewLog::where('video_id', $request->video_id)
                ->where('activity_id', $request->activity_id)
                ->where('participant_id', $request->participant_id)
                ->first();

            if (!$log) {
                return response()->json([
                    'status' => 'success',
                    'data' => null
                ]);
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'watch_duration_seconds' => $log->watch_duration_seconds,
                    'completed' => $log->completed,
                    'completion_percentage' => $log->completion_percentage,
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to get participant watch log', ['error' => $e->getMessage()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get watch log'
            ], 500);
        }
    }

    /**
     * Track video question watch progress
     */
    public function trackVideoQuestionProgress(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'response_id' => 'nullable|uuid|exists:responses,id',
                'participant_id' => 'nullable|uuid|exists:participants,id',
                'activity_id' => 'required|uuid|exists:activities,id',
                'question_id' => 'required|string|max:255', // Changed from exists:questions,id - question may be stored in questionnaire JSON
                'watch_time_seconds' => 'required|integer|min:0',
                'completed_watch' => 'required|boolean',
                'total_plays' => 'nullable|integer|min:0',
                'total_pauses' => 'nullable|integer|min:0',
                'total_seeks' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            
            // Calculate formatted time and completion percentage
            $watchTimeFormatted = VideoWatchTracking::formatSeconds($data['watch_time_seconds']);
            
            // Get video duration from question
            $question = \App\Models\Question::find($data['question_id']);
            $completionPercentage = 0;
            if ($question && $question->video_duration_seconds > 0) {
                $completionPercentage = min(100, ($data['watch_time_seconds'] / $question->video_duration_seconds) * 100);
            }

            // Build unique identifier for tracking record
            // If response_id exists, use it + question_id
            // Otherwise, use participant_id + activity_id + question_id
            $uniqueIdentifier = [];
            if (!empty($data['response_id'])) {
                $uniqueIdentifier['response_id'] = $data['response_id'];
                $uniqueIdentifier['question_id'] = $data['question_id'];
            } else {
                $uniqueIdentifier['participant_id'] = $data['participant_id'];
                $uniqueIdentifier['activity_id'] = $data['activity_id'];
                $uniqueIdentifier['question_id'] = $data['question_id'];
            }

            // Check if record exists to handle first_played_at properly
            $existingTracking = VideoWatchTracking::where($uniqueIdentifier)->first();
            
            // Prepare data for update/create - using existing database schema
            $trackingData = [
                'participant_id' => $data['participant_id'] ?? null,
                'activity_id' => $data['activity_id'],
                'watch_time_seconds' => $data['watch_time_seconds'],
                'max_watch_position' => $data['watch_time_seconds'], // Track max position
                'completed' => $data['completed_watch'],
                'play_count' => $data['total_plays'] ?? 0,
                'pause_count' => $data['total_pauses'] ?? 0,
                'seek_count' => $data['total_seeks'] ?? 0,
            ];
            
            // Only include response_id if it's provided and not null
            if (!empty($data['response_id'])) {
                $trackingData['response_id'] = $data['response_id'];
            }

            // Update or create tracking record
            $tracking = VideoWatchTracking::updateOrCreate(
                $uniqueIdentifier,
                $trackingData
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Watch progress tracked successfully',
                'data' => $tracking
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to track video watch progress', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to track watch progress: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get watch progress for a specific video question
     */
    public function getVideoQuestionProgress(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'response_id' => 'nullable|uuid|exists:responses,id',
                'question_id' => 'required|string|max:255', // Changed from exists:questions,id - question may be stored in questionnaire JSON
                'participant_id' => 'nullable|uuid|exists:participants,id',
                'activity_id' => 'nullable|uuid|exists:activities,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Build query with available identifiers
            $query = VideoWatchTracking::where('question_id', $request->question_id);
            
            if ($request->response_id) {
                $query->where('response_id', $request->response_id);
            } elseif ($request->participant_id && $request->activity_id) {
                // Fallback: find by participant + activity + question if no response_id
                $query->where('participant_id', $request->participant_id)
                      ->where('activity_id', $request->activity_id);
            }
            
            $tracking = $query->first();

            if (!$tracking) {
                return response()->json([
                    'status' => 'success',
                    'data' => null
                ]);
            }

            // Map database columns to expected frontend field names
            $responseData = [
                'watch_time_seconds' => $tracking->watch_time_seconds,
                'completed_watch' => $tracking->completed,
                'total_plays' => $tracking->play_count,
                'total_pauses' => $tracking->pause_count, 
                'total_seeks' => $tracking->seek_count,
            ];

            return response()->json([
                'status' => 'success',
                'data' => $responseData
            ]);

        } catch (Exception $e) {
            \Log::error('Failed to get video watch progress', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get watch progress'
            ], 500);
        }
    }

    /**
     * Upload video for a video question type
     */
    public function uploadVideoQuestion(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:mp4,mov,webm|max:102400', // 100MB max
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

            // Get video duration (using getID3 if available)
            $duration = $this->getVideoDuration($file->getPathname());

            // Generate unique filename
            $folder = $request->input('folder', 'questionnaire-videos');
            $questionnaireId = $request->input('questionnaire_id');
            $questionId = $request->input('question_id');
            
            // Build the S3 key (path)
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

            // Upload video to S3
            $result = $s3Client->putObject([
                'Bucket' => $config['s3_bucket'],
                'Key' => $s3Key,
                'Body' => fopen($file->getPathname(), 'rb'),
                'ContentType' => $mimeType,
                'CacheControl' => 'max-age=31536000',
            ]);

            // Get the URL
            $s3Url = $result['ObjectURL'] ?? "https://{$config['s3_bucket']}.s3.{$config['s3_region']}.amazonaws.com/{$s3Key}";
            
            // Use CloudFront URL if configured
            $publicUrl = $s3Url;
            if (!empty($config['s3_cloudfront_url'])) {
                $cloudfrontUrl = rtrim($config['s3_cloudfront_url'], '/');
                $publicUrl = "{$cloudfrontUrl}/{$s3Key}";
            }

            \Log::info('S3 video upload successful', [
                'key' => $s3Key,
                'url' => $publicUrl,
                'duration' => $duration,
                'size' => $size,
                'mime' => $mimeType,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Video uploaded successfully',
                'data' => [
                    'url' => $publicUrl,
                    's3_url' => $s3Url,
                    'key' => $s3Key,
                    'filename' => $filename,
                    'original_name' => $originalName,
                    'size' => $size,
                    'mime_type' => $mimeType,
                    'duration_seconds' => $duration,
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('Video upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to upload video: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get video duration using getID3 or fallback methods
     */
    private function getVideoDuration($filePath)
    {
        try {
            // Try using getID3 if available
            if (class_exists('\getID3')) {
                $getID3 = new \getID3();
                $fileInfo = $getID3->analyze($filePath);
                if (isset($fileInfo['playtime_seconds'])) {
                    return round($fileInfo['playtime_seconds']);
                }
            }
            
            // Fallback: Try using ffprobe if available
            $command = "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($filePath);
            $output = shell_exec($command);
            
            if ($output !== null && is_numeric(trim($output))) {
                return round(floatval(trim($output)));
            }
            
            // Default fallback
            return 0;
        } catch (Exception $e) {
            \Log::warning('Failed to get video duration', ['error' => $e->getMessage()]);
            return 0;
        }
    }
}
