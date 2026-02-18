# 🚨 CRITICAL: PRODUCTION PATHS - READ BEFORE EVERY DEPLOYMENT

**Last Updated**: 17 February 2026  
**⚠️ MANDATORY READING - Prevents wrong path deployment errors**

---

## 📍 ACTUAL PRODUCTION PATHS (VERIFIED)

### ✅ FRONTEND Path
```
CORRECT PATH: /var/www/QSightsOrg2.0/frontend

❌ WRONG PATH: /var/www/frontend (THIS IS A TRAP! DO NOT USE!)
```

**PM2 Configuration**:
- **exec cwd**: `/var/www/QSightsOrg2.0/frontend`
- **script**: `npm start`
- **BUILD_ID location**: `/var/www/QSightsOrg2.0/frontend/.next/BUILD_ID`

### ✅ BACKEND Path
```
CORRECT PATH: /var/www/QSightsOrg2.0/backend

❌ WRONG PATH: /var/www/backend (DO NOT USE!)
```

**Nginx Configuration**:
- **root**: `/var/www/QSightsOrg2.0/backend/public`

---

## 🔍 HOW TO VERIFY BEFORE DEPLOYMENT

### Check PM2 Frontend Path:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "pm2 describe qsights-frontend | grep 'exec cwd'"
```
**Expected Output**: `exec cwd │ /var/www/QSightsOrg2.0/frontend`

### Check Nginx Backend Path:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo nginx -T 2>/dev/null | grep -A 3 'server_name.*prod.qsights.com' | grep root"
```
**Expected Output**: `root /var/www/QSightsOrg2.0/backend/public;`

---

## 📦 DEPLOYMENT COMMANDS (COPY-PASTE READY)

### Frontend File Deployment:
```bash
# 1. Upload to temp
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  "frontend/app/PATH/TO/FILE.tsx" \
  ubuntu@13.126.210.220:/tmp/temp_file.tsx

# 2. Move to CORRECT path
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo mv /tmp/temp_file.tsx /var/www/QSightsOrg2.0/frontend/app/PATH/TO/FILE.tsx && \
   sudo chown ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/app/PATH/TO/FILE.tsx"

# 3. Rebuild
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "pm2 stop qsights-frontend && \
   cd /var/www/QSightsOrg2.0/frontend && \
   sudo chown -R ubuntu:ubuntu . && \
   sudo rm -rf .next && \
   npm run build && \
   pm2 restart qsights-frontend"
```

### Backend File Deployment:
```bash
# 1. Upload to temp
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  "backend/PATH/TO/FILE.php" \
  ubuntu@13.126.210.220:/tmp/temp_file.php

# 2. Move to CORRECT path
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo mv /tmp/temp_file.php /var/www/QSightsOrg2.0/backend/PATH/TO/FILE.php && \
   sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/PATH/TO/FILE.php"

# 3. Clear cache
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "cd /var/www/QSightsOrg2.0/backend && \
   php artisan config:clear && \
   php artisan route:clear && \
   php artisan cache:clear"
```

---

## ❌ COMMON MISTAKES TO AVOID

### Mistake #1: Deploying to /var/www/frontend instead of /var/www/QSightsOrg2.0/frontend
**Why it fails**: PM2 serves from `/var/www/QSightsOrg2.0/frontend`, so files in `/var/www/frontend` are never used

### Mistake #2: Deploying to /var/www/backend instead of /var/www/QSightsOrg2.0/backend
**Why it fails**: Nginx root points to `/var/www/QSightsOrg2.0/backend/public`

### Mistake #3: Not rebuilding after frontend file changes
**Why it fails**: Next.js needs to rebuild `.next` folder to include new code

### Mistake #4: Permission errors during build
**Fix**: `sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend`

---

## 🧪 POST-DEPLOYMENT VERIFICATION

### 1. Check BUILD_ID changed:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "cat /var/www/QSightsOrg2.0/frontend/.next/BUILD_ID"
```

### 2. Check PM2 status:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "pm2 status"
```
**Expected**: Status = `online`

### 3. Check site responds:
```bash
curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com
```
**Expected**: `200`

### 4. Check deployed file exists:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "ls -la /var/www/QSightsOrg2.0/frontend/app/PATH/TO/FILE.tsx"
```

---

## 🗺️ DIRECTORY STRUCTURE (VISUAL MAP)

```
Production Server (13.126.210.220):

/var/www/
├── frontend/                          # ❌ WRONG! This is NOT used by PM2
│   └── (old files from wrong deployment)
│
└── QSightsOrg2.0/                     # ✅ CORRECT! Actual production location
    ├── frontend/                       # ✅ PM2 serves from HERE
    │   ├── .next/                     # Build output
    │   │   └── BUILD_ID               # Check this to verify deployment
    │   ├── app/
    │   │   ├── questionnaires/[id]/page.tsx
    │   │   └── activities/take/[id]/page.tsx
    │   ├── package.json
    │   └── node_modules/
    │
    └── backend/                        # ✅ Nginx serves from HERE
        ├── public/                    # Nginx root
        │   └── index.php
        ├── app/
        │   ├── Models/
        │   ├── Http/Controllers/
        │   └── ...
        └── database/
            └── migrations/
```

---

## 📝 QUICK CHECKLIST BEFORE DEPLOYMENT

- [ ] Verify PM2 path: `/var/www/QSightsOrg2.0/frontend`
- [ ] Verify Nginx backend: `/var/www/QSightsOrg2.0/backend/public`
- [ ] Upload to `/tmp` first
- [ ] Move to `/var/www/QSightsOrg2.0/...` (NOT `/var/www/...`)
- [ ] Fix ownership: `ubuntu:ubuntu` for frontend, `www-data:www-data` for backend
- [ ] Rebuild frontend if .tsx/.ts files changed
- [ ] Clear Laravel cache if backend files changed
- [ ] Verify BUILD_ID changed
- [ ] Check PM2 status = online
- [ ] Test site responds with HTTP 200

---

## 🚨 EMERGENCY ROLLBACK

If deployment breaks the site:

### Frontend Rollback:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "cd /var/www/QSightsOrg2.0/frontend && \
   git checkout HEAD -- app/ && \
   npm run build && \
   pm2 restart qsights-frontend"
```

### Backend Rollback:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "cd /var/www/QSightsOrg2.0/backend && \
   git checkout HEAD -- app/ database/migrations/ && \
   php artisan config:clear && \
   php artisan route:clear"
```

---

**⚠️ ALWAYS VERIFY PATHS BEFORE RUNNING DEPLOYMENT COMMANDS!**

**The #1 cause of deployment failures is deploying to wrong paths.**

**When in doubt, check PM2 and Nginx configs first.**
