<?php
require "backend/vendor/autoload.php";
$app = require_once "backend/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SystemSetting;

echo "Checking S3 Settings in Database...\n";
echo "====================================\n\n";

$s3Keys = [
    's3_bucket',
    's3_folder',
    's3_region',
    's3_access_key',
    's3_secret_key',
    's3_url',
    's3_cloudfront_url'
];

$settings = SystemSetting::whereIn('key', $s3Keys)->get();

echo "Found " . $settings->count() . " S3 settings in database:\n\n";

foreach ($s3Keys as $key) {
    $setting = $settings->firstWhere('key', $key);
    if ($setting) {
        $hasValue = !empty($setting->value);
        $valueLength = strlen($setting->value ?? '');
        echo "✓ $key: " . ($hasValue ? "HAS VALUE (length: $valueLength)" : "EMPTY") . "\n";
    } else {
        echo "✗ $key: NOT FOUND\n";
    }
}

echo "\n====================================\n";

// If no settings found, seed them
if ($settings->count() === 0) {
    echo "\nNo S3 settings found. Would you like to seed default values? (yes/no): ";
    $handle = fopen("php://stdin", "r");
    $line = fgets($handle);
    fclose($handle);
    
    if (trim($line) === 'yes') {
        echo "\nSeeding default S3 settings...\n";
        
        $defaultSettings = [
            [
                'key' => 's3_bucket',
                'value' => 'qsights',
                'type' => 'string',
                'description' => 'S3 bucket name for file storage',
                'is_encrypted' => false,
            ],
            [
                'key' => 's3_folder',
                'value' => 'qsightsprod',
                'type' => 'string',
                'description' => 'S3 folder/prefix for uploads',
                'is_encrypted' => false,
            ],
            [
                'key' => 's3_region',
                'value' => 'ap-southeast-1',
                'type' => 'string',
                'description' => 'AWS region where S3 bucket is located',
                'is_encrypted' => false,
            ],
            [
                'key' => 's3_access_key',
                'value' => '',
                'type' => 'string',
                'description' => 'AWS IAM access key with S3 permissions',
                'is_encrypted' => true,
            ],
            [
                'key' => 's3_secret_key',
                'value' => '',
                'type' => 'string',
                'description' => 'AWS IAM secret key',
                'is_encrypted' => true,
            ],
            [
                'key' => 's3_url',
                'value' => '',
                'type' => 'string',
                'description' => 'S3 base URL for public access',
                'is_encrypted' => false,
            ],
            [
                'key' => 's3_cloudfront_url',
                'value' => '',
                'type' => 'string',
                'description' => 'CloudFront CDN URL for better performance',
                'is_encrypted' => false,
            ],
        ];

        foreach ($defaultSettings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
            echo "✓ Created: {$setting['key']}\n";
        }
        
        echo "\n✓ S3 settings seeded successfully!\n";
    }
}

echo "\nDone!\n";
