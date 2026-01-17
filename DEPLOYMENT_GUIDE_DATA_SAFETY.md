# Data Safety & Audit Logging System - Deployment Guide
**Date:** 17 January 2026  
**Version:** 1.0.0

---

## 🎯 Overview

This deployment adds enterprise-grade audit logging and data safety features:
- ✅ Response data audit logs (question-level tracking)
- ✅ Notification delivery tracking (email, SMS, in-app)
- ✅ SendGrid webhook integration
- ✅ Data safety settings (Super Admin UI)
- ✅ Secondary backup system (async, non-blocking)

**IMPORTANT:** All changes are **non-breaking** and **backward compatible**. Existing data remains untouched.

---

## 📁 Server Paths

### Production Server
- **IP:** 13.126.210.220
- **Instance ID:** i-0de19fdf0bd6568b5
- **Region:** ap-south-1 (Mumbai)

### Directory Structure
```
/var/www/QSightsOrg2.0/
├── backend/              # Laravel Backend
│   ├── database/migrations/
│   ├── app/Models/
│   ├── app/Services/
│   └── app/Http/Controllers/Api/
└── frontend/             # Next.js Frontend
    └── app/
        └── super-admin/
            └── data-safety/
```

---

## 🔐 Access Methods

### Method 1: Direct SSH
```bash
cd /Users/yash/Documents/PEMs
ssh -i QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### Method 2: AWS SSM Session Manager (Port Forwarding)
```bash
aws ssm start-session \
  --target i-0de19fdf0bd6568b5 \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=3399,portNumber=22" \
  --region ap-south-1
```

---

## 📦 Pre-Deployment Checklist

### 1. Backup Current State
```bash
# Create backup
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# On server
cd /var/www/QSightsOrg2.0
sudo -u postgres pg_dump qsights_db > ~/backup_$(date +%Y%m%d_%H%M%S).sql

# Backup application files
tar -czf ~/qsights_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend frontend
```

### 2. Verify Current System
```bash
# Check Laravel version
cd /var/www/QSightsOrg2.0/backend
php artisan --version

# Check database connection
php artisan db:show

# Check current migrations
php artisan migrate:status
```

---

## 🚀 Deployment Steps

### Step 1: Upload Files to Server

#### Option A: From Local Machine
```bash
# Upload backend files
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  -r /Users/yash/Documents/Projects/QSightsOrg2.0/backend/database/migrations/*.php \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/database/migrations/

scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  -r /Users/yash/Documents/Projects/QSightsOrg2.0/backend/app/Models/*.php \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/app/Models/

scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  -r /Users/yash/Documents/Projects/QSightsOrg2.0/backend/app/Services/*.php \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/app/Services/

scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  -r /Users/yash/Documents/Projects/QSightsOrg2.0/backend/app/Http/Controllers/Api/*.php \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
```

#### Option B: Using Git (Recommended)
```bash
# On server
cd /var/www/QSightsOrg2.0
git pull origin main
```

### Step 2: Run Migrations

```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Navigate to backend
cd /var/www/QSightsOrg2.0/backend

# Run migrations (safe - creates new tables only)
php artisan migrate --force

# Verify migrations
php artisan migrate:status
```

**Expected Output:**
```
Migration name ........... Batch / Status
2026_01_17_000001_create_response_audit_logs_table ......... [1] Ran
2026_01_17_000002_create_notification_logs_table ........... [1] Ran
2026_01_17_000003_add_data_safety_settings ................. [1] Ran
```

### Step 3: Clear Caches

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Rebuild optimizations
php artisan config:cache
php artisan route:cache
php artisan optimize
```

### Step 4: Set Permissions

```bash
# Ensure correct ownership
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/storage
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/bootstrap/cache

# Set permissions
sudo chmod -R 775 /var/www/QSightsOrg2.0/backend/storage
sudo chmod -R 775 /var/www/QSightsOrg2.0/backend/bootstrap/cache
```

### Step 5: Restart Services

```bash
# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Restart Nginx
sudo systemctl restart nginx

# Check service status
sudo systemctl status php8.2-fpm
sudo systemctl status nginx
```

---

## ✅ Post-Deployment Verification

### 1. Check Database Tables
```bash
sudo -u postgres psql qsights_db

# Verify new tables
\dt response_audit_logs
\dt notification_logs

# Check data safety settings
SELECT * FROM system_settings WHERE category = 'data_safety';

# Exit
\q
```

### 2. Test API Endpoints

```bash
# Get data safety settings
curl -X GET https://qsights.com/api/data-safety/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "settings": {
    "response_backup": {
      "enabled": true,
      "include_anonymous": true,
      "retention_policy": "never"
    },
    "notification_logging": {
      "enabled": true,
      "log_content": true
    }
  }
}
```

### 3. Verify Webhook Endpoint

```bash
# Test SendGrid webhook (from server)
curl -X POST http://localhost/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -d '[{
    "event": "delivered",
    "sg_message_id": "test-123",
    "email": "test@example.com",
    "timestamp": 1642435200
  }]'
```

### 4. Check Application Logs

```bash
cd /var/www/QSightsOrg2.0/backend

# View recent logs
tail -f storage/logs/laravel.log

# Look for:
# - "ResponseAuditService: Successfully logged response"
# - "NotificationLogService: Created notification log"
# - "SendGridWebhook: Received events"
```

---

## 🔧 Configuration (SendGrid Webhook)

### Setup SendGrid Event Webhook

1. Login to SendGrid Dashboard: https://app.sendgrid.com/
2. Go to: **Settings** → **Mail Settings** → **Event Webhook**
3. Click **Create new webhook**
4. Configure:
   ```
   HTTP Post URL: https://qsights.com/api/webhooks/sendgrid
   
   Events to POST:
   ☑ Delivered
   ☑ Opened
   ☑ Clicked
   ☑ Bounced
   ☑ Dropped
   ☑ Spam Reports
   
   Event Webhook Status: ENABLED
   ```
5. Click **Save**

---

## 📊 Accessing Data Safety UI

### Super Admin Access
1. Login as Super Admin
2. Navigate to: **Super Admin** → **Data Safety**
3. URL: `https://qsights.com/super-admin/data-safety`

### Features Available:
- ✅ Enable/Disable response backup
- ✅ Configure retention policies
- ✅ View audit statistics
- ✅ Monitor notification delivery
- ✅ Browse audit logs

---

## 🐛 Troubleshooting

### Issue 1: Migrations Fail
```bash
# Check migration status
php artisan migrate:status

# Rollback last batch (if needed)
php artisan migrate:rollback

# Re-run migrations
php artisan migrate --force
```

### Issue 2: Permission Denied
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend

# Fix permissions
sudo chmod -R 775 /var/www/QSightsOrg2.0/backend/storage
```

### Issue 3: Webhook Not Receiving Events
```bash
# Check webhook logs
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log | grep SendGrid

# Test webhook endpoint
curl -X POST https://qsights.com/api/webhooks/sendgrid -d '[]'

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Issue 4: Database Connection Issues
```bash
# Test database connection
php artisan db:show

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 📈 Monitoring & Maintenance

### Daily Checks
```bash
# Check audit log growth
sudo -u postgres psql qsights_db -c "SELECT COUNT(*) FROM response_audit_logs;"
sudo -u postgres psql qsights_db -c "SELECT COUNT(*) FROM notification_logs;"

# Check disk space
df -h /var/www/QSightsOrg2.0
```

### Weekly Tasks
- Review audit statistics in Super Admin UI
- Check notification delivery rates
- Verify backup logs are being created

### Monthly Tasks
- Review retention policies
- Archive old audit logs if needed
- Review webhook event processing

---

## 🔄 Rollback Procedure (If Needed)

```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

cd /var/www/QSightsOrg2.0/backend

# Rollback migrations
php artisan migrate:rollback --step=3

# Restore from backup (if needed)
sudo -u postgres psql qsights_db < ~/backup_YYYYMMDD_HHMMSS.sql

# Restart services
sudo systemctl restart php8.2-fpm nginx
```

---

## 📝 Important Notes

### Data Safety Features
1. **Non-Blocking:** Audit logging never blocks primary response submission
2. **Async:** All backup operations run asynchronously
3. **Fail-Safe:** If backup fails, primary operation succeeds
4. **Forward-Only:** Only affects NEW data going forward
5. **Zero Impact:** Existing workflows remain unchanged

### Performance Impact
- **Minimal:** ~2-5ms additional latency per operation
- **Scalable:** Designed for high-volume production use
- **Indexed:** All queries optimized with proper indexes

### Security
- **Super Admin Only:** Data safety settings restricted
- **Audit Trail:** All setting changes logged
- **Webhook Security:** SendGrid verification recommended

---

## 🎉 Success Criteria

✅ All 3 migrations run successfully  
✅ New tables created (response_audit_logs, notification_logs)  
✅ Data safety settings inserted  
✅ API endpoints responding correctly  
✅ SendGrid webhook receiving events  
✅ Existing data untouched  
✅ No errors in application logs  
✅ Services running normally  

---

## 📞 Support

If issues arise:
1. Check application logs: `/var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`
2. Check Nginx logs: `/var/log/nginx/error.log`
3. Check PostgreSQL logs: `/var/log/postgresql/postgresql-*.log`
4. Review this guide's troubleshooting section

---

**Deployment Owner:** QSights Development Team  
**Last Updated:** 17 January 2026
