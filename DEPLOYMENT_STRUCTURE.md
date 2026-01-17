# QSights Production Deployment Structure

**Last Updated:** January 14, 2026  
**Status:** ✅ Cleaned and Verified

## Production Server Structure

### Frontend (Next.js)
- **Location:** `/var/www/frontend`
- **PM2 Process:** `qsights-frontend`
- **PM2 Command:** `npm start` (runs Next.js production server on port 3000)
- **Build Directory:** `/var/www/frontend/.next`
- **Ownership:** `ubuntu:ubuntu`
- **Port:** 3000 (internal)

### Backend (Laravel)
- **Location:** `/var/www/QSightsOrg2.0/backend`
- **Public Root:** `/var/www/QSightsOrg2.0/backend/public`
- **Ownership:** `www-data:www-data`
- **PHP-FPM:** Handles PHP requests via nginx

### Nginx Configuration
- **Config File:** `/etc/nginx/sites-available/qsights`
- **Symlink:** `/etc/nginx/sites-enabled/qsights`
- **SSL:** Let's Encrypt (prod.qsights.com)
- **Ports:** 80 (HTTP redirect), 443 (HTTPS)

## Directory Hierarchy

```
/var/www/
├── frontend/                    # ✅ ACTIVE - Single Source of Truth
│   ├── app/                     # Next.js 14 app directory
│   ├── components/              # React components
│   ├── .next/                   # Build output (generated)
│   ├── node_modules/            # Dependencies
│   ├── package.json
│   └── next.config.mjs
│
└── QSightsOrg2.0/
    └── backend/                 # ✅ ACTIVE - Laravel backend
        ├── app/
        ├── public/              # nginx document root
        ├── storage/
        └── vendor/
```

## Deployment Workflow

### For Frontend Changes

1. **Develop Locally:**
   ```bash
   cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
   # Make changes
   npm run dev  # Test locally
   ```

2. **Upload to Production:**
   ```bash
   # Start SSM tunnel
   aws ssm start-session --target i-0de19fdf0bd6568b5 \
     --document-name AWS-StartSSHSession \
     --parameters portNumber=22 \
     --profile default &
   
   # Upload files (use unique names if multiple files)
   scp -P 3319 -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
     app/participants/page.tsx \
     ubuntu@127.0.0.1:/tmp/participants_page.tsx
   
   # SSH and move to correct location
   ssh -p 3319 -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@127.0.0.1
   sudo mv /tmp/participants_page.tsx /var/www/frontend/app/participants/page.tsx
   sudo chown ubuntu:ubuntu /var/www/frontend/app/participants/page.tsx
   ```

3. **Build and Deploy:**
   ```bash
   cd /var/www/frontend
   
   # Clean build
   rm -rf .next
   npm run build
   
   # Verify ownership
   ls -ld .next
   # Should show: ubuntu ubuntu
   
   # Restart PM2
   pm2 restart qsights-frontend
   pm2 status
   
   # Reload nginx
   sudo nginx -s reload
   ```

4. **Verify Deployment:**
   - Check PM2 logs: `pm2 logs qsights-frontend --lines 20`
   - Test in browser with hard refresh: `Cmd + Shift + R`
   - Verify changes are visible

### For Backend Changes

1. **Upload PHP files to:** `/var/www/QSightsOrg2.0/backend/`
2. **Clear Laravel cache:**
   ```bash
   cd /var/www/QSightsOrg2.0/backend
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   ```
3. **Restart PHP-FPM:** `sudo systemctl restart php8.4-fpm`

## Important Notes

### ⚠️ CRITICAL: Build Ownership
- **Always build as `ubuntu` user, NOT root**
- If using `sudo npm run build`, the `.next` directory will be owned by `root`
- This causes permission errors when PM2 (running as `ubuntu`) tries to write to cache
- **Symptom:** "EACCES" errors and "Failed to find Server Action" errors

### 🔄 Cache Management
- Browser cache can persist old JavaScript bundles
- Always test deployment with:
  1. Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
  2. Incognito window
  3. DevTools with "Disable cache" enabled

### 📦 Backups
- **Local:** `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/`
- **Production:** `/home/ubuntu/backups/`
- Latest backup: `frontend_backup_20260114_090239` (Jan 14, 2026)

### 🚫 Removed Directories
- **Removed:** `/var/www/QSightsOrg2.0/frontend` (was duplicate/legacy)
- **Reason:** Caused confusion, PM2 was using `/var/www/frontend` anyway
- **Backup available at:** `/home/ubuntu/backups/frontend_backup_20260114_090239/frontend_qsights_repo`

## Verification Commands

```bash
# Check PM2 is running from correct directory
pm2 info qsights-frontend | grep "exec cwd"
# Should show: /var/www/frontend

# Verify only one frontend exists
sudo find /var/www -name "frontend" -type d
# Should show only: /var/www/frontend

# Check build ownership
ls -ld /var/www/frontend/.next
# Should show: ubuntu ubuntu

# Check PM2 process
pm2 status
# Should show: qsights-frontend | online

# Check recent logs
pm2 logs qsights-frontend --lines 20
```

## Troubleshooting

### Changes not reflecting in browser
1. Clear browser cache completely
2. Check build was successful: `ls -lh /var/www/frontend/.next/BUILD_ID`
3. Check PM2 is running: `pm2 status`
4. Check PM2 logs for errors: `pm2 logs qsights-frontend`
5. Verify nginx cache headers are set (see nginx config)

### Permission errors in PM2 logs
1. Check `.next` ownership: `ls -ld /var/www/frontend/.next`
2. If owned by root, rebuild as ubuntu:
   ```bash
   cd /var/www/frontend
   rm -rf .next
   npm run build  # WITHOUT sudo
   pm2 restart qsights-frontend
   ```

### PM2 not starting
1. Check working directory: `pm2 info qsights-frontend`
2. Check package.json exists: `ls /var/www/frontend/package.json`
3. Check node_modules: `ls /var/www/frontend/node_modules`
4. Reinstall if needed: `cd /var/www/frontend && npm install`

## Contact
- **Developer:** Yash
- **Server:** AWS EC2 i-0de19fdf0bd6568b5 (Mumbai)
- **Domain:** prod.qsights.com
- **SSH Key:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
