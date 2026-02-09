<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluationNotificationConfig extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'program_id',
        'enable_trigger_notifications',
        'enable_completion_notifications',
        'enable_missed_deadline_alerts',
        'enable_automatic_reminders',
        'reminder_schedule',
        'trigger_email_template',
        'completion_email_template',
        'missed_deadline_template',
        'reminder_email_template',
    ];

    protected $casts = [
        'enable_trigger_notifications' => 'boolean',
        'enable_completion_notifications' => 'boolean',
        'enable_missed_deadline_alerts' => 'boolean',
        'enable_automatic_reminders' => 'boolean',
        'reminder_schedule' => 'array',
    ];

    /**
     * Get the program that owns the configuration.
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get default reminder schedule if not set
     */
    public function getReminderScheduleAttribute($value)
    {
        if ($value) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [7, 3, 1];
        }
        return [7, 3, 1]; // Default: 7 days, 3 days, 1 day before deadline
    }

    /**
     * Get or create configuration for a program
     */
    public static function getForProgram($programId)
    {
        return static::firstOrCreate(
            ['program_id' => $programId],
            [
                'enable_trigger_notifications' => true,
                'enable_completion_notifications' => true,
                'enable_missed_deadline_alerts' => true,
                'enable_automatic_reminders' => true,
                'reminder_schedule' => [7, 3, 1],
            ]
        );
    }
}
