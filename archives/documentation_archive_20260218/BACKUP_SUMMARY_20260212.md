# Complete Backup Summary - February 12, 2026

## 🎯 Production Server Backups

### 1. Full System Backup
**Location:** `/home/ubuntu/backups/full_backup_20260212_205842.tar.gz`
**Size:** 87MB
**Contents:**
- Frontend .next build (jjXvNft6UbTvBc06TB3S1)
- Backend application files (excluding vendor/node_modules)

**Restore Command:**
```bash
cd /var/www
sudo tar -xzf /home/ubuntu/backups/full_backup_20260212_205842.tar.gz
sudo chown -R www-data:www-data frontend/.next backend/
sudo pm2 restart all
```

### 2. Frontend .next Backups (Last 2 Kept)
**Location:** `/var/www/frontend/`
- `.next.backup.20260212_204002` (Latest)
- `.next.backup.20260212_145304` (Previous)

**Restore Command:**
```bash
cd /var/www/frontend
sudo rm -rf .next
sudo cp -r .next.backup.20260212_204002 .next
sudo chown -R www-data:www-data .next
sudo pm2 restart qsights-frontend
```

### 3. Database Backup
**Location:** `/home/ubuntu/backups/qsights_db_20260212_205952.sql.gz`
**Note:** Database backup size is 20 bytes (needs verification)

**Restore Command:**
```bash
gunzip < /home/ubuntu/backups/qsights_db_20260212_205952.sql.gz | mysql -u root qsights_db
```

---

## 💻 Local Development Backups

### Local Project State
**Location:** `/Users/yash/Documents/Projects/QSightsOrg2.0`
**Branch:** Production-Package
**Latest Commit:** bde4a08
**Build ID:** jjXvNft6UbTvBc06TB3S1

### Cleaned Up Files:
- ✅ Removed old .backup shell scripts (older than 7 days)
- ✅ Removed .DS_Store files
- ✅ Removed old page backup files
- ✅ Kept last 2 deployment scripts

---

## 🔄 Git Repository Backup

### Repository Details
**URL:** https://github.com/yashbant-mahanty/qsights-vibe.git
**Branch:** Production-Package
**Latest Commit:** bde4a08

### What's Included:
✅ Full frontend application code
✅ Full backend application code  
✅ All deployment scripts
✅ Migration files
✅ Configuration examples (.env.example files)
✅ Documentation (MD files)

### What's Excluded (Secure):
❌ .env files with actual credentials
❌ SendGrid API keys
❌ Database credentials
❌ AWS credentials
❌ node_modules and vendor folders

**Clone Command:**
```bash
git clone -b Production-Package https://github.com/yashbant-mahanty/qsights-vibe.git
cd qsights-vibe
```

---

## 🛡️ Quick Rollback Procedures

### 1. Rollback Frontend Only
```bash
ssh -i "QSights-Mumbai-12Aug2019.pem" ubuntu@13.126.210.220
cd /var/www/frontend
sudo rm -rf .next
sudo cp -r .next.backup.20260212_204002 .next
sudo chown -R www-data:www-data .next
sudo pm2 restart qsights-frontend
```

### 2. Rollback Full System
```bash
ssh -i "QSights-Mumbai-12Aug2019.pem" ubuntu@13.126.210.220
cd /var/www
sudo tar -xzf /home/ubuntu/backups/full_backup_20260212_205842.tar.gz
sudo chown -R www-data:www-data frontend/.next backend/
sudo pm2 restart all
```

### 3. Restore from Git (Complete Reset)
```bash
# On local machine
cd /Users/yash/Documents/Projects/QSightsOrg2.0
git checkout Production-Package
git pull origin Production-Package

# Build and deploy
cd frontend && npm install && npm run build
# Then follow normal deployment procedure
```

---

## 📊 Deployment Details

### Current Production State
- **Frontend Build ID:** jjXvNft6UbTvBc06TB3S1
- **Deployment Date:** February 12, 2026 15:29 UTC
- **Server:** 13.126.210.220
- **Status:** ✅ Online (HTTP 200)

### Recent Changes Deployed:
1. ✅ Progress bar for "all questions" display mode
2. ✅ Video upload component fixes
3. ✅ Video playback in take activity page
4. ✅ Video UUID handling fixes

### Active Features:
- Multi-section progress tracking
- Video question support with tracking
- SCT Likert scales
- Conditional logic evaluation
- Multi-language support

---

## 🔍 Verification Commands

### Check Production Status
```bash
# Frontend status
curl -I https://prod.qsights.com

# PM2 status
ssh -i "QSights-Mumbai-12Aug2019.pem" ubuntu@13.126.210.220 "sudo pm2 list"

# Build ID
ssh -i "QSights-Mumbai-12Aug2019.pem" ubuntu@13.126.210.220 "cat /var/www/frontend/.next/BUILD_ID"
```

### Check Backup Sizes
```bash
ssh -i "QSights-Mumbai-12Aug2019.pem" ubuntu@13.126.210.220 "ls -lh /home/ubuntu/backups/"
```

---

## 📝 Notes

1. **Database Backup Issue:** Database backups are showing as 20 bytes. This needs investigation.
2. **PM2 Status:** Shows "errored" but application is running correctly (known issue with orphan processes)
3. **Backup Retention:** Server keeps backups for 30 days, local keeps last 2 versions
4. **Git Branch:** Production-Package contains complete deployable code (excluding secrets)

---

## Emergency Contacts & Resources

- **PEM Key Location:** `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- **Server IP:** 13.126.210.220
- **Production URL:** https://prod.qsights.com
- **GitHub Repo:** https://github.com/yashbant-mahanty/qsights-vibe.git

---

## Backup File Paths Summary

| Location | Path | Size | Purpose |
|----------|------|------|---------|
| **Production Server** | `/home/ubuntu/backups/full_backup_20260212_205842.tar.gz` | 87MB | Full system backup |
| **Production Server** | `/var/www/frontend/.next.backup.20260212_204002` | - | Latest .next backup |
| **Production Server** | `/var/www/frontend/.next.backup.20260212_145304` | - | Previous .next backup |
| **Production Server** | `/home/ubuntu/backups/qsights_db_20260212_205952.sql.gz` | 20B | Database backup |
| **Local Machine** | `/Users/yash/Documents/Projects/QSightsOrg2.0` | - | Full source code |
| **GitHub** | `Production-Package` branch | - | Version controlled backup |

---

**Created:** February 12, 2026
**Last Updated:** February 12, 2026 15:30 UTC
