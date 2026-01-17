# QSights Production Deployment Checklist

## 🚨 CRITICAL PRE-DEPLOYMENT CHECKS

### 1. Verify PM2 Configuration
**BEFORE any deployment, ALWAYS verify PM2 is running from the correct directory:**

```bash
ssh -o StrictHostKeyChecking=no -p 3389 -i /path/to/PEM ubuntu@127.0.0.1 "pm2 describe qsights-frontend | grep 'exec cwd'"
```

**Expected Output:**
```
│ exec cwd          │ /var/www/QSightsOrg2.0/frontend                   │
```

**❌ WRONG (DO NOT DEPLOY IF YOU SEE THIS):**
```
│ exec cwd          │ /var/www/frontend                                 │
```

### 2. Production Directory Structure
```
Correct Deployment Path: /var/www/QSightsOrg2.0/
├── backend/          (Laravel PHP backend)
├── frontend/         (Next.js frontend) ← DEPLOY HERE
└── backups/
```

**⚠️ WARNING:** There is an OLD directory at `/var/www/frontend` - DO NOT deploy there!

---

## 📋 FRONTEND DEPLOYMENT STEPS

### Step 1: Verify Current PM2 Working Directory
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 describe qsights-frontend | grep 'exec cwd'"
```
- If shows `/var/www/frontend`, reconfigure PM2 (see Section: Fix PM2 Directory)
- If shows `/var/www/QSightsOrg2.0/frontend`, proceed

### Step 2: Test Local Build
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
npm run build
```
- Must complete without errors
- Check output for file sizes to confirm changes

### Step 3: Deploy Files to Production
```bash
# From local machine
scp -P 3389 -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  /path/to/local/file.tsx \
  ubuntu@127.0.0.1:/tmp/

# On server - move to correct location
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "sudo mv /tmp/file.tsx /var/www/QSightsOrg2.0/frontend/app/path/to/file.tsx && \
   sudo chown ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/app/path/to/file.tsx"
```

### Step 4: Verify File Deployment
```bash
# Check file exists and has correct size
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "ls -lh /var/www/QSightsOrg2.0/frontend/app/path/to/file.tsx"

# Verify file content (if needed)
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "grep -n 'unique string from your change' /var/www/QSightsOrg2.0/frontend/app/path/to/file.tsx"
```

### Step 5: Build on Production
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "cd /var/www/QSightsOrg2.0/frontend && npm run build 2>&1 | tee /tmp/build.log"
```
- Watch for build errors
- Note file size changes for verification
- Build output saved to `/tmp/build.log` for troubleshooting

### Step 6: Clear Next.js Cache
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "cd /var/www/QSightsOrg2.0/frontend && rm -rf .next/cache"
```

### Step 7: Restart PM2
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 restart qsights-frontend"
```

### Step 8: Verify Service Status
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 status"
```
Expected:
```
│ qsights-frontend    │ online    │ fork    │ <pid>    │
```

### Step 9: Check Logs for Errors
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 logs qsights-frontend --lines 20 --nostream"
```
- Should see "✓ Ready in XXXms"
- No critical errors

### Step 10: Reload Nginx (if config changed)
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "sudo nginx -t && sudo systemctl reload nginx"
```

### Step 11: Verify Build Contains Changes
```bash
# Check compiled output contains your changes
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "grep -c 'unique string' /var/www/QSightsOrg2.0/frontend/.next/server/app/path/to/page.js"
```
- Should return count > 0

### Step 12: Test Live Site
- Open **Incognito/Private window** (to avoid browser cache)
- Navigate to: https://prod.qsights.com/
- Login and verify changes are visible
- Check browser console for errors (F12)

---

## 🔧 TROUBLESHOOTING

### Issue: Changes Not Visible After Deployment

#### Check 1: PM2 Working Directory
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 describe qsights-frontend | grep 'exec cwd'"
```
If wrong directory, see "Fix PM2 Directory" below.

#### Check 2: File Actually Deployed
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "wc -l /var/www/QSightsOrg2.0/frontend/app/path/to/file.tsx"
```
Compare line count with local file.

#### Check 3: Build Picked Up Changes
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "ls -lh /var/www/QSightsOrg2.0/frontend/.next/server/app/path/"
```
Check timestamp - should be recent.

#### Check 4: Next.js Cache
```bash
# Clear cache and rebuild
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "cd /var/www/QSightsOrg2.0/frontend && rm -rf .next/cache .next/server && npm run build"
```

#### Check 5: Browser Cache
- Use Incognito/Private window
- Or: Chrome DevTools → Network tab → "Disable cache" (checkbox)
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

---

## 🔄 FIX PM2 DIRECTORY (If Running from Wrong Path)

If PM2 is running from `/var/www/frontend` instead of `/var/www/QSightsOrg2.0/frontend`:

```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "
  pm2 stop qsights-frontend && \
  pm2 delete qsights-frontend && \
  cd /var/www/QSightsOrg2.0/frontend && \
  pm2 start npm --name qsights-frontend -- start && \
  pm2 save
"
```

Verify fix:
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 describe qsights-frontend | grep 'exec cwd'"
```

---

## 📊 BACKEND DEPLOYMENT STEPS

### Step 1: Deploy PHP Files
```bash
scp -P 3389 -i PEM file.php ubuntu@127.0.0.1:/tmp/
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "sudo mv /tmp/file.php /var/www/QSightsOrg2.0/backend/app/path/to/file.php && \
   sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/path/to/file.php"
```

### Step 2: Clear Laravel Cache
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "cd /var/www/QSightsOrg2.0/backend && \
   php artisan config:clear && \
   php artisan cache:clear && \
   php artisan route:clear && \
   php artisan view:clear"
```

### Step 3: Run Migrations (if database changes)
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 \
  "cd /var/www/QSightsOrg2.0/backend && php artisan migrate"
```

### Step 4: Restart PHP-FPM
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "sudo systemctl restart php8.4-fpm"
```

---

## 🔍 VERIFICATION COMMANDS

### Check All Services Status
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "
  echo '=== PM2 Status ===' && pm2 status && \
  echo '=== Nginx Status ===' && sudo systemctl status nginx --no-pager -l | head -10 && \
  echo '=== PHP-FPM Status ===' && sudo systemctl status php8.4-fpm --no-pager -l | head -10
"
```

### Check Disk Space
```bash
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "df -h | grep -E 'Filesystem|/var/www'"
```

### Check Recent Logs
```bash
# Frontend logs
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 logs qsights-frontend --lines 50 --nostream"

# Nginx error logs
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "sudo tail -50 /var/log/nginx/error.log"

# Laravel logs
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "tail -50 /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log"
```

---

## 📝 POST-DEPLOYMENT CHECKLIST

- [ ] PM2 status shows "online"
- [ ] PM2 exec cwd is `/var/www/QSightsOrg2.0/frontend`
- [ ] Build completed without errors
- [ ] .next directory has recent timestamp
- [ ] Site loads in incognito window: https://prod.qsights.com/
- [ ] Changes are visible on live site
- [ ] No console errors in browser DevTools
- [ ] PM2 logs show no critical errors
- [ ] Nginx is running without errors
- [ ] All services restarted successfully

---

## 🚀 QUICK REFERENCE

### SSH Command
```bash
ssh -o StrictHostKeyChecking=no -p 3389 -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@127.0.0.1
```

### SCP Command Template
```bash
scp -P 3389 -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem LOCAL_FILE ubuntu@127.0.0.1:/tmp/
```

### Key Paths
- **Frontend Source:** `/var/www/QSightsOrg2.0/frontend`
- **Backend Source:** `/var/www/QSightsOrg2.0/backend`
- **Nginx Config:** `/etc/nginx/sites-enabled/qsights`
- **PM2 Logs:** `/home/ubuntu/.pm2/logs/`
- **Laravel Logs:** `/var/www/QSightsOrg2.0/backend/storage/logs/`

### Production URL
- **Main Site:** https://prod.qsights.com/
- **API:** https://prod.qsights.com/api/

---

## ⚠️ CRITICAL NOTES

1. **ALWAYS verify PM2 exec cwd BEFORE deploying**
2. **NEVER deploy to `/var/www/frontend`** - it's an old directory
3. **ALWAYS test in incognito window** - browser cache is aggressive
4. **ALWAYS clear .next/cache** after file changes
5. **ALWAYS verify build output** contains your changes before declaring success
6. **ALWAYS check PM2 logs** after restart for startup errors

---

## 📞 EMERGENCY ROLLBACK

If deployment breaks the site:

```bash
# Stop the broken process
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 stop qsights-frontend"

# Restore from backup (if available)
# Or revert files and rebuild

# Start service
ssh -p 3389 -i PEM ubuntu@127.0.0.1 "pm2 start qsights-frontend"
```

---

**Last Updated:** 14 January 2026
**Maintained By:** Development Team
**Review Frequency:** After each major deployment or infrastructure change
