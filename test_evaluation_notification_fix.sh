#!/bin/bash

# Evaluation & Notification Fix - Test Verification Script
# Date: February 11, 2026

set -e

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "Evaluation & Notification Fix - Testing"
echo "Date: $(date)"
echo "========================================="
echo ""

echo -e "${BLUE}Test 1: Check if files are deployed${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
if [ -f "/var/www/backend/app/Services/EvaluationNotificationService.php" ]; then
    echo "✓ EvaluationNotificationService.php exists"
else
    echo "✗ EvaluationNotificationService.php NOT found"
fi

if [ -f "/var/www/backend/app/Http/Controllers/Api/EvaluationTriggerController.php" ]; then
    echo "✓ EvaluationTriggerController.php exists"
else
    echo "✗ EvaluationTriggerController.php NOT found"
fi

if [ -f "/var/www/backend/app/Http/Controllers/Api/ActivityController.php" ]; then
    echo "✓ ActivityController.php exists"
else
    echo "✗ ActivityController.php NOT found"
fi
EOF
echo ""

echo -e "${BLUE}Test 2: Check for 'sendTriggerEmailToEvaluator' method${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
if grep -q "sendTriggerEmailToEvaluator" /var/www/backend/app/Services/EvaluationNotificationService.php; then
    echo "✓ New method 'sendTriggerEmailToEvaluator' found"
else
    echo "✗ Method 'sendTriggerEmailToEvaluator' NOT found"
fi
EOF
echo ""

echo -e "${BLUE}Test 3: Check if EvaluationTriggerController uses NotificationService${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
if grep -q "notificationService->sendTriggerEmailToEvaluator" /var/www/backend/app/Http/Controllers/Api/EvaluationTriggerController.php; then
    echo "✓ EvaluationTriggerController uses NotificationService"
else
    echo "✗ EvaluationTriggerController NOT using NotificationService"
fi
EOF
echo ""

echo -e "${BLUE}Test 4: Check ActivityController participant filtering${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
if grep -q "whereNotNull('email')" /var/www/backend/app/Http/Controllers/Api/ActivityController.php; then
    echo "✓ Email validation added to participant filtering"
else
    echo "✗ Email validation NOT found"
fi
EOF
echo ""

echo -e "${BLUE}Test 5: Check Laravel logs for errors${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
echo "Last 10 lines of Laravel log:"
tail -n 10 /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "No log file yet"
EOF
echo ""

echo -e "${BLUE}Test 6: Test API endpoint connectivity${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com/api/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
    echo "✓ API is responding (HTTP $RESPONSE)"
else
    echo "✗ API not responding properly (HTTP $RESPONSE)"
fi
echo ""

echo "========================================="
echo -e "${GREEN}Verification Complete${NC}"
echo "========================================="
echo ""
echo "Manual Testing Required:"
echo "1. Login to https://prod.qsights.com as Evaluation Admin"
echo "2. Trigger a new evaluation"
echo "3. Verify email is sent (check email_sent_at timestamp)"
echo "4. Check evaluator's email inbox"
echo "5. Test participant notifications panel"
echo "6. Verify all participants with valid emails appear"
echo ""
echo "Monitoring:"
echo "  - Laravel logs: ssh -i \"$PEM_FILE\" \"$SERVER\" 'tail -f /var/www/backend/storage/logs/laravel.log'"
echo "  - Email debug: ssh -i \"$PEM_FILE\" \"$SERVER\" 'tail -f /var/www/backend/storage/logs/email_debug.log'"
echo ""
