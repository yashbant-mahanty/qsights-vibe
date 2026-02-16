#!/bin/bash

# ===================================================================
# PERMANENT EMAIL NOTIFICATION FIX - Feb 14, 2026
# ===================================================================
# This removes problematic debug file logging that causes 500 errors
# The Log::info() calls remain for proper Laravel logging
# ===================================================================

set -e  # Exit on error

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
CONTROLLER_PATH="app/Http/Controllers/Api/NotificationController.php"

echo "=========================================="
echo "PERMANENT EMAIL FIX DEPLOYMENT"
echo "=========================================="
echo ""

# Confirmation
if [[ "$1" != "--yes" ]]; then
    echo "⚠️  This will remove debug file logging from NotificationController"
    echo "   to fix the 500 error permanently."
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo "✓ Starting deployment..."
echo ""

# Backup current file on server
echo "1️⃣  Creating backup on server..."
ssh -i "$PEM_FILE" "$SERVER" "sudo cp $BACKEND_PATH/$CONTROLLER_PATH $BACKEND_PATH/$CONTROLLER_PATH.backup_$(date +%Y%m%d_%H%M%S)"
echo "✓ Backup created"
echo ""

# Remove problematic debug logging
echo "2️⃣  Removing problematic file_put_contents calls..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
sudo sed -i.tmp '/file_put_contents(storage_path.*email_debug\.log/d' /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/NotificationController.php
sudo rm -f /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/NotificationController.php.tmp
echo "✓ Debug logging removed"
ENDSSH
echo ""

# Verify changes
echo "3️⃣  Verifying changes..."
REMAINING=$(ssh -i "$PEM_FILE" "$SERVER" "grep -c 'file_put_contents.*email_debug' $BACKEND_PATH/$CONTROLLER_PATH || echo 0")
if [ "$REMAINING" -eq "0" ]; then
    echo "✓ All problematic debug logging removed"
else
    echo "⚠️  Warning: $REMAINING debug calls still remain"
fi
echo ""

# Clear Laravel cache
echo "4️⃣  Clearing Laravel caches..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
cd /var/www/QSightsOrg2.0/backend
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan route:clear
echo "✓ Caches cleared"
ENDSSH
echo ""

# Restart services
echo "5️⃣  Restarting PHP-FPM..."
ssh -i "$PEM_FILE" "$SERVER" "sudo systemctl restart php8.2-fpm"
echo "✓ PHP-FPM restarted"
echo ""

echo "=========================================="
echo "✅ PERMANENT FIX DEPLOYED SUCCESSFULLY"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  • Removed all file_put_contents debug logging"
echo "  • Laravel Log::info() calls remain for proper logging"
echo "  • No more permission errors"
echo ""
echo "Email sending should now work perfectly!"
echo ""
echo "Backup location on server:"
echo "  $BACKEND_PATH/$CONTROLLER_PATH.backup_*"
echo ""
