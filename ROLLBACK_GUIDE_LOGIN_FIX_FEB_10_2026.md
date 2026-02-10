# 🔄 ROLLBACK GUIDE - Super Admin Login Fix
**Deployment Date:** February 10, 2026 @ 15:45 UTC  
**Deployment ID:** `login-fix-20260210-1545`

---

## 📊 CURRENT DEPLOYMENT DETAILS

| Item | Value |
|------|-------|
| **Live BUILD_ID** | `-PfZ6kpl6AzU7yOa7ACMC` |
| **Previous BUILD_ID** | `9v14g-w2CmUPRNt5xWNl_` |
| **Production Path** | `/var/www/frontend` |
| **PM2 Process** | `qsights-frontend` (ID: 1) |
| **Backup Location** | `/var/www/frontend/.next.backup_20260210_154452` |
| **Server** | `ubuntu@13.126.210.220` |
| **PEM File** | `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem` |

---

## 🚨 QUICK ROLLBACK PROCEDURE

### Option 1: Instant Rollback (30 seconds)

**Use this if the site is down or login is completely broken.**

```bash
# Connect to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Execute rollback (copy-paste this entire block)
set -e
LIVE=/var/www/frontend
BACKUP=/var/www/frontend/.next.backup_20260210_154452

echo "Rolling back to previous BUILD_ID: 9v14g-w2CmUPRNt5xWNl_"

# Move broken build aside
sudo mv $LIVE/.next $LIVE/.next.failed_$(date +%Y%m%d_%H%M%S)

# Restore backup
sudo mv $BACKUP $LIVE/.next

# Fix permissions
sudo chown -R ubuntu:ubuntu $LIVE/.next

# Restart PM2
pm2 restart qsights-frontend

# Wait for startup
sleep 3

# Verify
echo "Current BUILD_ID: $(cat $LIVE/.next/BUILD_ID)"
curl -sS -o /dev/null -w "HTTP Status: %{http_code}\n" http://127.0.0.1:3000/
```

**Expected Output:**
```
Rolling back to previous BUILD_ID: 9v14g-w2CmUPRNt5xWNl_
Current BUILD_ID: 9v14g-w2CmUPRNt5xWNl_
HTTP Status: 200
```

### Option 2: Automated Rollback Script (1 minute)

**From your local machine:**

```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 'bash -s' <<'ROLLBACK'
set -euo pipefail
LIVE=/var/www/frontend
TS=$(date +%Y%m%d_%H%M%S)

echo "=== ROLLBACK INITIATED ==="
echo "Finding most recent backup..."

# Find backup
BACKUP=$(ls -1dt $LIVE/.next.backup* 2>/dev/null | head -n 1)
if [ -z "$BACKUP" ]; then
  echo "ERROR: No backup found!"
  exit 1
fi

BACKUP_BUILD=$(cat "$BACKUP/BUILD_ID" 2>/dev/null || echo "unknown")
echo "Found backup: $BACKUP"
echo "Backup BUILD_ID: $BACKUP_BUILD"

# Move current (broken) aside
if [ -d "$LIVE/.next" ]; then
  echo "Moving current build to .next.failed_${TS}"
  sudo mv "$LIVE/.next" "$LIVE/.next.failed_${TS}"
fi

# Restore backup
echo "Restoring backup..."
sudo mv "$BACKUP" "$LIVE/.next"

# Fix permissions
echo "Fixing permissions..."
sudo chown -R ubuntu:ubuntu "$LIVE/.next"
sudo find "$LIVE/.next" -type d -exec chmod u+rwx,go+rx {} + 2>/dev/null
sudo find "$LIVE/.next" -type f -exec chmod u+rw,go+r {} + 2>/dev/null

# Restart
echo "Restarting PM2..."
pm2 restart qsights-frontend
sleep 3

# Verify
echo ""
echo "=== ROLLBACK COMPLETE ==="
echo "Live BUILD_ID: $(cat $LIVE/.next/BUILD_ID)"
echo -n "HTTP /: "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
echo -n "HTTP /dashboard: "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/dashboard

echo ""
echo "PM2 Status:"
pm2 list | grep qsights-frontend || true
ROLLBACK
```

---

## ✅ POST-ROLLBACK VERIFICATION

After rollback, verify these immediately:

```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Check BUILD_ID
cat /var/www/frontend/.next/BUILD_ID
# Should show: 9v14g-w2CmUPRNt5xWNl_

# Check HTTP
curl -sS -o /dev/null -w "%{http_code}\n" https://prod.qsights.com/
# Should show: 200

# Check PM2
pm2 list
# qsights-frontend should be 'online'

# Check logs for errors
pm2 logs qsights-frontend --lines 20 --nostream
# Should NOT show errors
```

**Browser Test:**
1. Open incognito: `https://prod.qsights.com`
2. Login: `superadmin@qsights.com`
3. Should redirect to dashboard successfully

---

## 📁 BACKUP LOCATIONS

### Primary Backup
```
/var/www/frontend/.next.backup_20260210_154452
BUILD_ID: 9v14g-w2CmUPRNt5xWNl_
```

### Additional Backups (if needed)
```bash
# List all available backups
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "ls -lhtr /var/www/frontend/.next.backup* /var/www/frontend/.next.prev_* 2>/dev/null | tail -n 10"
```

### Local Build (for re-deployment)
```
/Users/yash/Documents/Projects/QSightsOrg2.0/frontend/.next
BUILD_ID: -PfZ6kpl6AzU7yOa7ACMC
Tarball: /tmp/frontend_login_fix_20260210_211043.tar.gz (77MB)
```

---

## 🔍 TROUBLESHOOTING

### Issue: "No backup found"
```bash
# List all .next directories
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "ls -ld /var/www/frontend/.next* 2>/dev/null"

# If backups were deleted, you can restore from the old broken build
# The broken build is moved to .next.failed_* during rollback
```

### Issue: "Permission denied"
```bash
# Fix permissions on backup
sudo chown -R ubuntu:ubuntu /var/www/frontend/.next.backup*
sudo chmod -R u+rwX /var/www/frontend/.next.backup*
```

### Issue: PM2 won't restart
```bash
# Kill and restart PM2
pm2 kill
pm2 start /var/www/frontend/ecosystem.config.js

# Or manual start
cd /var/www/frontend
pm2 start npm --name "qsights-frontend" -- start
```

### Issue: Still getting 502 errors
```bash
# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check if port 3000 is listening
sudo ss -tlnp | grep :3000

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🆘 EMERGENCY CONTACTS

If rollback fails completely:

1. **Check server logs:**
   ```bash
   pm2 logs qsights-frontend --lines 100 --nostream
   sudo tail -n 100 /var/log/nginx/error.log
   ```

2. **Nuclear option - Restore from tarball:**
   ```bash
   # Re-upload previous working tarball (if you have it)
   # Or rebuild from last working commit
   ```

3. **Last resort - Use staging backup:**
   ```bash
   # If you have a backup from pre-prod or staging
   # Copy that backup to production
   ```

---

## 📝 WHAT WAS CHANGED

### Files Modified
- **Local:** `frontend/components/landing-page.tsx`
  - Added: `import { getRedirectUrl } from "@/lib/auth"`
  - Modified: Login handler to fallback to `getRedirectUrl()` when backend doesn't provide redirectUrl

### Root Cause
- Production Nginx routes `/api/*` directly to Laravel
- Laravel doesn't return `redirectUrl` in login response
- Frontend tried to use undefined `data.redirectUrl`
- Users were redirected to nothing → stayed on login page

### Fix Applied
- Added fallback logic: uses `getRedirectUrl(user.role)` when `data.redirectUrl` is missing
- Handles both Next.js API route (with redirectUrl) and direct Laravel API (without)

---

## 🔒 SECURITY NOTE

**DO NOT** share this file publicly. It contains:
- Server IP addresses
- PEM file paths
- Internal directory structures

Keep this in a secure location for emergency use only.

---

## ⏱️ ROLLBACK SUCCESS METRICS

After rollback, system should return to:
- **Uptime:** < 30 seconds downtime
- **HTTP /:** 200 OK
- **HTTP /dashboard:** 200 OK
- **PM2 Status:** Online
- **No console errors** in browser DevTools

---

**Last Updated:** February 10, 2026 @ 15:50 UTC  
**Document Version:** 1.0  
**Status:** Active - Ready for Use  
