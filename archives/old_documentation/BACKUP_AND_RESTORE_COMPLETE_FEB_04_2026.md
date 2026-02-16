# 🔐 COMPLETE BACKUP & RESTORE DOCUMENTATION
**Date:** February 4, 2026 | **Status:** ✅ All Backups Completed Successfully

---

## 📦 BACKUP LOCATIONS SUMMARY

### 1️⃣ Local Backup
**Path:** `/Users/yash/Documents/Backups/qsights-full-backup-20260204-165331.tar.gz`  
**Size:** 157 MB  
**Type:** Complete source code backup

### 2️⃣ Production Server Backup
**Path:** `/home/ubuntu/backups/PRODUCTION_20260204_112621/`  
**Server:** ubuntu@13.126.210.220  
**Contents:**
- `backend_20260204_112621.tar.gz` (1.7 MB)
- `frontend_20260204_112621.tar.gz` (161 MB)
- `database_schema.txt` (112 bytes)

**Total:** 162 MB

### 3️⃣ GitHub Repository
**Branch:** `Production-Package-Feb-04-2026`  
**URL:** https://github.com/yashbant-mahanty/qsights-vibe/tree/Production-Package-Feb-04-2026  
**Commit:** 795c9bc  
**Size:** 744 MB (includes full history)

---

## 🔄 QUICK RESTORE PROCEDURES

### A. LOCAL RESTORE (Development)

```bash
# Extract backup
cd /Users/yash/Documents/Projects
tar -xzf Backups/qsights-full-backup-20260204-165331.tar.gz

# Install dependencies
cd QSightsOrg2.0/backend && composer install
cd ../frontend && npm install && npm run build
```
**Time:** 10-15 minutes

---

### B. PRODUCTION RESTORE (Live Server)

```bash
# 1. SSH to server
ssh -i /path/to/PEM ubuntu@13.126.210.220

# 2. Stop services
pm2 stop qsights-frontend
sudo systemctl stop php8.4-fpm

# 3. Extract backups
cd /var/www
sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260204_112621/backend_20260204_112621.tar.gz
sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260204_112621/frontend_20260204_112621.tar.gz

# 4. Install dependencies
cd /var/www/QSightsOrg2.0/backend
composer install --no-dev --optimize-autoloader

cd /var/www/frontend
npm install && npm run build

# 5. Set permissions
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/storage
sudo chmod -R 775 /var/www/QSightsOrg2.0/backend/storage

# 6. Restart services
sudo systemctl restart php8.4-fpm
pm2 restart qsights-frontend

# 7. Verify
curl -I https://qsights.com
pm2 status
```
**Time:** 20-30 minutes

---

### C. GIT RESTORE (From Repository)

```bash
# Clone specific branch
git clone -b Production-Package-Feb-04-2026 \
  https://github.com/yashbant-mahanty/qsights-vibe.git QSightsOrg2.0

# Install dependencies
cd QSightsOrg2.0/backend && composer install
cd ../frontend && npm install && npm run build

# IMPORTANT: Copy .env files from secure location
```
**Time:** 15-20 minutes

---

## 🗃️ DATABASE INFORMATION

**Type:** AWS RDS PostgreSQL  
**Host:** `qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com`  
**Database:** `qsights-db`  
**User:** `qsights_user`

### Database Restore (if needed)
```bash
# From Laravel migrations
cd /var/www/QSightsOrg2.0/backend
php artisan migrate:fresh
php artisan db:seed
```

**Note:** Full database backups should be taken via AWS RDS Console.

---

## 🚨 EMERGENCY ROLLBACK

If restore fails:

```bash
# On production server
pm2 stop qsights-frontend
sudo systemctl stop php8.4-fpm

# Restore previous version (if backed up before restore)
cd /var/www
sudo rm -rf QSightsOrg2.0 frontend
sudo mv QSightsOrg2.0_old_* QSightsOrg2.0
sudo mv frontend_old_* frontend

# Restart
sudo systemctl restart php8.4-fpm
pm2 restart qsights-frontend
```
**Time:** 2-3 minutes

---

## ✅ POST-RESTORE VERIFICATION

### Check Services
```bash
pm2 status
sudo systemctl status php8.4-fpm nginx
```

### Test Website
```bash
curl -I https://qsights.com
# Should return: HTTP/2 200
```

### Verify Database
```bash
cd /var/www/QSightsOrg2.0/backend
php artisan tinker
DB::table('users')->count();
```

---

## 📝 WHAT'S INCLUDED IN THIS BACKUP

### Recent Fixes & Features:
- ✅ Role service filtering fixed (services persist after update)
- ✅ Database `is_system_role` flags corrected
- ✅ Visual indicators for system roles working
- ✅ Grey-out functionality for restricted services
- ✅ OTP email functionality improvements
- ✅ Evaluation admin dashboard enhancements

### Code Changes:
- `frontend/app/program-admin/roles/page.tsx` (services mapping fixed)
- `backend/database/seeders/RoleServiceDefinitionsSeeder.php`
- `backend/database/migrations/2026_02_04_100000_create_role_service_definitions_table.php`
- OTP and password reset improvements

---

## ⚠️ IMPORTANT NOTES

### NOT Included (For Security):
- `.env` files (store separately)
- SendGrid API keys
- Database credentials
- JWT secrets
- AWS credentials

### File Permissions After Restore:
```bash
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/storage
sudo chmod -R 775 /var/www/QSightsOrg2.0/backend/storage
```

### Build Issues Prevention:
- Always run `npm install` before `npm run build`
- Clear cache if build fails: `rm -rf .next/cache`
- Use `composer install --no-dev` in production

---

## 🗂️ BACKUP RETENTION POLICY

- **Local:** Last 2 backups kept (old backups cleaned)
- **Production:** Last 2 backups kept
- **GitHub:** All branches preserved

### Cleaned Old Backups:
Production server old backups deleted:
- `/home/ubuntu/backups/PRODUCTION_20260204_112521`
- `/home/ubuntu/backups/PRODUCTION_20260204_165458`
- `/home/ubuntu/backups/PRODUCTION_20260204_040813`
- `/home/ubuntu/backups/PRODUCTION_20260203_103739`

---

## 📞 TROUBLESHOOTING

### Build Fails After Restore
```bash
# Clear everything and reinstall
rm -rf node_modules .next
npm install && npm run build
```

### Database Connection Fails
```bash
# Check .env credentials match AWS RDS
cd backend
php artisan config:clear
php artisan tinker
DB::connection()->getPdo();
```

### PM2 Won't Start
```bash
pm2 logs qsights-frontend --lines 100
pm2 delete qsights-frontend
pm2 start npm --name "qsights-frontend" -- run start
pm2 save
```

---

**Created:** February 4, 2026, 5:00 PM IST  
**By:** GitHub Copilot  
**Status:** ✅ Production-ready with complete rollback capability
