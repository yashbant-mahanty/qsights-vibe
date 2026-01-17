# QSights Production Deployment Guide

## Server Details
- **Production Server**: 13.126.210.220
- **SSH Key**: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- **Frontend Path**: `/var/www/QSightsOrg2.0/frontend`
- **Backend Path**: `/var/www/QSightsOrg2.0/backend`
- **User**: ubuntu
- **Web User**: www-data

## Quick SSH Command
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

---

## DEPLOYMENT METHOD: Direct SSH with sudo

### 1. Copy Single File to Backend
```bash
cat /Users/yash/Documents/Projects/QSightsOrg2.0/backend/path/to/file.php | \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo tee /var/www/QSightsOrg2.0/backend/path/to/file.php > /dev/null"
```

### 2. Copy Single File to Frontend
```bash
cat /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/path/to/file.tsx | \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo tee /var/www/QSightsOrg2.0/frontend/path/to/file.tsx > /dev/null"
```

### 3. Create New Directory on Server
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo mkdir -p /var/www/QSightsOrg2.0/frontend/path/to/new/folder"
```

### 4. Set Permissions After Copy
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend && sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/frontend"
```

---

## POST-DEPLOYMENT COMMANDS

### Backend - Clear Cache & Restart
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"cd /var/www/QSightsOrg2.0/backend && sudo php artisan config:cache && sudo php artisan route:cache && sudo php artisan cache:clear"
```

### Backend - Install Composer Dependencies
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"cd /var/www/QSightsOrg2.0/backend && sudo composer install --no-dev --optimize-autoloader"
```

### Frontend - Build & Restart
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"cd /var/www/QSightsOrg2.0/frontend && sudo npm run build 2>&1 | tail -20 && pm2 restart qsights-frontend --update-env"
```

### Check PM2 Status
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "pm2 status"
```

### Check Backend Logs
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo tail -50 /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log"
```

---

## COMMON DEPLOYMENT SCENARIOS

### Deploy PHP Controller
```bash
# 1. Copy file
cat /Users/yash/Documents/Projects/QSightsOrg2.0/backend/app/Http/Controllers/Api/MyController.php | \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo tee /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/MyController.php > /dev/null"

# 2. Clear caches
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"cd /var/www/QSightsOrg2.0/backend && sudo php artisan config:cache && sudo php artisan route:cache"
```

### Deploy Routes File
```bash
# 1. Copy routes
cat /Users/yash/Documents/Projects/QSightsOrg2.0/backend/routes/api.php | \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo tee /var/www/QSightsOrg2.0/backend/routes/api.php > /dev/null"

# 2. Clear route cache
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"cd /var/www/QSightsOrg2.0/backend && sudo php artisan route:cache"
```

### Deploy Frontend Page
```bash
# 1. Create directory if needed
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo mkdir -p /var/www/QSightsOrg2.0/frontend/app/settings/system"

# 2. Copy file
cat /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/app/settings/system/page.tsx | \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"sudo tee /var/www/QSightsOrg2.0/frontend/app/settings/system/page.tsx > /dev/null"

# 3. Build & restart
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
"cd /var/www/QSightsOrg2.0/frontend && sudo npm run build 2>&1 | tail -20 && pm2 restart qsights-frontend --update-env"
```

---

## REMINDERS

### 🔴 STAGING/LIVE SETUP (TO BE IMPLEMENTED)
- Create `/var/www/QSightsOrg2.0-staging` folder for testing
- Use different PM2 process name (qsights-staging)
- Use different port (e.g., 3001 for staging, 3000 for live)
- Test in staging first, then copy to live

### Notes
- Always use `sudo tee` for file writes (www-data ownership)
- Always clear caches after backend changes
- Always rebuild frontend after page changes
- Check logs if something doesn't work
