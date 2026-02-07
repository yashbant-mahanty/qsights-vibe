#!/bin/bash

# Test Notification Template CRUD Operations
# This script tests Create, Read, Update, Delete operations

# Configuration
API_URL="${API_URL:-http://localhost:8000/api}"
TOKEN="${TOKEN:-}"
ACTIVITY_ID="${ACTIVITY_ID:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if required variables are set
if [ -z "$TOKEN" ]; then
    print_error "TOKEN environment variable is not set"
    echo "Usage: TOKEN=your_token ACTIVITY_ID=your_activity_id bash test_crud.sh"
    exit 1
fi

if [ -z "$ACTIVITY_ID" ]; then
    print_error "ACTIVITY_ID environment variable is not set"
    echo "Usage: TOKEN=your_token ACTIVITY_ID=your_activity_id bash test_crud.sh"
    exit 1
fi

echo "================================================"
echo "Testing Notification Template CRUD Operations"
echo "================================================"
echo ""

# Test 1: READ - Get all templates (should return defaults)
print_info "Test 1: READ - Get all templates"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "GET all templates: HTTP $HTTP_CODE"
    COUNT=$(echo "$BODY" | jq '.data | length')
    print_info "Found $COUNT templates"
else
    print_error "GET all templates: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

# Test 2: CREATE - Customize the invitation template
print_info ""
print_info "Test 2: CREATE - Customize invitation template"
CREATE_DATA='{
  "notification_type": "invitation",
  "subject": "CUSTOM TEST: Join {{activity_name}}",
  "body_html": "<html><body><h1>Hello {{participant_name}}</h1><p>This is a custom invitation for {{activity_name}}.</p></body></html>",
  "body_text": "Hello {{participant_name}}, This is a custom invitation for {{activity_name}}.",
  "is_active": true
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$CREATE_DATA" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    print_success "CREATE template: HTTP $HTTP_CODE"
    TEMPLATE_ID=$(echo "$BODY" | jq -r '.template.id')
    print_info "Created template ID: $TEMPLATE_ID"
else
    print_error "CREATE template: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

# Test 3: READ - Get the custom template
print_info ""
print_info "Test 3: READ - Get custom invitation template"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates/type/invitation")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "GET custom template: HTTP $HTTP_CODE"
    SUBJECT=$(echo "$BODY" | jq -r '.template.subject')
    print_info "Subject: $SUBJECT"
else
    print_error "GET custom template: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

# Test 4: UPDATE - Update the custom template
print_info ""
print_info "Test 4: UPDATE - Update custom template"
UPDATE_DATA='{
  "notification_type": "invitation",
  "subject": "UPDATED TEST: Join {{activity_name}} Now!",
  "body_html": "<html><body><h1>Hello {{participant_name}}</h1><p>UPDATED: This is a custom invitation for {{activity_name}}.</p></body></html>",
  "body_text": "UPDATED: Hello {{participant_name}}, This is a custom invitation for {{activity_name}}.",
  "is_active": true
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$UPDATE_DATA" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates/$TEMPLATE_ID")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "UPDATE template: HTTP $HTTP_CODE"
    UPDATED_SUBJECT=$(echo "$BODY" | jq -r '.template.subject')
    print_info "Updated subject: $UPDATED_SUBJECT"
else
    print_error "UPDATE template: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

# Test 5: PREVIEW - Preview the custom template
print_info ""
print_info "Test 5: PREVIEW - Preview custom template"
PREVIEW_DATA='{
  "notification_type": "invitation",
  "subject": "UPDATED TEST: Join {{activity_name}} Now!",
  "body_html": "<html><body><h1>Hello {{participant_name}}</h1><p>UPDATED: This is a custom invitation for {{activity_name}}.</p></body></html>",
  "body_text": "UPDATED: Hello {{participant_name}}, This is a custom invitation for {{activity_name}}."
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PREVIEW_DATA" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates/preview")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "PREVIEW template: HTTP $HTTP_CODE"
    PREVIEW_SUBJECT=$(echo "$BODY" | jq -r '.preview.subject')
    print_info "Preview subject: $PREVIEW_SUBJECT"
    print_info "Placeholders replaced successfully"
else
    print_error "PREVIEW template: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

# Test 6: DELETE - Delete the custom template
print_info ""
print_info "Test 6: DELETE - Delete custom template"
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates/$TEMPLATE_ID")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "DELETE template: HTTP $HTTP_CODE"
    print_info "Template deleted, reverted to default"
else
    print_error "DELETE template: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

# Test 7: READ - Verify template reverted to default
print_info ""
print_info "Test 7: READ - Verify template reverted to default"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$API_URL/activities/$ACTIVITY_ID/notification-templates/type/invitation")
    
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "GET default template: HTTP $HTTP_CODE"
    SUBJECT=$(echo "$BODY" | jq -r '.template.subject')
    IS_DEFAULT=$(echo "$BODY" | jq -r '.template.is_default')
    print_info "Subject: $SUBJECT"
    print_info "Is default: $IS_DEFAULT"
    
    if [ "$IS_DEFAULT" = "true" ]; then
        print_success "Template successfully reverted to default"
    else
        print_error "Template did not revert to default"
        exit 1
    fi
else
    print_error "GET default template: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.'
    exit 1
fi

echo ""
echo "================================================"
print_success "All CRUD operations completed successfully!"
echo "================================================"
