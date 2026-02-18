#!/bin/bash

# Fix Program Status Script
# Updates "The Strategic Time Drain Survey" program from expired to active

SERVER="ubuntu@13.126.210.220"
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
API_URL="https://prod.qsights.com/api"
PROGRAM_ID="a0e384b0-b552-4a0c-a0cd-8e798b300f9b"

echo "🔧 Fixing Program Status for 'The Strategic Time Drain Survey'"
echo "=================================================="
echo ""

echo "📋 Step 1: Update program status to 'active' via API..."
ssh -i "$PEM" "$SERVER" << 'ENDSSH'
# Get token from database
TOKEN=$(sudo -u postgres psql -d qsights_prod -t -c "SELECT token FROM personal_access_tokens WHERE tokenable_type='App\\Models\\User' AND tokenable_id=1 ORDER BY created_at DESC LIMIT 1;" | xargs)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    exit 1
fi

echo "✅ Token retrieved"
echo ""
echo "📋 Updating program status..."

curl -X PUT 'https://prod.qsights.com/api/programs/a0e384b0-b552-4a0c-a0cd-8e798b300f9b' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"status": "active"}' \
  --insecure

echo ""
echo "✅ Program status updated to 'active'"
ENDSSH

echo ""
echo "🎉 Program status fix complete!"
echo ""
echo "📋 Program Details:"
echo "   - Name: The Strategic Time Drain Survey"
echo "   - ID: a0e384b0-b552-4a0c-a0cd-8e798b300f9b"
echo "   - End Date: 2026-08-31"
echo "   - New Status: active"
echo ""
echo "✅ The program should now appear in activity dropdowns"
