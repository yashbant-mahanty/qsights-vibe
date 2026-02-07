<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CmsContent extends Model
{
    protected $table = 'cms_content';
    protected $keyType = 'string';
    public $incrementing = false;
    
    protected $fillable = [
        'page_key',
        'title',
        'description',
        'content',
        'form_fields',
        'messages',
        'cta_text',
        'cta_link',
        'last_updated_date',
        'is_active',
    ];

    protected $casts = [
        'form_fields' => 'array',
        'messages' => 'array',
        'last_updated_date' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
