# QSights Quick Deployment Guide

## ⚡ Production Server Details

- **Server IP**: `13.126.210.220`
- **SSH Key**: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- **User**: `ubuntu`

## 📁 Production Paths (CRITICAL!)

| Component | Production Path |
|-----------|----------------|
| **Frontend** | `/var/www/QSightsOrg2.0/frontend` |
| **Backend** | `/var/www/QSightsOrg2.0/backend` |
| **PM2 CWD** | `/var/www/QSightsOrg2.0/frontend` |

⚠️ **WARNING**: There's also `/var/www/frontend` but PM2 runs from `/var/www/QSightsOrg2.0/frontend`. Always use the correct path!

---

## 🚀 Quick Deployment Commands

### SSH Connection
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### Deploy a Single Frontend File
```bash
cat /path/to/local/file.tsx | ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "sudo tee /var/www/QSightsOrg2.0/frontend/path/to/file.tsx > /dev/null"
```

### Deploy a Single Backend File
```bash
cat /path/to/local/file.php | ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "sudo tee /var/www/QSightsOrg2.0/backend/path/to/file.php > /dev/null"
```

### Rebuild Frontend & Restart
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www/QSightsOrg2.0/frontend && sudo npm run build && pm2 restart qsights-frontend --update-env"
```

### Clear Backend Cache
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www/QSightsOrg2.0/backend && php artisan cache:clear && php artisan config:clear && php artisan view:clear"
```

---

## 📋 Complete Deployment Checklist

### Frontend Changes
1. ✅ Copy file(s) to `/var/www/QSightsOrg2.0/frontend/...`
2. ✅ Run `npm run build` on server
3. ✅ Run `pm2 restart qsights-frontend --update-env`
4. ✅ Hard refresh browser (Cmd+Shift+R)

### Backend Changes
1. ✅ Copy file(s) to `/var/www/QSightsOrg2.0/backend/...`
2. ✅ Clear cache: `php artisan cache:clear && php artisan config:clear && php artisan view:clear`
3. ✅ (Optional) Restart PHP-FPM: `sudo systemctl restart php8.4-fpm`

---

## 🔍 Verify Deployment

### Check PM2 Status
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "pm2 status && pm2 show qsights-frontend | grep 'exec cwd'"
```

### Check File Contents
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "head -20 /var/www/QSightsOrg2.0/frontend/path/to/file.tsx"
```

### Check Build Timestamp
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "ls -la /var/www/QSightsOrg2.0/frontend/.next/BUILD_ID && cat /var/www/QSightsOrg2.0/frontend/.next/BUILD_ID"
```

---

## 🛡️ Common Issues

### Issue: Changes not showing after deployment
**Cause**: Deployed to wrong path (`/var/www/frontend` instead of `/var/www/QSightsOrg2.0/frontend`)
**Solution**: Always use `/var/www/QSightsOrg2.0/frontend`

### Issue: "Failed to fetch" errors
**Cause**: Frontend built with localhost URLs
**Solution**: Rebuild on server with production environment

### Issue: Backend changes not reflecting
**Solution**: Clear all caches:
```bash
php artisan cache:clear && php artisan config:clear && php artisan view:clear && php artisan route:clear
```

---

## 📅 Last Updated: January 16, 2026
