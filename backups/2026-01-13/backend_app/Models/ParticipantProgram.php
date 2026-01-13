<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ParticipantProgram extends Pivot
{
    /**
     * The table has auto-incrementing bigint id
     */
    public $incrementing = true;
    protected $keyType = 'int';
    
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'participant_id',
        'program_id',
        'assigned_at',
    ];
}
