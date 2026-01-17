# QSights Production Deployment Guide

## ⚠️ CRITICAL: Why "Failed to Fetch" Errors Happen

### Root Cause (What Happened on Jan 15, 2026)

The issue occurred because **Next.js embeds `NEXT_PUBLIC_*` environment variables at BUILD TIME, not runtime**.

When you:
1. Build the frontend locally with `npm run build`
2. Your local `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
3. This gets **permanently baked into** the JavaScript files in `.next/` folder
4. When you copy `.next/` folder to production, it still tries to call `localhost:8000`

### The Fix

**Always rebuild on production server** with the correct environment variables:

```bash
# SSH into production server
ssh -i /path/to/key.pem ubuntu@your-server

# Navigate to frontend
cd /var/www/frontend

# Set environment variables and rebuild
NEXT_PUBLIC_API_URL=https://prod.qsights.com/api \
NEXT_PUBLIC_APP_URL=https://prod.qsights.com \
NEXT_PUBLIC_BACKEND_URL=https://prod.qsights.com \
npm run build

# Restart PM2
pm2 restart qsights-frontend --update-env
```

---

## 📋 Correct Deployment Procedure

### Option 1: Deploy and Build on Server (RECOMMENDED)

```bash
# 1. SSH to server via SSM tunnel
aws ssm start-session --target i-xxxxxxxxx --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["22"],"localPortNumber":["3399"]}'

# 2. In another terminal, SSH to localhost:3399
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -p 3399 ubuntu@localhost

# 3. Navigate to frontend
cd /var/www/frontend

# 4. Pull latest code (if using git)
git pull origin main

# 5. Install dependencies if needed
npm install

# 6. Build with production env vars
NEXT_PUBLIC_API_URL=https://prod.qsights.com/api \
NEXT_PUBLIC_APP_URL=https://prod.qsights.com \
NEXT_PUBLIC_BACKEND_URL=https://prod.qsights.com \
npm run build

# 7. Restart PM2
pm2 restart qsights-frontend --update-env
```

### Option 2: Deploy Pre-built Files (Use With Caution)

If you MUST deploy pre-built files:

```bash
# 1. On your LOCAL machine, create production .env.local FIRST
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://prod.qsights.com/api
NEXT_PUBLIC_APP_URL=https://prod.qsights.com
NEXT_PUBLIC_BACKEND_URL=https://prod.qsights.com
EOF

# 2. Build locally
npm run build

# 3. Verify the build doesn't contain localhost
grep -r "localhost:8000" .next/static/ && echo "ERROR: localhost found!" || echo "OK: No localhost"

# 4. Only then copy to server
scp -r .next/ ubuntu@server:/var/www/frontend/
```

---

## 🔍 How to Verify Deployment is Correct

```bash
# Check client-side JS doesn't have localhost
ssh user@server "grep -r 'localhost:8000' /var/www/frontend/.next/static/ | wc -l"
# Should return: 0

# Check prod API URL is present
ssh user@server "grep -c 'prod.qsights.com/api' /var/www/frontend/.next/static/chunks/*.js"
# Should return: 1 or more

# Test pages load
curl -sI https://prod.qsights.com/organizations | head -1
# Should return: HTTP/1.1 200 OK
```

---

## 📊 Data Safety

### Data is NEVER Lost During Frontend Deployments

- **Database**: PostgreSQL on AWS RDS (separate from frontend server)
- **Backend**: Laravel PHP-FPM (unaffected by frontend changes)
- **Files**: S3 storage for uploads (separate service)

Frontend deployment only affects:
- JavaScript/CSS bundles
- Static HTML pages
- Client-side routing

---

## 🛡️ Prevention Checklist

Before any deployment:

- [ ] Verify `.env.local` on production has correct URLs
- [ ] Build on production server OR verify local build has no `localhost`
- [ ] Test pages after deployment
- [ ] Check browser console for API errors

---

## 📞 Quick Recovery

If you see "Failed to fetch" errors:

```bash
# 1. SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -p 3399 ubuntu@localhost

# 2. Rebuild with correct env
cd /var/www/frontend
rm -rf .next
NEXT_PUBLIC_API_URL=https://prod.qsights.com/api \
NEXT_PUBLIC_APP_URL=https://prod.qsights.com \
NEXT_PUBLIC_BACKEND_URL=https://prod.qsights.com \
npm run build

# 3. Restart PM2
pm2 restart qsights-frontend --update-env

# 4. Verify fix
grep -r "localhost:8000" .next/static/ | wc -l  # Should be 0
```

---

## 🏗️ Current Production Architecture

```
User Browser
    ↓ HTTPS
Nginx (443)
    ├── /api/* → PHP-FPM → Laravel Backend → PostgreSQL (RDS)
    └── /* → PM2:3000 → Next.js Frontend
```

**Important**: 
- Backend runs via **PHP-FPM socket**, NOT `artisan serve`
- Frontend connects to API via **https://prod.qsights.com/api**
- Never use localhost:8000 in production builds

---

## 📅 Last Verified Working: January 15, 2026

**Counts at verification:**
- Organizations: 1
- Programs: 1  
- Activities: 3
- Questionnaires: 5
- Participants: 15
- Users: 6
- Responses: 10

All data intact, all pages working.
