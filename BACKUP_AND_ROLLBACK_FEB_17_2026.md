# Backup and Rollback Guide - February 17, 2026

## Git Repository Backups (PRIMARY - Full Source Code)

### Branch Created: `Production-Package-Feb-17-2026`

| Repository | URL | Branch |
|------------|-----|--------|
| qsights-vibe (origin) | https://github.com/yashbant-mahanty/qsights-vibe.git | `Production-Package-Feb-17-2026` |
| qsights-provibe | https://github.com/yashbant-mahanty/qsights-provibe.git | `Production-Package-Feb-17-2026` |

**Changes in this backup:**
- MCQ scoring fixes for admin reports and evaluator dashboard
- Team reports MCQ scoring with known scales fallback
- Participant Notifications complete
- Event Edit lock feature after approval
- Radio button custom fields in registration form
- Notification bell bug fix (loadNotifications)
- Bell notifications working for all admin roles

**Build ID:** `ZjID15Em9sUVZfvkHbb3v`

---

## 1. LOCAL BACKUP PATHS

### Full Production Backups (Keep last 2)
```
/Users/yash/Documents/Projects/QSightsOrg2.0/backups/
├── FULL_PRODUCTION_BACKUP_20260213_155000/   (529MB)
│   ├── backend_20260213.tar.gz              (25MB - full backend source)
│   ├── frontend_20260213.tar.gz             (512MB - includes node_modules)
│   └── qsights_db_20260213.sql.gz           (17MB - database dump)
│
└── FULL_PRODUCTION_BACKUP_20260216_222849/   (293MB)
    ├── backend_code.tar.gz                   (1.7MB)
    ├── frontend_code.tar.gz                  (84MB)
    ├── qsights_db_20260213.sql.gz            (17MB)
    └── server_code_backup_20260216.tar.gz    (203MB)
```

### Archives (Documentation & Scripts)
```
/Users/yash/Documents/Projects/QSightsOrg2.0/archives/
├── old_documentation/   (724KB - historical docs)
└── old_scripts/         (204KB - old deploy scripts)
```

---

## 2. PRODUCTION SERVER BACKUP PATHS

**Server:** `ubuntu@13.126.210.220`
**PEM:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`

### Main Backup Location
```
/home/ubuntu/backups/   (1.5GB total)
├── backend_20260213.tar.gz              (25MB - backend source code)
├── frontend_20260213.tar.gz             (489MB - frontend source code)
├── qsights_db_20260213.sql.gz           (17MB - PostgreSQL database dump)
├── server_code_backup_20260216.tar.gz   (256MB - latest server code backup)
└── feb_15_2026_reference_fix/           (reference fix backup)
```

### /tmp Backup Location (Temporary)
```
/tmp/
├── frontend-backup-20260216_101103.tar.gz   (86MB)
├── qsights_db_20260213.sql.gz               (17MB)
└── frontend_backup_feb16_*.tar.gz           (small fix backups)
```

### Live Application Paths
```
/var/www/QSightsOrg2.0/
├── frontend/           (Next.js application)
│   └── .next/          (Build output - BUILD_ID: ZjID15Em9sUVZfvkHbb3v)
└── backend/            (Laravel application)
```

---

## 3. ROLLBACK PROCEDURES

### Option A: Git Rollback (Recommended - Full Source)

```bash
# SSH to local machine
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# List available production packages
git branch -a | grep Production-Package

# Checkout specific version
git checkout Production-Package-Feb-17-2026   # Today's backup
git checkout Production-Package-Feb-16-2026   # Previous backup

# Deploy to production
./deploy_frontend_prod.sh
```

### Option B: Server File Rollback

```bash
# SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Restore frontend from backup
cd /var/www/QSightsOrg2.0/frontend
sudo rm -rf .next
sudo tar -xzf /home/ubuntu/backups/frontend_20260213.tar.gz
sudo chown -R www-data:www-data .
pm2 restart qsights-frontend

# Restore backend from backup
cd /var/www/QSightsOrg2.0/backend
sudo tar -xzf /home/ubuntu/backups/backend_20260213.tar.gz
sudo chown -R www-data:www-data .
php artisan cache:clear
php artisan config:clear
```

### Option C: Database Rollback

```bash
# SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Restore database (CAUTION: Overwrites all data!)
cd /home/ubuntu/backups
gunzip -k qsights_db_20260213.sql.gz
sudo -u postgres psql qsights < qsights_db_20260213.sql
```

---

## 4. CREATE NEW BACKUP

### Quick Backup (Git)
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
git checkout -b Production-Package-$(date +%b-%d-%Y)
git add -A
git commit -m "Production Package - $(date +%b\ %d,\ %Y)"
git push origin Production-Package-$(date +%b-%d-%Y)
git push provibe Production-Package-$(date +%b-%d-%Y)
```

### Full Server Backup
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Backup frontend
cd /var/www/QSightsOrg2.0
sudo tar -czf /home/ubuntu/backups/frontend_$(date +%Y%m%d).tar.gz frontend/

# Backup backend
sudo tar -czf /home/ubuntu/backups/backend_$(date +%Y%m%d).tar.gz backend/

# Backup database
sudo -u postgres pg_dump qsights | gzip > /home/ubuntu/backups/qsights_db_$(date +%Y%m%d).sql.gz
```

---

## 5. DEPLOYMENT WORKFLOW

**Always follow this order:**

1. **Test locally** - `npm run dev` / `php artisan serve`
2. **Commit to Git** - Push to qsights-vibe first
3. **Create backup branch** - `Production-Package-<date>`
4. **Deploy to production** - `./deploy_frontend_prod.sh`
5. **Verify** - Check prod.qsights.com

---

## 6. CLEANUP COMPLETED (Feb 17, 2026)

### Local Cleanup
- ✅ Removed: `backend-video-analytics.tar.gz`
- ✅ Removed: `frontend/next-build.tar.gz`
- ✅ Removed: `frontend/manager-review-deployment.tar.gz`
- ✅ Kept: Last 2 full production backups

### Production Server Cleanup
- ✅ Removed: 13 old tar.gz files from /tmp (~3.5GB freed)
- ✅ Removed: Old Feb 14 backups
- ✅ Disk usage reduced: 39% → 33% (freed ~3GB)

### Server Disk Status After Cleanup
```
Filesystem      Size   Used Avail Use%
/dev/root        49G    16G   33G  33%
```

---

## 7. IMPORTANT NOTES

1. **SendGrid credentials** are in `backend/.env` (gitignored, never committed)
2. **Always backup BEFORE deploying** new changes
3. **Git branches contain FULL SOURCE CODE** - not just build files
4. **PEM file location:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`

---

## Quick Reference Commands

```bash
# Connect to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Check PM2 status
pm2 status

# View frontend logs
pm2 logs qsights-frontend

# Restart frontend
pm2 restart qsights-frontend

# Check disk space
df -h /

# List backups
ls -lh /home/ubuntu/backups/
```
