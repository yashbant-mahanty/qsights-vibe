<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Question extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'section_id',
        'parent_question_id',
        'parent_option_value',
        'nesting_level',
        'type',
        'title',
        'description',
        'is_rich_text',
        'formatted_title',
        'formatted_description',
        'options',
        'validations',
        'conditional_logic',
        'settings',
        'translations',
        'is_required',
        'is_comment_enabled',
        'order',
        // Video-specific fields
        'video_url',
        'video_thumbnail_url',
        'video_duration_seconds',
        'is_mandatory_watch',
        'video_play_mode',
    ];

    protected $casts = [
        'options' => 'array',
        'validations' => 'array',
        'conditional_logic' => 'array',
        'settings' => 'array',
        'translations' => 'array',
        'is_required' => 'boolean',
        'is_comment_enabled' => 'boolean',
        'is_rich_text' => 'boolean',
        'order' => 'integer',
        'nesting_level' => 'integer',
        // Video-specific casts
        'is_mandatory_watch' => 'boolean',
        'video_duration_seconds' => 'integer',
    ];
    
    protected $appends = [];

    /**
     * Set the settings attribute. Convert empty arrays to empty objects for JSON storage.
     */
    public function setSettingsAttribute($value)
    {
        // If settings is an empty array, convert to empty object for proper JSON storage
        if (is_array($value) && empty($value)) {
            $this->attributes['settings'] = json_encode((object)[]);
        } else {
            $this->attributes['settings'] = json_encode($value);
        }
    }

    /**
     * Get the section that owns the question
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get the parent question (for nested/conditional questions)
     */
    public function parentQuestion()
    {
        return $this->belongsTo(Question::class, 'parent_question_id');
    }

    /**
     * Get child questions (nested follow-ups)
     */
    public function childQuestions()
    {
        return $this->hasMany(Question::class, 'parent_question_id')->orderBy('order');
    }

    /**
     * Get references for this question
     */
    public function references()
    {
        return $this->hasMany(QuestionReference::class)->orderBy('order_index');
    }

    /**
     * Get references to display after question text
     */
    public function referencesAfterQuestion()
    {
        return $this->references()->where('display_position', 'AFTER_QUESTION');
    }

    /**
     * Get references to display after answer options
     */
    public function referencesAfterAnswer()
    {
        return $this->references()->where('display_position', 'AFTER_ANSWER');
    }

    /**
     * Scope to filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get only required questions
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope to get root-level questions (no parent)
     */
    public function scopeRootLevel($query)
    {
        return $query->whereNull('parent_question_id');
    }

    /**
     * Scope to get nested questions
     */
    public function scopeNested($query)
    {
        return $query->whereNotNull('parent_question_id');
    }

    /**
     * Check if this is an information block
     */
    public function isInformationBlock()
    {
        return $this->type === 'information';
    }

    /**
     * Check if this question has conditional children
     */
    public function hasConditionalChildren()
    {
        return $this->childQuestions()->exists();
    }

    /**
     * Get all nested questions recursively
     */
    public function getAllNestedQuestions()
    {
        $children = $this->childQuestions;
        foreach ($children as $child) {
            $children = $children->merge($child->getAllNestedQuestions());
        }
        return $children;
    }

    /**
     * Get settings attribute with presigned URLs for S3 images
     */
    public function getSettingsAttribute($value)
    {
        // Decode JSON if it's a string
        $settings = is_string($value) ? json_decode($value, true) : $value;
        $settings = $settings ?? [];
        
        // Convert S3 URLs to presigned URLs in customImages
        if (isset($settings['customImages']) && is_array($settings['customImages'])) {
            foreach ($settings['customImages'] as $key => $url) {
                // Handle sequenceImages array
                if ($key === 'sequenceImages' && is_array($url)) {
                    foreach ($url as $index => $imageUrl) {
                        if ($imageUrl && is_string($imageUrl) && $this->isS3Url($imageUrl)) {
                            $presignedUrl = $this->getPresignedUrl($imageUrl);
                            \Log::info('Converting sequence image to presigned', [
                                'index' => $index,
                                'original' => $imageUrl,
                                'presigned' => substr($presignedUrl, 0, 100)
                            ]);
                            $settings['customImages']['sequenceImages'][$index] = $presignedUrl;
                        }
                    }
                } else if ($url && is_string($url) && $this->isS3Url($url)) {
                    // Handle single image URLs (thumbUrl, trackUrl, etc.)
                    $presignedUrl = $this->getPresignedUrl($url);
                    \Log::info('Converting S3 URL to presigned', [
                        'original' => $url,
                        'presigned' => substr($presignedUrl, 0, 100)
                    ]);
                    $settings['customImages'][$key] = $presignedUrl;
                }
            }
        }
        
        // Convert S3 URLs to presigned URLs for drag & drop items
        if (isset($settings['items']) && is_array($settings['items'])) {
            foreach ($settings['items'] as $index => $item) {
                if (isset($item['imageUrl']) && is_string($item['imageUrl']) && $this->isS3Url($item['imageUrl'])) {
                    $presignedUrl = $this->getPresignedUrl($item['imageUrl']);
                    \Log::info('Converting drag-drop item image to presigned', [
                        'index' => $index,
                        'original' => $item['imageUrl'],
                        'presigned' => substr($presignedUrl, 0, 100)
                    ]);
                    $settings['items'][$index]['imageUrl'] = $presignedUrl;
                }
            }
        }
        
        // Convert S3 URLs to presigned URLs for drag & drop buckets
        if (isset($settings['buckets']) && is_array($settings['buckets'])) {
            foreach ($settings['buckets'] as $index => $bucket) {
                if (isset($bucket['imageUrl']) && is_string($bucket['imageUrl']) && $this->isS3Url($bucket['imageUrl'])) {
                    $presignedUrl = $this->getPresignedUrl($bucket['imageUrl']);
                    \Log::info('Converting drag-drop bucket image to presigned', [
                        'index' => $index,
                        'original' => $bucket['imageUrl'],
                        'presigned' => substr($presignedUrl, 0, 100)
                    ]);
                    $settings['buckets'][$index]['imageUrl'] = $presignedUrl;
                }
            }
        }
        
        return $settings;
    }

    /**
     * Check if URL is an S3 URL that needs presigned URL (our qsights bucket only)
     */
    private function isS3Url($url)
    {
        // Only process URLs from our qsights bucket, not external public buckets
        return (strpos($url, '.s3.') !== false || strpos($url, '.s3-') !== false) 
            && strpos($url, 'qsights') !== false;
    }

    /**
     * Generate presigned URL for S3 object
     */
    private function getPresignedUrl($s3Url)
    {
        try {
            // Get S3 config from system settings
            $settings = SystemSetting::whereIn('key', [
                's3_bucket',
                's3_region',
                's3_access_key',
                's3_secret_key',
            ])->get();
            
            $config = [];
            foreach ($settings as $setting) {
                $config[$setting->key] = $setting->decrypted_value ?? $setting->value;
            }
            
            if (empty($config['s3_access_key']) || empty($config['s3_secret_key'])) {
                \Log::warning('S3 credentials not configured, returning original URL');
                return $s3Url;
            }

            // Strip any existing query parameters from URL before parsing
            // This prevents double-signing already-signed URLs
            $baseUrl = strtok($s3Url, '?');
            
            // Extract bucket and key from URL
            // URL format: https://bucket.s3.region.amazonaws.com/key or https://bucket.s3-region.amazonaws.com/key
            $pattern = '/https?:\/\/([^.]+)\.s3[.-]([^.]+)\.amazonaws\.com\/(.+)/';
            if (!preg_match($pattern, $baseUrl, $matches)) {
                \Log::warning('URL does not match S3 pattern', ['url' => $baseUrl]);
                return $s3Url;
            }

            $bucket = $matches[1];
            $key = urldecode($matches[3]);

            $s3Client = new \Aws\S3\S3Client([
                'version' => 'latest',
                'region' => $config['s3_region'] ?? 'ap-south-1',
                'credentials' => [
                    'key' => $config['s3_access_key'],
                    'secret' => $config['s3_secret_key'],
                ],
            ]);

            $cmd = $s3Client->getCommand('GetObject', [
                'Bucket' => $bucket,
                'Key' => $key,
            ]);

            $presignedRequest = $s3Client->createPresignedRequest($cmd, '+1 hour');
            return (string) $presignedRequest->getUri();
        } catch (\Exception $e) {
            \Log::error('Failed to generate presigned URL for question image', [
                'url' => $s3Url,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $s3Url;
        }
    }
}
