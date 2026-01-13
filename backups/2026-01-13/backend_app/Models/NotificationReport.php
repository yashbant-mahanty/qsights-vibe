<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationReport extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'activity_id',
        'template_type',
        'total_recipients',
        'sent_count',
        'failed_count',
        'failed_emails',
        'error_details',
    ];

    protected $casts = [
        'failed_emails' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }
}
