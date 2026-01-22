#!/bin/bash

# CRITICAL SECURITY FIX DEPLOYMENT
# Deploy Program Scoping Middleware to Production
# v2026.01.22d - Fixes data privacy violation

set -e

echo "🚨 DEPLOYING CRITICAL SECURITY FIX v2026.01.22d"
echo "================================================"

# Transfer middleware file
echo "📦 Copying middleware to server..."
scp backend/app/Http/Middleware/EnforceProgramScoping.php ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/app/Http/Middleware/

# Transfer Kernel.php
echo "📦 Copying Kernel.php to server..."
scp backend/app/Http/Kernel.php ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/app/Http/

# Transfer api.php routes
echo "📦 Copying routes to server..."
scp backend/routes/api.php ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/routes/

# Clear caches
echo "🔄 Clearing Laravel caches..."
ssh ubuntu@13.126.210.220 "cd /var/www/QSightsOrg2.0/backend && php artisan config:clear && php artisan route:clear && php artisan cache:clear"

echo "✅ CRITICAL SECURITY FIX DEPLOYED"
echo "=================================="
echo ""
echo "Program Moderators can now ONLY see their program's data"
echo "All Program-scoped routes are now protected with program.scope middleware"
echo ""
echo "Please test immediately with a Program Moderator account"
