# 🔐 COMPLETE BACKUP & RESTORE DOCUMENTATION
## Date: February 05, 2026

---

## 📦 BACKUP LOCATIONS

### 1. LOCAL BACKUP
**Location:** `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/FULL_BACKUP_20260205_124433/`

**Contents:**
- `LOCAL_COMPLETE.tar.gz` (233 MB)
  - Full backend source code (excluding vendor)
  - Full frontend source code (excluding node_modules, .next)
  - All documentation files (*.md)
  - All deployment scripts (*.sh)
  - Configuration files (*.conf)

**Backup Command:**
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
BACKUP_DIR="backups/FULL_BACKUP_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
tar --exclude='node_modules' --exclude='.next' --exclude='vendor' --exclude='backups' --exclude='.git' \
    -czf $BACKUP_DIR/LOCAL_COMPLETE.tar.gz frontend/ backend/ docs/ *.md *.sh *.conf
```

**Kept Backups:** Last 2 backups only
- FULL_BACKUP_20260205_124433 (Latest)
- FULL_BACKUP_20260205_124042 (Previous)

---

### 2. PRODUCTION SERVER BACKUP
**Server:** 13.126.210.220 (prod.qsights.com)  
**Location:** `/home/ubuntu/backups/production_backup_20260205_072017/`

**Contents:**
- `backend.tar.gz` (1.7 MB)
  - Complete backend source code (excluding vendor, logs)
  - All migrations, models, controllers
  - Configuration files
  
- `frontend.tar.gz` (238 MB)
  - Complete frontend source code
  - Includes built .next directory
  - All components, pages, and assets
  
- `database_backup.sql` (153 bytes - placeholder)
  - Note: Full DB backup requires PostgreSQL 17 client

**Backup Commands:**
```bash
# SSH into server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Create backup
BACKUP_DIR="production_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p /home/ubuntu/backups/$BACKUP_DIR

# Backend
tar --exclude='vendor' --exclude='node_modules' --exclude='storage/logs/*' \
    -czf /home/ubuntu/backups/$BACKUP_DIR/backend.tar.gz -C /var/www QSightsOrg2.0/backend

# Frontend
tar --exclude='node_modules' --exclude='.next/cache' \
    -czf /home/ubuntu/backups/$BACKUP_DIR/frontend.tar.gz -C /var/www frontend

# Database (requires pg_dump)
export PGPASSWORD=$(grep DB_PASSWORD /var/www/QSightsOrg2.0/backend/.env | cut -d'=' -f2)
pg_dump -h qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com \
    -U qsights_user -d qsights-db --no-owner --no-acl | \
    gzip > /home/ubuntu/backups/$BACKUP_DIR/database_backup.sql.gz
```

**Cleaned Up:** All old backups removed, keeping only latest

---

### 3. GIT REPOSITORY BACKUP
**Repository:** https://github.com/yashbant-mahanty/qsights-vibe.git  
**Branch:** `Production-Package-Feb-05-2026`  
**Commit:** `554bc96`

**Contents:**
- Complete backend source code
- Complete frontend source code
- All migrations and database scripts
- All documentation files
- Deployment scripts
- Cleanup and maintenance scripts
- **EXCLUDED:** SendGrid API credentials, .env files, node_modules, vendor

**Access:**
```bash
# Clone the production package
git clone -b Production-Package-Feb-05-2026 https://github.com/yashbant-mahanty/qsights-vibe.git qsights-production-restore

# Or checkout existing repo
cd /Users/yash/Documents/Projects/QSightsOrg2.0
git fetch origin
git checkout Production-Package-Feb-05-2026
```

**Branch Features:**
- Enhanced Data Safety Settings (4 tabs: Settings, Health, Backups, Maintenance)
- Database backup and clean data functionality
- System Role management
- AI Reporting with context management
- Set Reminder feature
- Complete SDD architecture
- All recent fixes and enhancements

---

## 🔄 RESTORE PROCEDURES

### RESTORE FROM LOCAL BACKUP

#### Full Local Restore
```bash
# Navigate to restore location
cd /Users/yash/Documents/Projects
mkdir QSightsOrg2.0_RESTORED
cd QSightsOrg2.0_RESTORED

# Extract backup
tar -xzf /Users/yash/Documents/Projects/QSightsOrg2.0/backups/FULL_BACKUP_20260205_124433/LOCAL_COMPLETE.tar.gz

# Install dependencies
cd backend && composer install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with database credentials

# Build frontend
cd frontend && npm run build
```

**Time Required:** ~15 minutes

---

### RESTORE TO PRODUCTION SERVER

#### 1. Backend Restore
```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Stop services (optional)
cd /var/www/QSightsOrg2.0/backend && php artisan down

# Extract backup
cd /tmp
tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/backend.tar.gz
sudo rm -rf /var/www/QSightsOrg2.0/backend.OLD
sudo mv /var/www/QSightsOrg2.0/backend /var/www/QSightsOrg2.0/backend.OLD
sudo mv QSightsOrg2.0/backend /var/www/QSightsOrg2.0/
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend

# Install dependencies
cd /var/www/QSightsOrg2.0/backend
composer install --no-dev --optimize-autoloader

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Restart
php artisan up
```

**Time Required:** ~5 minutes

#### 2. Frontend Restore
```bash
# Extract backup
cd /tmp
tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/frontend.tar.gz
sudo rm -rf /var/www/frontend.OLD
sudo mv /var/www/frontend /var/www/frontend.OLD
sudo mv frontend /var/www/
sudo chown -R www-data:www-data /var/www/frontend

# If .next not included, rebuild
cd /var/www/frontend
sudo -u www-data NODE_ENV=production npm run build

# Restart PM2
pm2 restart qsights-frontend
pm2 status
```

**Time Required:** ~10 minutes (with rebuild) or ~2 minutes (without rebuild)

#### 3. Database Restore
```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Extract SQL backup
cd /home/ubuntu/backups/production_backup_20260205_072017
gunzip -c database_backup.sql.gz > database_backup.sql

# Get DB credentials
cd /var/www/QSightsOrg2.0/backend
export PGPASSWORD=$(grep DB_PASSWORD .env | cut -d'=' -f2)
DB_HOST=$(grep DB_HOST .env | cut -d'=' -f2)
DB_USER=$(grep DB_USERNAME .env | cut -d'=' -f2)
DB_NAME=$(grep DB_DATABASE .env | cut -d'=' -f2)

# WARNING: This will DROP and recreate the database
# Restore database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < /home/ubuntu/backups/production_backup_20260205_072017/database_backup.sql
```

**Time Required:** ~5-15 minutes (depends on database size)

---

### RESTORE FROM GIT

#### Full Git Restore
```bash
# Clone production package
cd /tmp
git clone -b Production-Package-Feb-05-2026 https://github.com/yashbant-mahanty/qsights-vibe.git qsights-restore

# Local Development Setup
cd qsights-restore

# Backend
cd backend
composer install
cp .env.example .env
# Edit .env with your credentials
php artisan key:generate
php artisan migrate

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with API URL
npm run build
npm start

# Or for production deployment
# Copy to server using scp and follow "Restore to Production Server" steps above
```

**Time Required:** ~20 minutes

---

## 🚨 EMERGENCY ROLLBACK (1-COMMAND)

### Quick Rollback - Backend Only
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "\
cd /tmp && \
tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/backend.tar.gz && \
sudo rm -rf /var/www/QSightsOrg2.0/backend && \
sudo mv QSightsOrg2.0/backend /var/www/QSightsOrg2.0/ && \
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend && \
cd /var/www/QSightsOrg2.0/backend && \
php artisan config:clear && php artisan cache:clear && \
echo 'Backend rolled back successfully'"
```

### Quick Rollback - Frontend Only
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "\
cd /tmp && \
tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/frontend.tar.gz && \
sudo rm -rf /var/www/frontend && \
sudo mv frontend /var/www/ && \
sudo chown -R www-data:www-data /var/www/frontend && \
pm2 restart qsights-frontend && \
echo 'Frontend rolled back successfully'"
```

### Full System Rollback
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "\
cd /tmp && \
echo '=== Extracting backups ===' && \
tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/backend.tar.gz && \
tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/frontend.tar.gz && \
echo '=== Rolling back backend ===' && \
sudo rm -rf /var/www/QSightsOrg2.0/backend && \
sudo mv QSightsOrg2.0/backend /var/www/QSightsOrg2.0/ && \
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend && \
echo '=== Rolling back frontend ===' && \
sudo rm -rf /var/www/frontend && \
sudo mv frontend /var/www/ && \
sudo chown -R www-data:www-data /var/www/frontend && \
echo '=== Clearing caches ===' && \
cd /var/www/QSightsOrg2.0/backend && \
php artisan config:clear && php artisan cache:clear && \
pm2 restart qsights-frontend && \
echo '=== ROLLBACK COMPLETE ==='"
```

**Time Required:** ~2-3 minutes

---

## 📊 BACKUP SUMMARY

| Location | Path | Size | Includes DB | Status |
|----------|------|------|-------------|--------|
| **Local** | `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/FULL_BACKUP_20260205_124433/` | 233 MB | ❌ | ✅ Active |
| **Production** | `/home/ubuntu/backups/production_backup_20260205_072017/` | 240 MB | ⚠️ Partial | ✅ Active |
| **Git** | `Production-Package-Feb-05-2026` branch | ~76 MB | ❌ | ✅ Active |

---

## 🗂️ CLEANUP COMPLETED

### Local Cleanup
- ✅ Removed old backups (kept last 2)
- ✅ Removed individual file backups (*.backup_*)
- ✅ Removed temporary directories
- ✅ Removed old COMPLETE_BACKUP folders

### Production Cleanup
- ✅ Removed emergency backups from Jan-Feb 2026
- ✅ Removed checkpoint backups
- ✅ Removed pre-evaluation backups
- ✅ Kept only latest production_backup_20260205_072017

### Database Cleanup
- ⚠️ Pending: Soft-deleted records cleanup
- 📝 Can be done via System Settings → Data Safety → Maintenance tab
- 🔧 Or use: `php /var/www/QSightsOrg2.0/backend/cleanup_deleted_data.php --live`

---

## 🔐 DATABASE CREDENTIALS

**Location:** `/var/www/QSightsOrg2.0/backend/.env`

```bash
DB_HOST=qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com
DB_DATABASE=qsights-db
DB_USERNAME=qsights_user
DB_PASSWORD=[Stored securely in .env]
```

**For Database Operations:**
```bash
# Connect to database
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
cd /var/www/QSightsOrg2.0/backend
export PGPASSWORD=$(grep DB_PASSWORD .env | cut -d'=' -f2)
psql -h qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com -U qsights_user -d qsights-db
```

---

## 🎯 VERIFICATION CHECKLIST

After restore, verify:

### Backend
- [ ] `curl http://localhost:8000/api/health` returns 200
- [ ] Laravel logs clean: `tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`
- [ ] Migrations current: `php artisan migrate:status`

### Frontend
- [ ] `curl http://localhost:3001` returns HTML
- [ ] PM2 status online: `pm2 status`
- [ ] No errors in PM2 logs: `pm2 logs qsights-frontend --lines 50`

### Production Site
- [ ] https://prod.qsights.com returns 200
- [ ] Login works
- [ ] Dashboard loads
- [ ] Data Safety settings accessible
- [ ] Activities page functional

---

## 📞 SUPPORT INFORMATION

**Server Access:**
- **IP:** 13.126.210.220
- **Key:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- **User:** ubuntu
- **Command:** `ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220`

**Application Paths:**
- **Backend:** `/var/www/QSightsOrg2.0/backend`
- **Frontend:** `/var/www/frontend`
- **Backups:** `/home/ubuntu/backups`

**PM2:**
- **App Name:** qsights-frontend
- **Port:** 3001
- **Commands:** `pm2 status`, `pm2 logs qsights-frontend`, `pm2 restart qsights-frontend`

**Nginx:**
- **Config:** `/etc/nginx/sites-available/qsights`
- **Restart:** `sudo systemctl restart nginx`

---

## 🎉 BACKUP COMPLETION STATUS

✅ **Local Backup:** Complete (233 MB)  
✅ **Production Backup:** Complete (240 MB, backend + frontend)  
✅ **Git Backup:** Complete (Branch: Production-Package-Feb-05-2026)  
✅ **Local Cleanup:** Complete (Kept last 2)  
✅ **Production Cleanup:** Complete (Kept only latest)  
⚠️ **Database Backup:** Requires PostgreSQL 17 client (can be done via System Settings UI)  
✅ **Documentation:** Complete  

---

## 📝 NOTES

1. **Database Backups:** Use System Settings → Data Safety → Maintenance → "Create Database Backup" for full PostgreSQL backup
2. **SendGrid Credentials:** NOT included in Git backup (security)
3. **.env Files:** NOT included in Git backup (security)
4. **Quick Restore:** Use emergency rollback commands for fastest recovery
5. **Full Restore:** Use detailed procedures for complete system rebuild

---

**Document Created:** February 05, 2026  
**Last Updated:** February 05, 2026  
**Backup ID:** 20260205_072017  
**Git Branch:** Production-Package-Feb-05-2026  
**Commit:** 554bc96
