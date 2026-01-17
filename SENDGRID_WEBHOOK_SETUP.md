# SendGrid Webhook Setup Guide

## Overview
A comprehensive notification tracking system has been implemented to track delivered, opened, and clicked email events using SendGrid webhooks.

## What's Been Implemented

### 1. Database Schema
- **notification_events** table: Stores individual email tracking events
  - Event types: delivered, open, click, bounce, dropped
  - Stores recipient info: email, participant_id, user_id, participant/user name
  - Stores activity context: program_name, program_id, activity_name, activity_id
  - Stores event metadata: timestamp, IP address, user agent, URLs clicked

### 2. Backend Components
- **NotificationEvent** model: Eloquent model for tracking events
- **SendGridWebhookController**: Handles incoming webhook events from SendGrid
- **Updated EmailService**: Now captures SendGrid message IDs and sends custom args for tracking
- **New Analytics API**: `/api/notifications/analytics` - Returns real tracking data with counts

### 3. Frontend Updates
- Analytics page now uses real tracking data from the API
- Displays: Sent, Delivered, Opened, Read (clicked) counts
- Shows detailed event list with participant/user information
- Falls back to sent notifications if no tracking events yet

## SendGrid Webhook Configuration

### Step 1: Access SendGrid Settings
1. Log in to your SendGrid account
2. Go to **Settings** → **Mail Settings** → **Event Webhook**

### Step 2: Configure Webhook URL
**Webhook URL:** `https://prod.qsights.com/api/webhooks/sendgrid`

### Step 3: Select Events to Track
Enable these events:
- ✅ **Delivered** - Email was successfully delivered
- ✅ **Opened** - Recipient opened the email  
- ✅ **Clicked** - Recipient clicked a link in the email
- ✅ **Bounced** - Email bounced (optional, for monitoring)
- ✅ **Dropped** - Email was dropped (optional, for monitoring)

### Step 4: Security (Recommended)
SendGrid can sign webhook requests. If you enable this:
1. Enable "Event Webhook Signature"
2. Copy the verification key
3. Add it to your backend `.env` file:
   ```
   SENDGRID_WEBHOOK_VERIFICATION_KEY=your_key_here
   ```

### Step 5: Enable the Webhook
1. Click "Enabled" toggle
2. Click "Save"
3. Use "Test Your Integration" to send a test event

## Testing

### 1. Send a Test Email
Send an email notification from the QSights platform:
1. Go to any Activity
2. Send notifications to participants
3. Check the backend logs: `/var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`

### 2. Verify Webhook Reception
Check if webhooks are being received:
```bash
ssh prod.qsights.com
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log | grep "SendGrid"
```

### 3. Check Database
Verify events are being stored:
```bash
ssh prod.qsights.com
sudo -u postgres psql qsights_db
SELECT count(*), event_type FROM notification_events GROUP BY event_type;
```

### 4. Test Analytics API
Visit the analytics page in the platform:
- Go to **Reports & Analytics** → **Notifications** tab
- You should see: Sent, Delivered, Opened, Read counts
- Event list will show individual tracking events

## How It Works

### Email Sending Flow
1. Email is sent via EmailService
2. SendGrid message ID is captured and stored in `notifications` table
3. Custom args (program_id, activity_name, etc.) are attached to the email

### Webhook Processing Flow
1. SendGrid sends webhook POST to `/api/webhooks/sendgrid`
2. SendGridWebhookController receives the event
3. Event is matched to notification by SendGrid message ID or email
4. Participant/User is identified by email
5. Event is stored in `notification_events` table with full context

### Analytics Display Flow
1. Frontend calls `/api/notifications/analytics`
2. API queries `notification_events` table
3. Returns aggregated counts and detailed event list
4. Frontend displays metrics and individual tracking records

## Backward Compatibility

The system is fully backward compatible:
- Existing email sending functionality is not modified
- If no tracking events exist yet, falls back to showing sent notifications
- All existing APIs continue to work
- No breaking changes to existing features

## Monitoring

### Key Metrics to Track
- Delivery rate: (Delivered / Sent) × 100
- Open rate: (Opened / Delivered) × 100  
- Click rate: (Clicked / Opened) × 100

### Log Files
- Backend logs: `/var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`
- Webhook events: Look for "SendGrid Webhook" in logs

## Troubleshooting

### No events showing in analytics?
1. Verify SendGrid webhook is enabled and URL is correct
2. Check backend logs for webhook errors
3. Test webhook using SendGrid's "Test Your Integration" button

### Events not matching to participants?
- Ensure participant email matches exactly
- Check that notification was sent recently (within 24 hours)
- Verify metadata is being sent with custom args

### Foreign key errors during migration?
- Migration uses string IDs to avoid type conflicts
- No foreign key constraints are used (soft references only)

## Next Steps

After webhook is configured:
1. Monitor webhook reception in logs
2. Send test emails to verify tracking
3. Check analytics page for real-time data
4. Monitor delivery rates and open rates
5. Use data to optimize email campaigns

## Support

For issues:
1. Check Laravel logs for errors
2. Verify webhook URL is accessible
3. Test with SendGrid's webhook testing tool
4. Review database for stored events
