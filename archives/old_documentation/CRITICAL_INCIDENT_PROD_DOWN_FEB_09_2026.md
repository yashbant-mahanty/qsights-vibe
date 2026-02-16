# CRITICAL INCIDENT REPORT - Production Outage
**Date:** February 09, 2026  
**Time:** ~11:00 UTC  
**Severity:** CRITICAL  
**Status:** RESOLVED ✅  
**Duration:** ~17 minutes

---

## Incident Summary
Production site (prod.qsights.com) was completely down with 502 Bad Gateway errors. Frontend application was in a crashed state with 113+ failed restart attempts.

## Root Cause Analysis

### Primary Issues Identified
1. **Missing node_modules** - Frontend dependencies were completely absent
   - Path: `/var/www/QSightsOrg2.0/frontend/node_modules/`
   - Caused immediate crash on startup: `sh: 1: next: not found`

2. **PM2 Process Corruption** - Frontend process stuck in error loop
   - Status: "errored" with 113 restart attempts
   - Mode: cluster (should be fork)

3. **Nginx Configuration Error** - Wrong static files path
   - Was: `/var/www/frontend/.next/static`
   - Correct: `/var/www/QSightsOrg2.0/frontend/.next/static`
   - Result: All CSS/JS files returned 404 errors

### Contributing Factors
- File ownership issues (501:staff instead of ubuntu:ubuntu)
- Possibly caused by deployment using rsync from macOS which preserved wrong ownership
- Old backup was restored at some point, missing recent updates

---

## Resolution Steps Taken

### 1. Fixed File Permissions
```bash
sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend
```

### 2. Reinstalled Dependencies
```bash
cd /var/www/QSightsOrg2.0/frontend
npm install --omit=dev
# Result: 387 packages installed successfully
```

### 3. Recreated PM2 Process
```bash
pm2 delete qsights-frontend
pm2 start npm --name qsights-frontend -- start
pm2 save
```

### 4. Fixed Nginx Static Path
```bash
sudo sed -i 's|/var/www/frontend/.next/static|/var/www/QSightsOrg2.0/frontend/.next/static|g' /etc/nginx/sites-available/qsights
sudo nginx -t
sudo systemctl reload nginx
```

---

## Current Status

### ✅ Resolved
- [x] Frontend responding (HTTP 200 OK)
- [x] PM2 process stable and online
- [x] Static files loading correctly
- [x] Nginx configuration corrected
- [x] Configuration saved and persistent

### ⚠️ CRITICAL: Missing Recent Updates

**The current production deployment is from an OLD BACKUP and is missing:**

#### 1. Evaluation System Updates
- Recent evaluation enhancements are missing
- Previous fixes deployed between Feb 5-8 not present

#### 2. Landing Page Configuration
- **Missing:** Footer hyperlink updates
- **Missing:** Padding adjustments for left/right align in "Take Activity" event page
- Last working configuration from previous deployment lost

---

## Pre-Fix Backup Taken

Complete backup completed before incident resolution:

### Backup Details - February 09, 2026 06:59 UTC
**Location:** `~/Documents/Backups/QSights_Production_20260209_123341/`

#### 1. Database (PostgreSQL 17.6)
- File: `qsights_db_20260209_065907.dump`
- Size: 14 MB (compressed, level 9)
- Contains: Current production data at time of incident

#### 2. Backend (Laravel)
- File: `qsights_backend_20260209_065934.tar.gz`
- Size: 1.6 MB
- Excludes: node_modules, vendor, logs

#### 3. Frontend (Next.js)
- File: `qsights_frontend_20260209_065947.tar.gz`
- Size: 1.2 GB (includes .next build)
- Contains: Old backup state (missing recent updates)

### Git Backup
- **Branch:** `Production-Package-Feb-09-2026`
- **Repository:** https://github.com/yashbant-mahanty/qsights-vibe.git
- **Status:** ✅ Successfully pushed
- **Size:** 398 MB, 82 files, 15,535 insertions
- **Protected:** SendGrid credentials, .env files, PEM keys excluded

---

## Action Items Required

### 🔴 HIGH PRIORITY - Redeploy Missing Updates

#### 1. Evaluation System Updates
- [ ] Review commits from Feb 5-8
- [ ] Redeploy evaluation enhancements
- [ ] Test evaluation system functionality
- [ ] Verify all evaluation features working

#### 2. Landing Page Configuration
- [ ] Redeploy footer hyperlink updates
- [ ] Fix padding for left/right align in Take Activity event page
- [ ] Test landing page configuration
- [ ] Verify all styling changes applied

#### 3. Verification Checklist
- [ ] Database schema up to date
- [ ] All recent migrations applied
- [ ] Frontend builds include latest changes
- [ ] Backend routes include recent updates
- [ ] All deployment scripts reference correct paths

---

## Lessons Learned

### Immediate Preventive Actions
1. **Add Health Monitoring**
   - Implement uptime monitoring (e.g., UptimeRobot, Pingdom)
   - Alert on 502/503 errors immediately
   - Monitor PM2 process health

2. **Fix Deployment Scripts**
   - Update all deploy scripts to use correct paths:
     - ✅ `/var/www/QSightsOrg2.0/frontend/` (NOT `/var/www/frontend/`)
     - ✅ `/var/www/QSightsOrg2.0/backend/` (NOT `/var/www/backend/`)
   - Review and update all deployment shell scripts
   - Use `--chown=ubuntu:ubuntu` in rsync commands

3. **Nginx Configuration Management**
   - Store nginx config in git repository
   - Verify static paths after every deployment
   - Add nginx config test to deployment scripts

4. **PM2 Best Practices**
   - Use ecosystem.config.js for PM2 configuration
   - Set max_restarts and restart_delay
   - Configure proper logging and error handling

5. **Node Modules Management**
   - Never deploy without node_modules or package-lock.json
   - Consider using `npm ci` for consistent installs
   - Verify `node_modules/.bin/next` exists after install

### Long-term Improvements
- [ ] Implement automated deployment pipeline (CI/CD)
- [ ] Add pre-deployment health checks
- [ ] Create staging environment for testing
- [ ] Document all server paths and configurations
- [ ] Set up automated backup verification
- [ ] Implement blue-green deployment strategy

---

## Technical Details

### Server Information
- **IP:** 13.126.210.220
- **PEM:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- **Instance:** i-0de19fdf0bd6568b5 (AWS)
- **Region:** ap-south-1

### Application Paths
- **Frontend:** `/var/www/QSightsOrg2.0/frontend/`
- **Backend:** `/var/www/QSightsOrg2.0/backend/`
- **Nginx Config:** `/etc/nginx/sites-available/qsights`
- **PM2 Config:** `/home/ubuntu/.pm2/dump.pm2`

### Services Status
- **Nginx:** ✅ nginx/1.18.0 (Ubuntu) - Running
- **PM2:** ✅ qsights-frontend - Online (fork mode)
- **Node.js:** v20.19.6
- **npm:** 10.8.2
- **PHP-FPM:** php8.4-fpm.sock

---

## Contact Information
- **Incident Reporter:** Production monitoring / User report
- **Resolved By:** GitHub Copilot + Yash
- **Documentation:** This file + COMPLETE_BACKUP_FEB_09_2026.md

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| ~10:57 | Frontend starts crashing (PM2 logs show repeated restarts) |
| ~11:00 | 502 Bad Gateway reported |
| ~11:11 | Investigation started, found PM2 errored with 113 restarts |
| ~11:12 | Identified missing node_modules (`next: not found`) |
| ~11:12 | Fixed permissions and ran npm install |
| ~11:13 | Recreated PM2 process, app responding on localhost |
| ~11:14 | Identified nginx static path issue (404 for CSS/JS) |
| ~11:17 | Fixed nginx config, reloaded nginx |
| ~11:17 | **RESOLVED** - Site fully operational |

**Total Downtime:** ~17 minutes

---

## Verification Commands

### Check Frontend Status
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "pm2 list"
curl -I https://prod.qsights.com
```

### Check Static Files
```bash
curl -I https://prod.qsights.com/_next/static/css/a7fdd5a35a3ba7fd.css
```

### Check Nginx Config
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "sudo cat /etc/nginx/sites-available/qsights | grep 'alias.*next'"
```

---

**Document Created:** February 09, 2026  
**Last Updated:** February 09, 2026  
**Related:** COMPLETE_BACKUP_FEB_09_2026.md
