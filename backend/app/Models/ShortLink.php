<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ShortLink extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'activity_id',
        'link_type',
        'slug',
        'original_url',
        'created_by',
        'is_active',
        'click_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'click_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Reserved slugs that cannot be used
     */
    public static $reservedSlugs = [
        'admin', 'login', 'logout', 'api', 'dashboard', 'register',
        'signup', 'signin', 'auth', 'oauth', 'settings', 'profile',
        'account', 'help', 'support', 'terms', 'privacy', 'about',
        'contact', 'home', 'index', 'app', 'apps', 'user', 'users',
        'event', 'events', 'activity', 'activities', 'survey', 'surveys',
        'poll', 'polls', 'questionnaire', 'questionnaires', 'program',
        'programs', 'organization', 'organizations', 'org', 'e', 's',
    ];

    /**
     * Relationships
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Generate a random slug
     */
    public static function generateRandomSlug(): string
    {
        do {
            $slug = 'qs-' . Str::lower(Str::random(6));
        } while (self::where('slug', $slug)->exists());

        return $slug;
    }

    /**
     * Check if a slug is valid
     */
    public static function isValidSlug(string $slug): bool
    {
        // Must be lowercase alphanumeric with hyphens only
        if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
            return false;
        }

        // Cannot start or end with hyphen
        if (Str::startsWith($slug, '-') || Str::endsWith($slug, '-')) {
            return false;
        }

        // Cannot have consecutive hyphens
        if (strpos($slug, '--') !== false) {
            return false;
        }

        // Cannot be a reserved slug
        if (in_array(strtolower($slug), self::$reservedSlugs)) {
            return false;
        }

        return true;
    }

    /**
     * Check if slug is available
     */
    public static function isSlugAvailable(string $slug, ?string $excludeId = null): bool
    {
        $query = self::where('slug', strtolower($slug));
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return !$query->exists();
    }

    /**
     * Sanitize a slug input
     */
    public static function sanitizeSlug(string $input): string
    {
        // Convert to lowercase
        $slug = strtolower($input);
        
        // Replace spaces with hyphens
        $slug = str_replace(' ', '-', $slug);
        
        // Remove invalid characters
        $slug = preg_replace('/[^a-z0-9-]/', '', $slug);
        
        // Remove consecutive hyphens
        $slug = preg_replace('/-+/', '-', $slug);
        
        // Trim hyphens from start and end
        $slug = trim($slug, '-');
        
        // Limit length (50 total for base URL + slug, base is ~23 chars)
        $maxSlugLength = 24; // 50 - 26 (https://prod.qsights.com/e/)
        if (strlen($slug) > $maxSlugLength) {
            $slug = substr($slug, 0, $maxSlugLength);
            $slug = rtrim($slug, '-'); // Clean up trailing hyphen if truncated
        }

        return $slug;
    }

    /**
     * Generate slug from event name
     */
    public static function generateSlugFromName(string $name): string
    {
        $slug = self::sanitizeSlug($name);
        
        // If slug already exists, append a number
        if (!self::isSlugAvailable($slug)) {
            $baseSlug = $slug;
            $counter = 1;
            do {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            } while (!self::isSlugAvailable($slug) && $counter < 100);
        }

        return $slug;
    }

    /**
     * Increment click count
     */
    public function incrementClickCount(): void
    {
        $this->increment('click_count');
    }
}
