#!/bin/bash

# Test Activity Links API Endpoint
# This script tests the new /api/activities/{id}/links endpoint

echo "🧪 Testing Activity Links API"
echo "=============================="
echo ""

# Configuration
API_URL="http://localhost:8000/api"
TOKEN="YOUR_TOKEN_HERE"  # Replace with actual token

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if token is set
if [ "$TOKEN" = "YOUR_TOKEN_HERE" ]; then
    echo -e "${YELLOW}⚠️  Please set your authentication token in this script${NC}"
    echo ""
    echo "To get your token:"
    echo "1. Login to the application"
    echo "2. Open browser console (F12)"
    echo "3. Run: document.cookie.split('; ').find(row => row.startsWith('backendToken='))?.split('=')[1]"
    echo "4. Replace TOKEN variable in this script with the token value"
    echo ""
    exit 1
fi

# Get first activity ID from database
echo "📋 Step 1: Getting first activity ID..."
ACTIVITY_ID=$(php artisan tinker --execute="echo App\Models\Activity::first()->id ?? 'none';")

if [ "$ACTIVITY_ID" = "none" ] || [ -z "$ACTIVITY_ID" ]; then
    echo -e "${RED}❌ No activities found in database${NC}"
    echo ""
    echo "Create an activity first:"
    echo "  php artisan tinker"
    echo "  >>> \$activity = App\Models\Activity::first();"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Found activity: $ACTIVITY_ID${NC}"
echo ""

# Test the API endpoint
echo "🔗 Step 2: Testing GET /api/activities/{id}/links..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$API_URL/activities/$ACTIVITY_ID/links")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Response Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS - API returned 200 OK${NC}"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    
    # Extract and display each link
    echo "📎 Activity Links:"
    echo ""
    
    echo "1. Registration Link:"
    echo "   $(echo "$BODY" | jq -r '.links.registration.url' 2>/dev/null)"
    echo "   $(echo "$BODY" | jq -r '.links.registration.description' 2>/dev/null)"
    echo ""
    
    echo "2. Direct Link:"
    echo "   $(echo "$BODY" | jq -r '.links.direct.url' 2>/dev/null)"
    echo "   $(echo "$BODY" | jq -r '.links.direct.description' 2>/dev/null)"
    echo ""
    
    echo "3. Anonymous Link:"
    echo "   $(echo "$BODY" | jq -r '.links.anonymous.url' 2>/dev/null)"
    echo "   $(echo "$BODY" | jq -r '.links.anonymous.description' 2>/dev/null)"
    echo ""
    
    echo -e "${GREEN}✅ All tests passed!${NC}"
    
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}❌ UNAUTHORIZED - Invalid or missing token${NC}"
    echo ""
    echo "Please update the TOKEN variable with a valid authentication token"
    
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ NOT FOUND - Activity does not exist${NC}"
    echo ""
    echo "Activity ID: $ACTIVITY_ID"
    
else
    echo -e "${RED}❌ FAILED - Unexpected response code${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "=============================="
echo "Test complete"
