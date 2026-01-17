<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandingPage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'slug',
        'title',
        'content',
        'meta_data',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'id' => 'string',
        'content' => 'array',
        'meta_data' => 'array',
        'is_active' => 'boolean',
    ];

    public function sections()
    {
        return $this->hasMany(LandingPageSection::class)->orderBy('sort_order');
    }
}
