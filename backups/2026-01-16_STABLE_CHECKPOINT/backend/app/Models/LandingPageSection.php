<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandingPageSection extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'landing_page_id',
        'section_type',
        'title',
        'subtitle',
        'content',
        'images',
        'settings',
        'sort_order',
    ];

    protected $casts = [
        'id' => 'string',
        'images' => 'array',
        'settings' => 'array',
    ];

    public function landingPage()
    {
        return $this->belongsTo(LandingPage::class);
    }
}
