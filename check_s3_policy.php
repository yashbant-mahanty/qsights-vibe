<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SystemSetting;
use Aws\S3\S3Client;

$settings = SystemSetting::whereIn("key", [
    "s3_bucket", "s3_folder", "s3_region", "s3_access_key", "s3_secret_key"
])->pluck("value", "key")->toArray();

try {
    $s3Client = new S3Client([
        "region" => $settings["s3_region"],
        "version" => "latest",
        "credentials" => [
            "key" => $settings["s3_access_key"],
            "secret" => $settings["s3_secret_key"],
        ],
    ]);

    // Check bucket policy
    try {
        $result = $s3Client->getBucketPolicy([
            "Bucket" => $settings["s3_bucket"]
        ]);
        echo "Current bucket policy:\n";
        echo $result["Policy"] . "\n";
    } catch (Exception $e) {
        echo "No bucket policy found or error: " . $e->getMessage() . "\n";
    }

    // Check Block Public Access settings
    try {
        $result = $s3Client->getPublicAccessBlock([
            "Bucket" => $settings["s3_bucket"]
        ]);
        echo "\nPublic Access Block settings:\n";
        print_r($result["PublicAccessBlockConfiguration"]);
    } catch (Exception $e) {
        echo "Error checking public access block: " . $e->getMessage() . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
