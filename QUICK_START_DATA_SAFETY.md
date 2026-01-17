# Quick Start - Data Safety System Deployment

## 🚀 Fast Deployment (5 Minutes)

### Prerequisites
- PEM file location: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- Server IP: `13.126.210.220`
- Backend path: `/var/www/QSightsOrg2.0/backend`

---

## Option 1: One-Command Deployment (Recommended)

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./deploy_data_safety.sh
```

Follow the on-screen instructions.

---

## Option 2: Manual Step-by-Step

### Step 1: SSH to Server
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### Step 2: Backup Database
```bash
sudo -u postgres pg_dump qsights_db > ~/backup_$(date +%Y%m%d).sql
```

### Step 3: Navigate to Backend
```bash
cd /var/www/QSightsOrg2.0/backend
```

### Step 4: Run Migrations
```bash
php artisan migrate --force
```

Expected output:
```
✓ 2026_01_17_000001_create_response_audit_logs_table
✓ 2026_01_17_000002_create_notification_logs_table  
✓ 2026_01_17_000003_add_data_safety_settings
```

### Step 5: Clear Caches
```bash
php artisan cache:clear
php artisan config:cache
php artisan route:cache
```

### Step 6: Restart Services
```bash
sudo systemctl restart php8.2-fpm nginx
```

### Step 7: Verify
```bash
# Check tables
sudo -u postgres psql qsights_db -c "\dt response_audit_logs"
sudo -u postgres psql qsights_db -c "\dt notification_logs"

# Check settings
sudo -u postgres psql qsights_db -c "SELECT * FROM system_settings WHERE category = 'data_safety';"
```

---

## ✅ Post-Deployment Verification

### 1. Test API Endpoint
```bash
curl https://qsights.com/api/data-safety/health
```

Expected: `{"status": "ok"}`

### 2. Check Logs
```bash
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log
```

Look for: No errors

### 3. Test Response Submission
1. Submit a test response in any activity
2. Check audit log:
```bash
sudo -u postgres psql qsights_db -c "SELECT COUNT(*) FROM response_audit_logs;"
```

---

## 🔧 Configure SendGrid Webhook

1. Go to: https://app.sendgrid.com/
2. Navigate: **Settings → Mail Settings → Event Webhook**
3. Add webhook URL: `https://qsights.com/api/webhooks/sendgrid`
4. Enable events: Delivered, Opened, Clicked, Bounced
5. Save and enable

---

## 📊 Access Data Safety UI

1. Login as Super Admin
2. Navigate to: Super Admin → Data Safety
3. URL: `https://qsights.com/super-admin/data-safety`

---

## 🐛 Quick Troubleshooting

### Issue: Migration Fails
```bash
php artisan migrate:status  # Check status
php artisan migrate:rollback --step=1  # Rollback if needed
php artisan migrate --force  # Re-run
```

### Issue: Permission Denied
```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### Issue: Services Won't Start
```bash
sudo systemctl status php8.2-fpm
sudo systemctl status nginx
sudo systemctl restart php8.2-fpm nginx
```

---

## 📝 What Was Added

### New Tables
- `response_audit_logs` - Question-level response tracking
- `notification_logs` - Email/SMS delivery tracking

### New Settings (5)
- Enable response backup
- Include anonymous responses
- Retention policy
- Enable notification logging
- Log notification content

### New Features
- ✅ Automatic audit logging on response submission
- ✅ Notification delivery tracking
- ✅ SendGrid webhook integration
- ✅ Data safety configuration UI
- ✅ Statistics and reporting

---

## ⚠️ Important Notes

✅ **Zero Breaking Changes** - Everything works as before  
✅ **Existing Data Safe** - No modifications to current records  
✅ **Non-Blocking** - Audit logging doesn't slow down responses  
✅ **Fail-Safe** - Primary operations succeed even if logging fails  

---

## 📞 Need Help?

**Check logs:**
```bash
tail -100 /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log
```

**Full documentation:** `DEPLOYMENT_GUIDE_DATA_SAFETY.md`

**Emergency rollback:**
```bash
cd /var/www/QSightsOrg2.0/backend
php artisan migrate:rollback --step=3
```

---

**Total Deployment Time:** ~5 minutes  
**Downtime Required:** ~30 seconds (service restart only)  
**Risk Level:** ✅ Low (additive changes only)
