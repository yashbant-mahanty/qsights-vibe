<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportSnapshot extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'report_template_id',
        'activity_id',
        'generated_by',
        'name',
        'snapshot_date',
        'data',
        'ai_insights',
        'total_responses',
        'filters_applied',
        'export_format',
        'file_path',
    ];

    protected $casts = [
        'snapshot_date' => 'datetime',
        'data' => 'array',
        'ai_insights' => 'array',
        'filters_applied' => 'array',
        'total_responses' => 'integer',
    ];

    // Relationships
    public function template()
    {
        return $this->belongsTo(ReportTemplate::class, 'report_template_id');
    }

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
