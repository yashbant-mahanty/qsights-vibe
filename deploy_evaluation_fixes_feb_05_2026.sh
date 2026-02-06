#!/bin/bash

# Deployment script for Evaluation Bug Fixes - Feb 05, 2026
# Fixes:
# 1. Scheduled email delivery for evaluations
# 2. Super Admin history tab visibility (shows all programs by default)

set -e

echo "=========================================="
echo "Deploying Evaluation Bug Fixes"
echo "Date: February 05, 2026"
echo "=========================================="

# Navigate to backend directory
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend

echo ""
echo "Step 1: Clearing Laravel caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo ""
echo "Step 2: Setting up Laravel scheduler (cron job)..."
echo "NOTE: The scheduled email sending command needs to be added to cron."
echo ""
echo "Add this line to your crontab (run: crontab -e):"
echo "* * * * * cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend && php artisan schedule:run >> /dev/null 2>&1"
echo ""
echo "Or for production server:"
echo "* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1"
echo ""

echo "Step 3: Testing scheduled evaluation command..."
php artisan evaluations:send-scheduled

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo "✓ Laravel caches cleared"
echo "✓ Scheduled email command tested"
echo "✓ Super Admin history filtering updated"
echo ""
echo "Changes made:"
echo "1. Added scheduled task in Kernel.php to send evaluation emails every 5 minutes"
echo "2. Fixed Super Admin to see all program reports by default"
echo "3. Updated all evaluation report endpoints (reports, summary, evaluators, staff)"
echo ""
echo "IMPORTANT: Don't forget to add the cron job for scheduled emails!"
echo "=========================================="
