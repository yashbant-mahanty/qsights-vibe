#!/bin/bash

# Notification Template Management API Test Script
# This script demonstrates all API endpoints for the notification template system

# Configuration
BASE_URL="http://localhost:8000/api"
ACTIVITY_ID="a0833688-87e3-48c5-8d6b-55eb06a75923"  # Replace with actual activity ID
TOKEN="your-auth-token-here"  # Replace with actual Sanctum token

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Notification Template Management API Tests ===${NC}\n"

# Test 1: Get available notification types
echo -e "${YELLOW}Test 1: Get Available Notification Types${NC}"
curl -s -X GET "${BASE_URL}/notification-templates/types" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq '.'
echo -e "\n"

# Test 2: Get available placeholders
echo -e "${YELLOW}Test 2: Get Available Placeholders${NC}"
curl -s -X GET "${BASE_URL}/notification-templates/placeholders" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq '.'
echo -e "\n"

# Test 3: List all templates for activity
echo -e "${YELLOW}Test 3: List All Templates for Activity${NC}"
curl -s -X GET "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq '.'
echo -e "\n"

# Test 4: Get template by type (invitation)
echo -e "${YELLOW}Test 4: Get Invitation Template${NC}"
curl -s -X GET "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates/type/invitation" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq '.'
echo -e "\n"

# Test 5: Create custom template
echo -e "${YELLOW}Test 5: Create Custom Reminder Template${NC}"
curl -s -X POST "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "notification_type": "reminder",
    "subject": "Quick Reminder: {{activity_name}} starts in {{days_until_start}} days!",
    "body_html": "<h2>Hi {{participant_name}}</h2><p>This is a friendly reminder that <strong>{{activity_name}}</strong> starts on {{activity_start_date}}.</p><p>Don'\''t miss out! <a href=\"{{activity_url}}\">Click here to participate</a></p>",
    "body_text": "Hi {{participant_name}}, Reminder: {{activity_name}} starts on {{activity_start_date}}. Visit: {{activity_url}}",
    "is_active": true
  }' | jq '.'
echo -e "\n"

# Test 6: Preview template
echo -e "${YELLOW}Test 6: Preview Template with Sample Data${NC}"
curl -s -X POST "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates/preview" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "notification_type": "invitation",
    "subject": "Special Invitation: {{activity_name}}",
    "body_html": "<div style=\"padding:20px; background:#f0f0f0;\"><h1>Welcome {{participant_name}}!</h1><p>You are invited to <strong>{{activity_name}}</strong></p><p>Organization: {{organization_name}}</p><p>Start Date: {{activity_start_date}}</p><p>Days until start: {{days_until_start}}</p><a href=\"{{activity_url}}\" style=\"background:#4CAF50; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;\">View Activity</a></div>",
    "body_text": "Welcome {{participant_name}}! You are invited to {{activity_name}}. Start: {{activity_start_date}}"
  }' | jq '.preview.subject, .preview.body_text'
echo -e "\n"

# Test 7: Create all default templates
echo -e "${YELLOW}Test 7: Create All Default Templates${NC}"
curl -s -X POST "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates/create-defaults" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq '.message, .created_templates | length'
echo -e "\n"

# Test 8: Update template
echo -e "${YELLOW}Test 8: Update Template (first get template ID)${NC}"
TEMPLATE_ID=$(curl -s -X GET "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq -r '.templates[0].id // empty')

if [ ! -z "$TEMPLATE_ID" ]; then
  echo "Updating template: ${TEMPLATE_ID}"
  curl -s -X PUT "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates/${TEMPLATE_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{
      "subject": "Updated: {{activity_name}} from {{organization_name}}",
      "is_active": true
    }' | jq '.'
else
  echo "No templates found to update"
fi
echo -e "\n"

# Test 9: Reset template to default
echo -e "${YELLOW}Test 9: Reset Template to Default${NC}"
curl -s -X POST "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates/reset/thank_you" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | jq '.'
echo -e "\n"

# Test 10: Delete template (if exists)
echo -e "${YELLOW}Test 10: Delete Custom Template${NC}"
if [ ! -z "$TEMPLATE_ID" ]; then
  curl -s -X DELETE "${BASE_URL}/activities/${ACTIVITY_ID}/notification-templates/${TEMPLATE_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" | jq '.'
else
  echo "No template to delete"
fi
echo -e "\n"

echo -e "${GREEN}=== All API Tests Completed ===${NC}"
echo -e "\nNote: Replace ACTIVITY_ID and TOKEN variables at the top of this script with actual values."
echo -e "Install jq for better JSON formatting: brew install jq (macOS) or apt-get install jq (Ubuntu)"
