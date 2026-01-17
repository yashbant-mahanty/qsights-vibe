#!/bin/bash

# Activity Participants & Notifications - Quick Test Script
# Run this to verify everything is working

echo "========================================="
echo "Testing Activity Participants Module"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if servers are running
echo "1. Checking if servers are running..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ Frontend server running on port 3000${NC}"
else
    echo -e "${RED}✗ Frontend server NOT running on port 3000${NC}"
    echo "   Start it with: cd /Users/yash/Documents/Projects/Qsights2.0 && npm run dev"
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ Backend server running on port 8000${NC}"
else
    echo -e "${RED}✗ Backend server NOT running on port 8000${NC}"
    echo "   Start it with: cd /Users/yash/Documents/Projects/Qsights2.0-Backend && php artisan serve"
fi

echo ""
echo "2. Checking component file..."
if [ -f "/Users/yash/Documents/Projects/Qsights2.0/src/components/notifications/ActivityParticipantsAndNotifications.jsx" ]; then
    echo -e "${GREEN}✓ Component file exists${NC}"
    LINES=$(wc -l < "/Users/yash/Documents/Projects/Qsights2.0/src/components/notifications/ActivityParticipantsAndNotifications.jsx" | xargs)
    echo "   File size: $LINES lines"
else
    echo -e "${RED}✗ Component file NOT found${NC}"
fi

echo ""
echo "3. Opening authentication debug tool..."
if [ -f "test_auth_debug.html" ]; then
    echo -e "${GREEN}✓ Debug tool found${NC}"
    echo "   Opening in browser..."
    open test_auth_debug.html
    sleep 2
else
    echo -e "${RED}✗ Debug tool NOT found${NC}"
fi

echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. In the debug tool that just opened:"
echo "   ${YELLOW}→ Click 'Check All Storage Keys'${NC}"
echo "   ${YELLOW}→ Look for your auth token${NC}"
echo "   ${YELLOW}→ Test login if needed${NC}"
echo "   ${YELLOW}→ Test API calls${NC}"
echo ""
echo "2. Navigate to your application:"
echo "   ${YELLOW}→ http://localhost:3000/app/activities/[activity-id]/notifications${NC}"
echo ""
echo "3. Test all features:"
echo "   ${YELLOW}→ Add New Participant${NC}"
echo "   ${YELLOW}→ Select Existing${NC}"
echo "   ${YELLOW}→ Bulk Import${NC}"
echo "   ${YELLOW}→ Send Notification${NC}"
echo ""
echo "4. Verify toast notifications:"
echo "   ${YELLOW}→ Should appear at top-right${NC}"
echo "   ${YELLOW}→ Should be ABOVE modals${NC}"
echo "   ${YELLOW}→ Should auto-dismiss${NC}"
echo ""
echo "========================================="
echo "If authentication fails:"
echo "========================================="
echo ""
echo "1. Check the token key name in localStorage (Step 1 of debug tool)"
echo "2. If it's not 'token', update the component:"
echo "   ${YELLOW}→ Edit ActivityParticipantsAndNotifications.jsx${NC}"
echo "   ${YELLOW}→ Find: localStorage.getItem('token')${NC}"
echo "   ${YELLOW}→ Replace with the correct key name${NC}"
echo ""
echo "3. Check browser console for detailed errors"
echo "4. Check Laravel logs: storage/logs/laravel.log"
echo ""
echo "========================================="
