#!/bin/bash

# Evaluation Analytics API - Quick Test Script
# Date: February 7, 2026
# Purpose: Test newly deployed analytics endpoints

API_BASE="https://prod.qsights.com/api/evaluation/analytics"
DATE_FROM="2026-01-01"
DATE_TO="2026-02-07"

echo "🧪 Testing Evaluation Analytics Endpoints"
echo "=========================================="
echo ""

# Note: Replace YOUR_TOKEN with actual Bearer token
# Get token from: Browser DevTools > Application > Cookies > auth_token
# Or login to https://prod.qsights.com and copy from Network tab

TOKEN="YOUR_TOKEN_HERE"

if [ "$TOKEN" == "YOUR_TOKEN_HERE" ]; then
    echo "⚠️  Please set your authentication token in this script"
    echo "   Edit line 13 and replace YOUR_TOKEN_HERE with actual token"
    echo ""
    echo "To get your token:"
    echo "1. Login to https://prod.qsights.com"
    echo "2. Open Browser DevTools (F12)"
    echo "3. Go to Application > Cookies"
    echo "4. Copy the value of 'auth_token' cookie"
    echo ""
    exit 1
fi

echo "📊 Test 1: Summary Endpoint"
echo "----------------------------"
curl -s -w "\nStatus: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/summary?date_from=$DATE_FROM&date_to=$DATE_TO" \
    | jq '.' 2>/dev/null || echo "Response received (jq not installed for formatting)"
echo ""

echo "📊 Test 2: Evaluator Performance"
echo "----------------------------"
curl -s -w "\nStatus: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/evaluator-performance?date_from=$DATE_FROM&date_to=$DATE_TO" \
    | jq '.success, .evaluator_performance | length' 2>/dev/null || echo "Response received"
echo ""

echo "📊 Test 3: Subordinate Performance"
echo "----------------------------"
curl -s -w "\nStatus: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/subordinate-performance?date_from=$DATE_FROM&date_to=$DATE_TO" \
    | jq '.success, .subordinate_performance | length' 2>/dev/null || echo "Response received"
echo ""

echo "📊 Test 4: Competency Analysis"
echo "----------------------------"
curl -s -w "\nStatus: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/competency-analysis?date_from=$DATE_FROM&date_to=$DATE_TO" \
    | jq '.success, .competency_analysis | length' 2>/dev/null || echo "Response received"
echo ""

echo "📊 Test 5: Department Comparison"
echo "----------------------------"
curl -s -w "\nStatus: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/department-comparison?date_from=$DATE_FROM&date_to=$DATE_TO" \
    | jq '.success, .department_comparison | length' 2>/dev/null || echo "Response received"
echo ""

echo "📊 Test 6: Trends (Weekly)"
echo "----------------------------"
curl -s -w "\nStatus: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/trends?date_from=$DATE_FROM&date_to=$DATE_TO&period=week" \
    | jq '.success, .period_type, (.trends | length)' 2>/dev/null || echo "Response received"
echo ""

echo "✅ Testing Complete!"
echo ""
echo "Expected Status Codes:"
echo "  200 - Success (endpoints working correctly)"
echo "  401 - Unauthorized (token invalid or expired)"
echo "  403 - Forbidden (user doesn't have required role)"
echo "  500 - Server Error (check Laravel logs)"
echo ""
echo "Next Steps:"
echo "1. If all tests show Status: 200, backend is working correctly"
echo "2. Check response data contains expected fields"
echo "3. Proceed with frontend UI development"
echo ""
