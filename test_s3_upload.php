<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SystemSetting;
use Aws\S3\S3Client;

$settings = SystemSetting::whereIn("key", [
    "s3_bucket", "s3_folder", "s3_region", "s3_access_key", "s3_secret_key", "s3_url"
])->pluck("value", "key")->toArray();

echo "Testing S3 Upload...\n";
echo "Bucket: " . $settings["s3_bucket"] . "\n";
echo "Folder: " . $settings["s3_folder"] . "\n";
echo "Region: " . $settings["s3_region"] . "\n";

try {
    $s3Client = new S3Client([
        "region" => $settings["s3_region"],
        "version" => "latest",
        "credentials" => [
            "key" => $settings["s3_access_key"],
            "secret" => $settings["s3_secret_key"],
        ],
    ]);

    // Create a test image (simple 1x1 red PNG)
    $testContent = base64_decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
    
    $folder = $settings["s3_folder"] ?? "";
    $timestamp = date("Ymd_His");
    $s3Key = $folder ? $folder . "/test-uploads/" . $timestamp . "_test.png" : "test-uploads/" . $timestamp . "_test.png";
    
    echo "Uploading to: s3://" . $settings["s3_bucket"] . "/" . $s3Key . "\n";

    // Upload without ACL since bucket doesn't support ACLs
    $result = $s3Client->putObject([
        "Bucket" => $settings["s3_bucket"],
        "Key" => $s3Key,
        "Body" => $testContent,
        "ContentType" => "image/png",
    ]);

    $url = "https://" . $settings["s3_bucket"] . ".s3." . $settings["s3_region"] . ".amazonaws.com/" . $s3Key;
    
    echo "\n=== SUCCESS ===\n";
    echo "Image uploaded successfully!\n";
    echo "URL: " . $url . "\n";
    
} catch (Exception $e) {
    echo "\n=== ERROR ===\n";
    echo $e->getMessage() . "\n";
}
