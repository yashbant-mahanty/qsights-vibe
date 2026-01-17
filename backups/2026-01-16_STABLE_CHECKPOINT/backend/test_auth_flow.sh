#!/bin/bash

# Test Authentication Flow
echo "================================"
echo "Testing Authentication Flow"
echo "================================"

SERVER="http://43.205.98.45"
COOKIE_FILE="/tmp/cookies.txt"

# Clean up old cookies
rm -f $COOKIE_FILE

echo ""
echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST "$SERVER/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"yashagarwal52121@gmail.com","password":"admin123"}')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
echo ""
echo "Token: $TOKEN"

# Check cookie file
echo ""
echo "2. Checking Cookie File:"
cat $COOKIE_FILE

echo ""
echo "3. Testing /auth/me with Cookie..."
ME_RESPONSE=$(curl -s -b $COOKIE_FILE "$SERVER/api/auth/me")
echo "Response:"
echo "$ME_RESPONSE" | jq '.'

echo ""
echo "4. Testing /auth/me with Bearer Token..."
ME_TOKEN_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/auth/me")
echo "Response:"
echo "$ME_TOKEN_RESPONSE" | jq '.'

echo ""
echo "================================"
echo "Test Complete"
echo "================================"
