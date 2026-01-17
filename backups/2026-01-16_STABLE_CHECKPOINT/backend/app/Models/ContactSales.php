<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactSales extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'contact_sales';

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'company_size',
        'role',
        'interest',
        'message',
        'status',
        'contacted_at',
    ];

    protected $casts = [
        'id' => 'string',
        'contacted_at' => 'datetime',
    ];
}
