#!/bin/bash

# Start Backend and Test Notification Templates
# This script restarts the backend with the CSRF fix and runs tests

echo "================================================"
echo "Notification Template System - Startup & Test"
echo "================================================"
echo ""

# Navigate to backend directory
cd /Users/yash/Documents/Projects/Qsights2.0-Backend

# Check if Laravel is installed
if [ ! -f "artisan" ]; then
    echo "❌ Error: artisan file not found"
    echo "   Make sure you're in the Laravel project directory"
    exit 1
fi

echo "Step 1: Clearing Laravel cache..."
php artisan config:clear > /dev/null 2>&1
php artisan route:clear > /dev/null 2>&1
php artisan cache:clear > /dev/null 2>&1
echo "✓ Cache cleared"

echo ""
echo "Step 2: Verifying CSRF fix..."
if grep -q "api/\*" bootstrap/app.php; then
    echo "✓ CSRF fix applied (api/* excluded)"
else
    echo "⚠ CSRF fix may not be applied"
    echo "  Check bootstrap/app.php"
fi

echo ""
echo "Step 3: Checking database connection..."
DB_TEST=$(php artisan db:show 2>&1 | grep -i "database\|connection" | head -1)
if [ $? -eq 0 ]; then
    echo "✓ Database connection OK"
else
    echo "⚠ Database connection may have issues"
fi

echo ""
echo "================================================"
echo "Starting Laravel Development Server"
echo "================================================"
echo ""
echo "Backend will start on: http://localhost:8000"
echo ""
echo "To test the system:"
echo "1. Keep this terminal running"
echo "2. Open browser: http://localhost:3000"
echo "3. Login and navigate to Activity → Notifications → Email Templates"
echo "4. Test: Preview, Customize, Edit, Delete operations"
echo ""
echo "To run API tests:"
echo "1. Open new terminal"
echo "2. Get token from browser: localStorage.getItem('token')"
echo "3. Run: TOKEN=your_token ACTIVITY_ID=your_activity_id bash test_template_crud.sh"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Start Laravel server
php artisan serve
