<?php

/**
 * File System Cleanup Script - Remove Unused Files
 * 
 * This script identifies and removes unused test files, temporary files,
 * and other unnecessary files from the backend
 * 
 * Date: February 5, 2026
 */

require __DIR__.'/vendor/autoload.php';

class FileSystemCleanup
{
    private $dryRun = true;
    private $results = [];
    private $backendPath;

    public function __construct($dryRun = true)
    {
        $this->dryRun = $dryRun;
        $this->backendPath = __DIR__;
    }

    public function run()
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "FILE SYSTEM CLEANUP SCRIPT\n";
        echo str_repeat("=", 80) . "\n";
        echo "Mode: " . ($this->dryRun ? "DRY RUN (no files will be deleted)" : "LIVE MODE (files will be permanently deleted)") . "\n";
        echo "Date: " . date('Y-m-d H:i:s') . "\n";
        echo str_repeat("=", 80) . "\n\n";

        // Categories of files to clean
        $this->cleanupTestScripts();
        $this->cleanupTemporaryFiles();
        $this->cleanupOldBackups();

        $this->printSummary();
    }

    private function cleanupTestScripts()
    {
        echo "🔍 Scanning for test scripts...\n";

        $testFiles = [
            'test_notification_token.php',
            'test_subscription_metrics.php',
            'test_cascade_deletes.php',
            'test_links_simple.php',
            'send_test_email.php',
            'check_domain_auth.php',
            'check_event_data.php',
            'check_eval_programs.php',
            'check_recipient_emails.php',
            'check_sendgrid_sender.php',
            'compare_dial_settings.php',
        ];

        foreach ($testFiles as $file) {
            $filePath = $this->backendPath . '/' . $file;
            if (file_exists($filePath)) {
                $size = filesize($filePath);
                echo "   Found: {$file} (" . $this->formatBytes($size) . ")\n";
                
                $this->results['test_scripts'][] = [
                    'file' => $file,
                    'size' => $size,
                    'path' => $filePath
                ];

                if (!$this->dryRun) {
                    unlink($filePath);
                    echo "   ✅ Deleted\n";
                }
            }
        }
        echo "\n";
    }

    private function cleanupTemporaryFiles()
    {
        echo "🔍 Scanning for temporary files...\n";

        // Look for common temporary file patterns
        $patterns = [
            '*.tmp',
            '*.log',
            '*.backup',
            '*~',
            '.DS_Store',
        ];

        $tempFiles = [];
        foreach ($patterns as $pattern) {
            $files = glob($this->backendPath . '/' . $pattern);
            foreach ($files as $file) {
                if (is_file($file)) {
                    $tempFiles[] = $file;
                }
            }
        }

        foreach ($tempFiles as $file) {
            $fileName = basename($file);
            $size = filesize($file);
            echo "   Found: {$fileName} (" . $this->formatBytes($size) . ")\n";
            
            $this->results['temp_files'][] = [
                'file' => $fileName,
                'size' => $size,
                'path' => $file
            ];

            if (!$this->dryRun) {
                unlink($file);
                echo "   ✅ Deleted\n";
            }
        }

        if (empty($tempFiles)) {
            echo "   ✅ No temporary files found\n";
        }
        echo "\n";
    }

    private function cleanupOldBackups()
    {
        echo "🔍 Scanning for old backup files...\n";

        $backupFiles = glob($this->backendPath . '/*.backup_*');
        
        foreach ($backupFiles as $file) {
            if (is_file($file)) {
                $fileName = basename($file);
                $size = filesize($file);
                $mtime = filemtime($file);
                $age = (time() - $mtime) / 86400; // days
                
                // Only flag backups older than 30 days
                if ($age > 30) {
                    echo "   Found: {$fileName} (" . $this->formatBytes($size) . ", {$age} days old)\n";
                    
                    $this->results['old_backups'][] = [
                        'file' => $fileName,
                        'size' => $size,
                        'path' => $file,
                        'age_days' => round($age, 1)
                    ];

                    if (!$this->dryRun) {
                        unlink($file);
                        echo "   ✅ Deleted\n";
                    }
                }
            }
        }

        if (empty($this->results['old_backups'])) {
            echo "   ✅ No old backup files found\n";
        }
        echo "\n";
    }

    private function formatBytes($bytes)
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    private function printSummary()
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "FILE CLEANUP SUMMARY\n";
        echo str_repeat("=", 80) . "\n\n";

        $totalFiles = 0;
        $totalSize = 0;

        foreach ($this->results as $category => $files) {
            if (!empty($files)) {
                $count = count($files);
                $size = array_sum(array_column($files, 'size'));
                $totalFiles += $count;
                $totalSize += $size;

                echo ucwords(str_replace('_', ' ', $category)) . ": {$count} files (" . $this->formatBytes($size) . ")\n";
            }
        }

        echo "\nTotal files found: {$totalFiles} (" . $this->formatBytes($totalSize) . ")\n";
        
        if (!$this->dryRun) {
            echo "Total files deleted: {$totalFiles}\n";
        } else {
            echo "Mode: DRY RUN - No files were deleted\n";
            echo "\nTo permanently delete these files, run:\n";
            echo "php cleanup_unused_files.php --live\n";
        }

        echo "\n" . str_repeat("=", 80) . "\n";
    }
}

// Parse command line arguments
$dryRun = true;
if (isset($argv[1]) && $argv[1] === '--live') {
    echo "\n⚠️  WARNING: Running in LIVE MODE\n";
    echo "This will PERMANENTLY delete unused files.\n";
    echo "Press Ctrl+C to cancel or wait 5 seconds to continue...\n\n";
    sleep(5);
    $dryRun = false;
}

$cleanup = new FileSystemCleanup($dryRun);
$cleanup->run();

echo "\nFile cleanup completed at " . date('Y-m-d H:i:s') . "\n\n";
