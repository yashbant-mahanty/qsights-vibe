# 🔐 COMPLETE BACKUP & RESTORE DOCUMENTATION
## Date: February 04, 2026

---

## 📊 BACKUP SUMMARY TABLE

| Location | Path | Size | Date |
|----------|------|------|------|
| **LOCAL** | `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/COMPLETE_BACKUP_20260204_092601/` | 157 MB | Feb 04, 2026 09:26 |
| **PRODUCTION SERVER** | `/home/ubuntu/backups/PRODUCTION_20260204_040813/` | 160 MB | Feb 04, 2026 04:08 UTC |
| **GIT REPO** | `https://github.com/yashbant-mahanty/qsights-vibe.git` branch: `production-package` | Full | Feb 04, 2026 |

---

## 1️⃣ LOCAL BACKUP DETAILS

### 📁 Backup Location
```
/Users/yash/Documents/Projects/QSightsOrg2.0/backups/COMPLETE_BACKUP_20260204_092601/
```

### 📦 Backup Contents
| File | Description | Size |
|------|-------------|------|
| `frontend_full.tar.gz` | Complete frontend source (excludes node_modules, .next) | ~155 MB |
| `backend_full.tar.gz` | Complete backend source (excludes vendor, .env, SendGrid files) | ~1.7 MB |
| `root_files.tar.gz` | Config files, scripts, documentation | ~75 KB |
| `docs.tar.gz` | Documentation folders | ~84 KB |

### 🔄 Quick Restore Commands (Local)

#### Restore Frontend:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
rm -rf frontend
tar -xzvf backups/COMPLETE_BACKUP_20260204_092601/frontend_full.tar.gz
cd frontend && npm install && npm run build
```

#### Restore Backend:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
rm -rf backend
tar -xzvf backups/COMPLETE_BACKUP_20260204_092601/backend_full.tar.gz
cd backend && composer install
# IMPORTANT: Copy .env file from secure location
```

#### Restore Root Files:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
tar -xzvf backups/COMPLETE_BACKUP_20260204_092601/root_files.tar.gz
```

---

## 2️⃣ PRODUCTION SERVER BACKUP DETAILS

### 🖥️ Server Information
- **IP:** 13.126.210.220
- **User:** ubuntu
- **SSH Key:** `/Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem`
- **Frontend Path:** `/var/www/frontend/`
- **Backend Path:** `/var/www/QSightsOrg2.0/backend/`

### 📁 Backup Location on Server
```
/home/ubuntu/backups/PRODUCTION_20260204_040813/
```

### 📦 Backup Contents
| File | Description | Size |
|------|-------------|------|
| `frontend_20260204_040813.tar.gz` | Production frontend | ~155 MB |
| `backend_20260204_040813.tar.gz` | Production backend (excludes vendor, .env) | ~4.9 MB |

### 🔗 SSH Access
```bash
ssh -i /Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### 🚨 QUICK RESTORE COMMANDS (Production Server)

#### Option 1: SSH into server and restore manually
```bash
# Connect to server
ssh -i /Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Restore Frontend
cd /var/www
sudo rm -rf frontend.bak && sudo mv frontend frontend.bak
sudo tar -xzvf /home/ubuntu/backups/PRODUCTION_20260204_040813/frontend_20260204_040813.tar.gz
cd frontend
sudo npm install
sudo npm run build
sudo chown -R www-data:www-data /var/www/frontend
pm2 restart qsights-frontend

# Restore Backend
cd /var/www/QSightsOrg2.0
sudo rm -rf backend.bak && sudo mv backend backend.bak
sudo tar -xzvf /home/ubuntu/backups/PRODUCTION_20260204_040813/backend_20260204_040813.tar.gz
cd backend
sudo composer install --no-dev
# IMPORTANT: Copy .env from backend.bak
sudo cp /var/www/QSightsOrg2.0/backend.bak/.env /var/www/QSightsOrg2.0/backend/.env
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend
sudo systemctl restart php8.4-fpm
```

#### Option 2: One-liner restore commands (from local machine)

**Frontend Restore:**
```bash
ssh -i /Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www && sudo mv frontend frontend.bak && sudo tar -xzvf /home/ubuntu/backups/PRODUCTION_20260204_040813/frontend_20260204_040813.tar.gz && cd frontend && sudo npm install && sudo npm run build && sudo chown -R www-data:www-data /var/www/frontend && pm2 restart qsights-frontend"
```

**Backend Restore:**
```bash
ssh -i /Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www/QSightsOrg2.0 && sudo mv backend backend.bak && sudo tar -xzvf /home/ubuntu/backups/PRODUCTION_20260204_040813/backend_20260204_040813.tar.gz && sudo cp backend.bak/.env backend/.env && cd backend && sudo composer install --no-dev && sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend && sudo systemctl restart php8.4-fpm"
```

---

## 3️⃣ GIT REPOSITORY BACKUP

### 📁 Repository Details
- **URL:** https://github.com/yashbant-mahanty/qsights-vibe.git
- **Main Branch:** `main`
- **Backup Branch:** `production-package`
- **Commit:** `0d684d5`
- **Message:** "Production Package Backup - Feb 04, 2026 - Full backup with all fixes and features"

### 🔒 Excluded from Git (Security)
- `.env` files (all environments)
- `.env.local`, `.env.production`, `.env.development`
- `backend/.env`, `backend/.env.production.backup`
- SendGrid related files:
  - `backend/test_sendgrid.php`
  - `backend/update_sendgrid_settings.php`
  - `backend/check_sendgrid_sender.php`
  - `backend/diagnose_sendgrid.php`
  - `backend/test_sendgrid_email.php`
- SSH Keys: `*.pem`, `QSights-Mumbai-12Aug2019.pem`
- `node_modules/`, `vendor/`
- `backups/` folder

### 🔄 Quick Restore from Git

#### Clone Fresh:
```bash
git clone https://github.com/yashbant-mahanty/qsights-vibe.git QSightsOrg2.0
cd QSightsOrg2.0
git checkout production-package
```

#### Restore Specific Branch:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
git fetch origin
git checkout production-package
# or to reset to this backup
git reset --hard 0d684d5
```

#### Restore from Commit:
```bash
git checkout 0d684d5
```

---

## 🚀 COMPLETE ROLLBACK PROCEDURE

### Scenario: Need to rollback everything to Feb 04, 2026 state

#### Step 1: Rollback Production Server
```bash
# SSH to server
ssh -i /Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Backup current state first
ROLLBACK_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/ubuntu/backups/PRE_ROLLBACK_${ROLLBACK_DATE}
cd /var/www && sudo tar -czvf /home/ubuntu/backups/PRE_ROLLBACK_${ROLLBACK_DATE}/frontend_pre_rollback.tar.gz frontend/
cd /var/www/QSightsOrg2.0 && sudo tar -czvf /home/ubuntu/backups/PRE_ROLLBACK_${ROLLBACK_DATE}/backend_pre_rollback.tar.gz backend/

# Restore Frontend
cd /var/www
sudo rm -rf frontend
sudo tar -xzvf /home/ubuntu/backups/PRODUCTION_20260204_040813/frontend_20260204_040813.tar.gz
cd frontend && sudo npm install && sudo npm run build
sudo chown -R www-data:www-data /var/www/frontend
pm2 restart qsights-frontend

# Restore Backend  
cd /var/www/QSightsOrg2.0
sudo rm -rf backend
sudo tar -xzvf /home/ubuntu/backups/PRODUCTION_20260204_040813/backend_20260204_040813.tar.gz
sudo cp backend.bak/.env backend/.env  # or restore from secure backup
cd backend && sudo composer install --no-dev
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend
sudo php artisan config:cache
sudo php artisan route:cache
sudo systemctl restart php8.4-fpm
```

#### Step 2: Rollback Local Development
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Rollback from Git
git checkout production-package
git reset --hard 0d684d5

# OR Rollback from tar backups
rm -rf frontend backend
tar -xzvf backups/COMPLETE_BACKUP_20260204_092601/frontend_full.tar.gz
tar -xzvf backups/COMPLETE_BACKUP_20260204_092601/backend_full.tar.gz
cd frontend && npm install
cd ../backend && composer install
```

#### Step 3: Verify Services
```bash
# On Production Server
pm2 status
sudo systemctl status php8.4-fpm
sudo systemctl status nginx

# Test endpoints
curl -I https://qsights.provibe.app/api/health
```

---

## 📋 CHECKLIST BEFORE ROLLBACK

- [ ] Backup current state before rollback
- [ ] Notify team of planned rollback
- [ ] Check database migrations (may need manual rollback)
- [ ] Verify .env files are preserved
- [ ] Test after rollback
- [ ] Clear caches after restore

---

## ⚠️ IMPORTANT NOTES

1. **NEVER commit .env files** - They contain SendGrid credentials and database passwords
2. **Always backup current state** before any rollback
3. **Database migrations** - This backup doesn't include database. Run migrations if needed:
   ```bash
   cd backend && php artisan migrate
   ```
4. **Vendor/node_modules** - Not included in backups, must run `npm install` / `composer install`
5. **PM2 Process** - Frontend runs via PM2 as `qsights-frontend`
6. **PHP-FPM** - Backend uses PHP 8.4-FPM

---

## 🔑 CREDENTIALS LOCATION (NOT IN BACKUP)

The following must be obtained separately:
- `backend/.env` - Database credentials, SendGrid API key, APP_KEY
- SSH PEM key - stored locally at `/Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem`

---

## 📞 EMERGENCY CONTACTS

For rollback assistance, the backup locations are:
- **Local:** `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/COMPLETE_BACKUP_20260204_092601/`
- **Server:** `/home/ubuntu/backups/PRODUCTION_20260204_040813/`
- **Git:** `git checkout production-package` or commit `0d684d5`

---

**Document Created:** February 04, 2026  
**Last Updated:** February 04, 2026  
**Backup Status:** ✅ COMPLETE
