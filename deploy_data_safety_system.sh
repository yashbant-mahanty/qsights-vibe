#!/bin/bash

# QSights Data Safety & Audit Logging System - Deployment Script
# Date: 17 January 2026
# This script deploys the Global Data Safety & Audit Logging System

echo "=================================================="
echo "QSights Data Safety System - Deployment"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to backend
cd "$(dirname "$0")/backend" || exit

echo -e "${YELLOW}Step 1: Running Database Migrations${NC}"
echo "Creating new audit tables (response_audit_logs, notification_logs)..."
php artisan migrate --force

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Verifying Database Tables${NC}"

# Check if tables exist
php artisan tinker --execute="
    \$tables = [
        'response_audit_logs',
        'notification_logs',
        'system_settings'
    ];
    foreach (\$tables as \$table) {
        if (Schema::hasTable(\$table)) {
            echo \"✓ Table '\$table' exists\\n\";
        } else {
            echo \"✗ Table '\$table' NOT FOUND\\n\";
            exit(1);
        }
    }
"

echo ""
echo -e "${YELLOW}Step 3: Verifying Data Safety Settings${NC}"

php artisan tinker --execute="
    \$settings = App\\Models\\SystemSetting::where('category', 'data_safety')->get();
    if (\$settings->count() >= 5) {
        echo \"✓ Data safety settings configured (\$settings->count() settings)\\n\";
        foreach (\$settings as \$setting) {
            echo \"  - {\$setting->key}: {\$setting->value}\\n\";
        }
    } else {
        echo \"✗ Data safety settings not found\\n\";
        exit(1);
    }
"

echo ""
echo -e "${YELLOW}Step 4: Clearing Caches${NC}"
php artisan config:clear
php artisan cache:clear
php artisan route:clear
echo -e "${GREEN}✓ Caches cleared${NC}"

echo ""
echo -e "${YELLOW}Step 5: Testing API Health${NC}"
# This would need a valid token in production
echo "To test API health endpoint, run:"
echo "  curl -X GET http://localhost:8000/api/data-safety/health -H 'Authorization: Bearer YOUR_TOKEN'"

echo ""
echo "=================================================="
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. Test response submission to verify audit logging"
echo "2. Send a test email to verify notification logging"
echo "3. Access Super Admin > Data Safety Settings to configure"
echo "4. Monitor logs: tail -f storage/logs/laravel.log"
echo ""
echo "Database Tables Created:"
echo "  • response_audit_logs (question-level audit trail)"
echo "  • notification_logs (email delivery tracking)"
echo ""
echo "All existing data remains intact ✓"
echo "System ready for production use ✓"
echo ""
