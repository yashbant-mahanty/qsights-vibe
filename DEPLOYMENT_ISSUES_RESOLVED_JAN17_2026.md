# Critical Deployment Issues - 17 January 2026

## Issue Summary
Data Safety & Audit Logging System deployment completed successfully on backend, but frontend deployment encountered persistent 404 errors for static assets (webpack chunks, CSS files) despite multiple rebuild and restart attempts.

---

## 🔴 CRITICAL ISSUE #1: Zombie Next.js Process

### Problem
```
ChunkLoadError: Loading chunk 5615 failed.
GET https://prod.qsights.com/_next/static/css/6beba157393daae0.css net::ERR_ABORTED 404 (Not Found)
GET https://prod.qsights.com/_next/static/chunks/5615-c286a5cc098578e6.js net::ERR_ABORTED 404 (Not Found)
```

Browser requesting OLD chunk files that didn't exist in the NEW build.

### Root Cause
**A zombie Next.js server process (PID 441197) from January 16th was still running on port 3000**, serving the old build from yesterday. When PM2 tried to start the new process, it failed with `EADDRINUSE` error but silently crashed in the background, leaving the old server running.

### How We Found It
```bash
# PM2 logs showed EADDRINUSE error
sudo pm2 logs qsights-frontend
# Output: Error: listen EADDRINUSE: address already in use :::3000

# Check what's using port 3000
sudo ss -tulpn | grep :3000
# Output: pid=441197 (next-server from Jan16)

# Confirm process age
sudo ps aux | grep 441197
# Output: Jan16 start time - process from yesterday!
```

### Solution
```bash
# Kill the zombie process
sudo kill -9 441197

# Kill all node processes to be safe
sudo killall -9 node

# Start fresh PM2 process
cd /var/www/QSightsOrg2.0/frontend
sudo pm2 start npm --name qsights-frontend -- start

# Save PM2 configuration
sudo pm2 save
sudo pm2 startup
```

### Prevention
- **Always check for existing processes** before starting new ones
- Use `sudo pm2 delete` instead of just `pm2 stop` to fully remove old instances
- Check port availability: `sudo ss -tulpn | grep :3000`
- Monitor PM2 logs during deployment: `sudo pm2 logs qsights-frontend --lines 50`

---

## 🔴 CRITICAL ISSUE #2: Server-Side Build Mismatch

### Problem
Despite rebuilding multiple times on the server, the HTML served by Next.js still referenced old webpack chunks and CSS files that didn't exist on disk.

### Root Cause
**Next.js aggressive caching** - Pre-rendered HTML pages were cached in:
- `.next/cache` directory
- `.next/server` directory  
- In-memory cache in the Next.js process

Simply running `npm run build` didn't clear these caches, so old HTML continued to be served even with new static assets.

### How We Found It
```bash
# Check what CSS files exist on disk
ls /var/www/QSightsOrg2.0/frontend/.next/static/css/
# Output: bb04ed03886f11df.css, e8561a054ab5fdcc.css

# Check what HTML references
curl -s https://prod.qsights.com/ | grep -o 'static/css/[^"]*\.css'
# Output: 6beba157393daae0.css (OLD FILE - DOESN'T EXIST!)

# Mismatch = cached HTML serving old references
```

### Solution
```bash
# Stop PM2
sudo pm2 stop qsights-frontend

# CRITICAL: Delete entire .next directory, not just rebuild
sudo rm -rf /var/www/QSightsOrg2.0/frontend/.next

# Fresh rebuild
sudo npm run build

# Delete old PM2 instance completely
sudo pm2 delete qsights-frontend

# Start fresh (not restart!)
sudo pm2 start npm --name qsights-frontend -- start
```

### Prevention
- **Never use `pm2 restart` for major deployments** - always `delete` then `start`
- **Always delete `.next` directory** before critical rebuilds
- Use `--force` flag: `next build --force` (if available)
- Clear server cache directories:
  ```bash
  rm -rf .next/cache
  rm -rf .next/server
  ```

---

## 🔴 CRITICAL ISSUE #3: Multiple .next Directories

### Problem
Found TWO `.next` directories on the server in different locations, creating confusion about which build was being served.

### Root Cause
Historical deployment to wrong directory - an old frontend was deployed to `/var/www/frontend/` while current should be in `/var/www/QSightsOrg2.0/frontend/`.

### How We Found It
```bash
# Search for all BUILD_ID files
find /var/www -name "BUILD_ID" -type f
# Output:
# /var/www/frontend/.next/BUILD_ID
# /var/www/QSightsOrg2.0/frontend/.next/BUILD_ID
```

### Solution
```bash
# Remove old frontend directory
sudo rm -rf /var/www/frontend

# Verify nginx serves from correct location
sudo grep "location /_next/static" /etc/nginx/sites-available/qsights
# Output: alias /var/www/QSightsOrg2.0/frontend/.next/static;

# Verify PM2 runs from correct directory
sudo pm2 show qsights-frontend | grep "exec cwd"
# Output: /var/www/QSightsOrg2.0/frontend
```

### Prevention
- Standardize on ONE deployment directory
- Document the canonical path: `/var/www/QSightsOrg2.0/frontend/`
- Add deployment script validation to check directory
- Remove legacy directories during cleanup

---

## 🔴 CRITICAL ISSUE #4: Missing UI Dependencies

### Problem
Build failed on server with:
```
Module not found: Can't resolve '@/components/ui/use-toast'
Module not found: Can't resolve '@radix-ui/react-select'
```

### Root Cause
New DataSafetySettings component required UI components and packages that existed locally but weren't deployed to production server.

### Solution
```bash
# Upload missing UI components
rsync -avz components/ui/{switch.tsx,alert.tsx,badge.tsx,use-toast.ts} ubuntu@server:~/
sudo mv ~/ui_components/* /var/www/QSightsOrg2.0/frontend/components/ui/

# Install missing packages
sudo npm install @radix-ui/react-select @radix-ui/react-switch

# Rebuild
sudo npm run build
```

### Prevention
- **Always run `npm install`** on server after deploying new code
- Check package.json diff before deployment
- Use deployment script to sync dependencies:
  ```bash
  rsync package.json package-lock.json server:~/
  ssh server 'cd /var/www/.../frontend && sudo npm ci'
  ```

---

## 📋 Deployment Checklist (Lessons Learned)

### Pre-Deployment
- [ ] Check for zombie processes: `sudo ss -tulpn | grep :3000`
- [ ] Check current PM2 status: `sudo pm2 list`
- [ ] Backup current .next directory: `sudo cp -r .next .next.backup.$(date +%Y%m%d_%H%M%S)`
- [ ] Note current BUILD_ID: `cat .next/BUILD_ID`

### Deployment Steps
1. **Stop ALL processes**
   ```bash
   sudo pm2 delete qsights-frontend  # NOT just stop!
   sudo killall -9 node  # Nuclear option if needed
   ```

2. **Clean build artifacts**
   ```bash
   sudo rm -rf .next
   sudo rm -rf .next/cache
   sudo rm -rf node_modules/.cache
   ```

3. **Sync dependencies**
   ```bash
   sudo npm ci  # Clean install from package-lock.json
   ```

4. **Fresh build**
   ```bash
   sudo npm run build
   ```

5. **Verify build artifacts**
   ```bash
   cat .next/BUILD_ID
   ls -lh .next/static/css/
   ls -lh .next/static/chunks/webpack-*.js
   ```

6. **Start fresh process**
   ```bash
   sudo pm2 start npm --name qsights-frontend -- start
   ```

7. **Save PM2 config**
   ```bash
   sudo pm2 save
   ```

### Post-Deployment Verification
- [ ] Check PM2 is running: `sudo pm2 list`
- [ ] Check PM2 logs: `sudo pm2 logs qsights-frontend --lines 30`
- [ ] Verify port 3000: `sudo ss -tulpn | grep :3000`
- [ ] Test site loads: `curl -I https://prod.qsights.com/`
- [ ] Check webpack chunk: `curl -s https://prod.qsights.com/ | grep -o 'webpack-[a-z0-9]*\.js'`
- [ ] Verify it exists: `ls .next/static/chunks/webpack-*.js`
- [ ] Test in incognito browser
- [ ] Check browser console for errors

---

## 🎯 Key Takeaways

1. **PM2 restart ≠ fresh start** - Use `delete` then `start` for major deployments
2. **Check for zombie processes** - Old Node.js processes can block new deployments
3. **Always delete .next** - Don't trust rebuild to clear all caches
4. **Verify build artifacts match HTML** - Compare file references in HTML vs disk
5. **Check multiple locations** - Ensure no old deployment directories exist
6. **Test immediately after deployment** - Don't assume success without verification

---

## Server Information

**Production Server:** 13.126.210.220 (AWS EC2)  
**Frontend Path:** `/var/www/QSightsOrg2.0/frontend/`  
**PM2 Process Name:** `qsights-frontend`  
**Port:** 3000  
**Nginx Proxy:** https://prod.qsights.com → http://127.0.0.1:3000  
**PEM File:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`

---

## Emergency Recovery Commands

```bash
# If site is down and unresponsive:

# 1. Kill everything
ssh -i PEM ubuntu@13.126.210.220 'sudo killall -9 node'

# 2. Clean rebuild
ssh -i PEM ubuntu@13.126.210.220 'cd /var/www/QSightsOrg2.0/frontend && sudo rm -rf .next && sudo npm run build'

# 3. Fresh start
ssh -i PEM ubuntu@13.126.210.220 'cd /var/www/QSightsOrg2.0/frontend && sudo pm2 start npm --name qsights-frontend -- start'

# 4. Check logs
ssh -i PEM ubuntu@13.126.210.220 'sudo pm2 logs qsights-frontend --lines 50'
```

---

**Date Resolved:** 17 January 2026  
**Total Time Spent:** ~2 hours debugging  
**Final Status:** ✅ Data Safety UI deployed successfully
