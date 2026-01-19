# Restore Point - 18 Jan 2026 - PM2 & Cache Fix

**Date:** 18 January 2026  
**Status:** ✅ WORKING - Frontend serving correctly

## Problem That Was Fixed

- Browser getting 404 errors for Next.js chunks (5615-5ad9b2cda9e9df36.js, page-ad0045f017b8617b.js)
- ChunkLoadError and React error #423
- Duplicate PM2 instances (root + ubuntu) causing conflicts
- Permission errors with `.next/cache` directory

## Current Working Configuration

### PM2 Setup
```bash
# Only ONE instance running as ubuntu user (NOT root)
pm2 list
# Should show:
# - qsights-frontend: online, user: ubuntu, pid: 507131+
```

### File Permissions
```bash
# .next directory ownership
ubuntu:www-data with 775 permissions

# Verify with:
ls -ld /var/www/QSightsOrg2.0/frontend/.next/
ls -ld /var/www/QSightsOrg2.0/frontend/.next/cache/
```

### Current Build Info
- **Build ID:** `KuYgKV_h34C6MqpbwMX3B`
- **Build Date:** Jan 18 08:20 UTC
- **Correct Chunk:** `5615-44bb8595984c16e9.js` (exists on server)
- **Server Response:** 200 OK on http://localhost:3000

### Nginx Configuration
```nginx
location /_next/static {
    alias /var/www/QSightsOrg2.0/frontend/.next/static;
    expires 365d;
    access_log off;
    add_header Cache-Control "public, immutable";
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
```

## Restore Commands (If Issues Occur)

### 1. Stop All PM2 Instances
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  pm2 stop qsights-frontend
  pm2 delete qsights-frontend
  sudo pm2 stop all
  sudo pm2 delete all
"
```

### 2. Clear Next.js Cache
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  cd /var/www/QSightsOrg2.0/frontend
  sudo rm -rf .next/cache
"
```

### 3. Fix Permissions
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  cd /var/www/QSightsOrg2.0/frontend
  sudo chown -R ubuntu:www-data .next/
  sudo chmod -R 775 .next/
"
```

### 4. Start PM2 (As Ubuntu User)
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  cd /var/www/QSightsOrg2.0/frontend
  pm2 start npm --name qsights-frontend -- start
  pm2 save
"
```

### 5. Reload Nginx
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  sudo systemctl reload nginx
"
```

## Verification Commands

### Check PM2 Status
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  pm2 list
  sudo pm2 list  # Should be empty
"
```

### Check Logs
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  pm2 logs qsights-frontend --lines 20 --nostream
"
```

### Check Local Server
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  curl -s -o /dev/null -w '%{http_code}' http://localhost:3000
"
# Should return: 200
```

### Check Chunk Files
```bash
ssh -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  ls -lh /var/www/QSightsOrg2.0/frontend/.next/static/chunks/5615*.js
  cat /var/www/QSightsOrg2.0/frontend/.next/BUILD_ID
"
```

### Verify HTML References
```bash
curl -s https://prod.qsights.com | grep -o '5615-[a-f0-9]*\.js' | head -3
```

## Key Lessons

1. **Never run PM2 as root and ubuntu simultaneously** - causes conflicts
2. **Always check file permissions** - ubuntu user needs write access to .next/cache
3. **Clear Next.js cache after deployment** - prevents stale cache issues
4. **Browser cache matters** - users may need hard refresh (Cmd+Shift+R)
5. **Single PM2 instance** - run as ubuntu user only

## Client-Side Fix for Users

If users see 404 errors after deployment:
1. Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. Or clear browser cache for prod.qsights.com
3. Or open in incognito mode

## Related Files

- Frontend location: `/var/www/QSightsOrg2.0/frontend`
- Nginx config: `/etc/nginx/sites-available/qsights`
- PM2 logs: `/home/ubuntu/.pm2/logs/`
- Laravel logs: `/var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`

## Production Server

- **IP:** 13.126.210.220
- **Domain:** prod.qsights.com
- **SSH Key:** ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
- **User:** ubuntu

---

**⚠️ DO NOT DELETE THIS FILE - It's a restore checkpoint**
