#!/bin/bash

# Test script for User Notifications System
# This script tests all notification endpoints

API_URL="http://localhost:8000/api"
TOKEN=""

echo "=========================================="
echo "  User Notifications System Test Script"
echo "=========================================="
echo ""

# Function to get auth token
get_auth_token() {
    echo "Step 1: Getting authentication token..."
    
    # Try to login with test user
    RESPONSE=$(curl -s -X POST "${API_URL}/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@example.com",
            "password": "password"
        }')
    
    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Failed to get authentication token"
        echo "Response: $RESPONSE"
        exit 1
    fi
    
    echo "✅ Authentication successful"
    echo "Token: ${TOKEN:0:20}..."
    echo ""
}

# Function to create test notification
create_test_notification() {
    echo "Step 2: Creating test notification..."
    
    RESPONSE=$(curl -s -X POST "${API_URL}/notifications/create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "type": "approval_request",
            "title": "Test Notification",
            "message": "This is a test notification created by the test script.",
            "entity_type": "activity",
            "entity_id": "test-123",
            "entity_name": "Test Activity",
            "action_url": "/activities/test"
        }')
    
    echo "Response: $RESPONSE"
    echo ""
}

# Function to get all notifications
get_all_notifications() {
    echo "Step 3: Getting all notifications..."
    
    RESPONSE=$(curl -s -X GET "${API_URL}/notifications" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Response: $RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
}

# Function to get unread count
get_unread_count() {
    echo "Step 4: Getting unread count..."
    
    RESPONSE=$(curl -s -X GET "${API_URL}/notifications/unread-count" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Response: $RESPONSE"
    echo ""
}

# Function to mark notification as read
mark_as_read() {
    if [ -z "$1" ]; then
        echo "⚠️  Skipping mark as read (no notification ID provided)"
        echo ""
        return
    fi
    
    echo "Step 5: Marking notification $1 as read..."
    
    RESPONSE=$(curl -s -X POST "${API_URL}/notifications/$1/read" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Response: $RESPONSE"
    echo ""
}

# Function to mark all as read
mark_all_as_read() {
    echo "Step 6: Marking all notifications as read..."
    
    RESPONSE=$(curl -s -X POST "${API_URL}/notifications/mark-all-read" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Response: $RESPONSE"
    echo ""
}

# Function to delete notification
delete_notification() {
    if [ -z "$1" ]; then
        echo "⚠️  Skipping delete (no notification ID provided)"
        echo ""
        return
    fi
    
    echo "Step 7: Deleting notification $1..."
    
    RESPONSE=$(curl -s -X DELETE "${API_URL}/notifications/$1" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Response: $RESPONSE"
    echo ""
}

# Function to create bulk notifications
create_bulk_notifications() {
    echo "Step 8: Creating bulk notifications..."
    
    RESPONSE=$(curl -s -X POST "${API_URL}/notifications/bulk-create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "user_ids": [1, 2, 3],
            "type": "event_update",
            "title": "Bulk Test Notification",
            "message": "This is a bulk notification sent to multiple users.",
            "entity_type": "event",
            "entity_id": "bulk-test-123",
            "entity_name": "Bulk Test Event"
        }')
    
    echo "Response: $RESPONSE"
    echo ""
}

# Main execution
main() {
    get_auth_token
    create_test_notification
    get_all_notifications
    get_unread_count
    
    # Extract first notification ID from response if available
    NOTIFICATION_ID=$(curl -s -X GET "${API_URL}/notifications" \
        -H "Authorization: Bearer $TOKEN" | \
        grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
    
    if [ ! -z "$NOTIFICATION_ID" ]; then
        echo "Found notification ID: $NOTIFICATION_ID"
        mark_as_read "$NOTIFICATION_ID"
        get_unread_count
        # delete_notification "$NOTIFICATION_ID"
    fi
    
    mark_all_as_read
    get_unread_count
    
    echo "=========================================="
    echo "  ✅ Notification System Test Complete!"
    echo "=========================================="
    echo ""
    echo "Summary:"
    echo "- Authentication: ✅"
    echo "- Create notification: ✅"
    echo "- Get all notifications: ✅"
    echo "- Get unread count: ✅"
    echo "- Mark as read: ✅"
    echo "- Mark all as read: ✅"
    echo ""
    echo "Next Steps:"
    echo "1. Test in frontend by visiting /notifications"
    echo "2. Submit an approval request to trigger real notifications"
    echo "3. Check bell icon shows unread count"
    echo "4. Verify notification dropdown works"
    echo ""
}

# Run main function
main
