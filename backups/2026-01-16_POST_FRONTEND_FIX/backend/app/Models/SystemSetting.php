<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SystemSetting extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
        'is_encrypted',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($setting) {
            // Encrypt sensitive values
            if ($setting->is_encrypted || str_contains($setting->key, 'api_key') || str_contains($setting->key, 'password')) {
                if (!empty($setting->value) && !str_starts_with($setting->value, 'encrypted:')) {
                    $setting->value = 'encrypted:' . encrypt($setting->value);
                }
            }
        });
    }

    /**
     * Get decrypted value
     */
    public function getDecryptedValueAttribute()
    {
        if (str_starts_with($this->value, 'encrypted:')) {
            return decrypt(substr($this->value, 10));
        }
        
        return $this->value;
    }

    /**
     * Get a setting value by key
     */
    public static function getValue($key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        
        if (!$setting) {
            return $default;
        }

        return $setting->decrypted_value;
    }

    /**
     * Set a setting value by key
     */
    public static function setValue($key, $value, $description = null, $encrypted = false)
    {
        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'description' => $description,
                'is_encrypted' => $encrypted,
            ]
        );
    }
}