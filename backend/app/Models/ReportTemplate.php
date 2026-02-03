<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportTemplate extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'activity_id',
        'program_id',
        'organization_id',
        'created_by',
        'name',
        'description',
        'type',
        'config',
        'filters',
        'ai_insights_config',
        'is_public',
        'is_default',
        'usage_count',
    ];

    protected $casts = [
        'config' => 'array',
        'filters' => 'array',
        'ai_insights_config' => 'array',
        'is_public' => 'boolean',
        'is_default' => 'boolean',
        'usage_count' => 'integer',
    ];

    // Relationships
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function snapshots()
    {
        return $this->hasMany(ReportSnapshot::class);
    }

    // Helper methods
    public function incrementUsage()
    {
        $this->increment('usage_count');
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeForActivity($query, $activityId)
    {
        return $query->where('activity_id', $activityId);
    }
}
