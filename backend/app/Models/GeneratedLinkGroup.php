<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneratedLinkGroup extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'activity_id',
        'name',
        'description',
        'total_links',
        'used_links',
    ];

    protected $casts = [
        'total_links' => 'integer',
        'used_links' => 'integer',
    ];

    /**
     * Relationships
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function links()
    {
        return $this->hasMany(GeneratedEventLink::class, 'group_id');
    }

    /**
     * Get percentage of used links
     */
    public function getUsagePercentageAttribute()
    {
        if ($this->total_links === 0) {
            return 0;
        }
        return round(($this->used_links / $this->total_links) * 100, 2);
    }

    /**
     * Get remaining links count
     */
    public function getRemainingLinksAttribute()
    {
        return $this->total_links - $this->used_links;
    }

    /**
     * Increment used links counter
     */
    public function incrementUsedLinks()
    {
        $this->increment('used_links');
    }
}
