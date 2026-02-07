#!/bin/bash

# Quick API Test - Test notification template endpoints

echo "Testing Notification Template API"
echo "===================================="
echo ""

# Check if server is running
echo "1. Checking if backend is running..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/up)

if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "302" ]; then
    echo "✓ Backend is running on port 8000"
else
    echo "✗ Backend is NOT running (HTTP $HEALTH_CHECK)"
    echo "  Please start with: php artisan serve"
    exit 1
fi

echo ""
echo "2. Testing notification template placeholders endpoint (no auth needed for metadata)..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/notification-templates/placeholders)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Placeholders endpoint works: HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "ℹ Placeholders endpoint requires auth: HTTP $HTTP_CODE"
else
    echo "✗ Placeholders endpoint error: HTTP $HTTP_CODE"
fi

echo ""
echo "3. Testing notification types endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/notification-templates/types)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Types endpoint works: HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "ℹ Types endpoint requires auth: HTTP $HTTP_CODE"
else
    echo "✗ Types endpoint error: HTTP $HTTP_CODE"
fi

echo ""
echo "===================================="
echo "Basic API test complete!"
echo ""
echo "To test with authentication:"
echo "1. Get your token from browser localStorage"
echo "2. Run: TOKEN=your_token ACTIVITY_ID=your_id bash test_template_crud.sh"
