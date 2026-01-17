#!/bin/bash
echo "Testing /api/notifications/send-emails endpoint"
echo "================================================"
echo ""

# Get token (you'll need to replace with actual token)
echo "To get your token, open browser console and run:"
echo "localStorage.getItem('token')"
echo ""
read -p "Enter your auth token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token required"
    exit 1
fi

echo ""
echo "Testing with activity ID: a09ce91e-83fe-4bb4-8f2c-aa4767d25c81"
echo ""

curl -X POST http://localhost:8000/api/notifications/send-emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -d '{
    "activityId": "a09ce91e-83fe-4bb4-8f2c-aa4767d25c81",
    "templateType": "invitation",
    "participants": [
      {
        "email": "yashbantm@gmail.com",
        "name": "Test User"
      }
    ]
  }' -v

echo ""
echo ""
echo "Check logs:"
echo "tail -20 storage/logs/laravel.log"
