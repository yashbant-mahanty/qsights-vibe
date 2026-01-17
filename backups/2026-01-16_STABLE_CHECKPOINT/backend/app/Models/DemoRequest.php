<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DemoRequest extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'country',
        'city',
        'message',
        'status',
        'contacted_at',
    ];

    protected $casts = [
        'id' => 'string',
        'contacted_at' => 'datetime',
    ];
}
