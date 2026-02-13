# QSights Backup & Rollback Procedure
## Version: 1.0 | Date: 13 February 2026

---

## 🗂️ BACKUP LOCATIONS

### 1. LOCAL MACHINE
```
Path: /Users/yash/Documents/Projects/QSightsOrg2.0/backups/
Structure:
├── YYYY-MM-DD_HHMMSS_FULL_PRODUCTION_BACKUP/
│   ├── frontend/
│   ├── backend/
│   ├── database_dump.sql
│   └── production_server_backup.tar.gz
```

### 2. PRODUCTION SERVER
```
Path: /home/ubuntu/backups/
Current Files:
├── full_backup_YYYYMMDD_HHMMSS.tar.gz (Complete backup)
├── backend_YYYYMMDD_HHMMSS.tar.gz
├── frontend_YYYYMMDD_HHMMSS.tar.gz
└── qsights_db_YYYYMMDD_HHMMSS.sql.gz (Database dump)

Secondary Path: /var/www/backups/ (Legacy backups)
```

### 3. GIT REPOSITORY
```
URL: https://github.com/yashbant-mahanty/qsights-provibe.git
Branches:
├── main (Development)
├── production (Live code)
└── Production-Package-YYYYMMDD (Backup branches)
```

---

## 🔄 QUICK BACKUP COMMANDS

### Full Production Backup (Run from Local)
```bash
# Set timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0/backups/FULL_BACKUP_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# 1. Backup Frontend from Server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "cd /var/www && tar czf /tmp/frontend_${TIMESTAMP}.tar.gz frontend"
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  ubuntu@13.126.210.220:/tmp/frontend_${TIMESTAMP}.tar.gz "$BACKUP_DIR/"

# 2. Backup Backend from Server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "cd /var/www && tar czf /tmp/backend_${TIMESTAMP}.tar.gz QSightsOrg2.0/backend --exclude='vendor' --exclude='node_modules'"
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  ubuntu@13.126.210.220:/tmp/backend_${TIMESTAMP}.tar.gz "$BACKUP_DIR/"

# 3. Backup Database
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "mysqldump -u root qsights | gzip > /tmp/qsights_db_${TIMESTAMP}.sql.gz"
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  ubuntu@13.126.210.220:/tmp/qsights_db_${TIMESTAMP}.sql.gz "$BACKUP_DIR/"

echo "Backup complete: $BACKUP_DIR"
```

### Quick Frontend Deploy
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
npm run build
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -r .next ubuntu@13.126.210.220:/var/www/frontend/
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "pm2 restart qsights-frontend"
```

### Quick Backend Deploy
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -r app ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www/QSightsOrg2.0/backend && php artisan cache:clear && php artisan config:clear"
```

---

## 🔙 ROLLBACK PROCEDURES

### Frontend Rollback (Fast - ~2 min)
```bash
# From server - restore previous build
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# On server:
cd /var/www/frontend
mv .next .next.broken
tar xzf /home/ubuntu/backups/frontend_YYYYMMDD.tar.gz -C /var/www/
pm2 restart qsights-frontend
```

### Backend Rollback (Medium - ~5 min)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# On server:
cd /var/www/QSightsOrg2.0
mv backend backend.broken
tar xzf /home/ubuntu/backups/backend_YYYYMMDD.tar.gz -C /var/www/QSightsOrg2.0/
cd backend
php artisan cache:clear && php artisan config:clear
```

### Database Rollback (Critical - ~10 min)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# On server (CAUTION - This drops and recreates the database):
mysql -u root -e "DROP DATABASE qsights; CREATE DATABASE qsights;"
gunzip < /home/ubuntu/backups/qsights_db_YYYYMMDD.sql.gz | mysql -u root qsights
```

### Full System Rollback (Emergency - ~15 min)
```bash
# From local machine:
BACKUP_FILE="full_backup_YYYYMMDD_HHMMSS.tar.gz"
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  pm2 stop all
  cd /home/ubuntu/backups
  tar xzf ${BACKUP_FILE} -C /var/www/
  cd /var/www/QSightsOrg2.0/backend && php artisan cache:clear
  pm2 restart all
"
```

---

## 📋 SERVER CONNECTIONS

| Server | IP | User | Key Path |
|--------|-----|------|----------|
| Production | 13.126.210.220 | ubuntu | /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem |

### SSH Command
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### SCP Command Template
```bash
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem LOCAL_FILE ubuntu@13.126.210.220:REMOTE_PATH
```

---

## 🗄️ DATABASE DETAILS

| Property | Value |
|----------|-------|
| Host | localhost |
| Database | qsights |
| User | root |

### Quick Database Commands
```bash
# Backup
mysqldump -u root qsights | gzip > /home/ubuntu/backups/qsights_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore
gunzip < backup_file.sql.gz | mysql -u root qsights
```

---

## 🔧 PM2 PROCESSES

| Process Name | Port | Path |
|--------------|------|------|
| qsights-frontend | 3000 | /var/www/frontend |
| qsights-backend | (Apache) | /var/www/QSightsOrg2.0/backend |

### PM2 Commands
```bash
pm2 list                    # View all processes
pm2 restart qsights-frontend # Restart frontend
pm2 logs qsights-frontend   # View logs
pm2 status                  # Check status
```

---

## ⚡ EMERGENCY CONTACTS & CHECKLIST

### Before Any Deployment:
- [ ] Take database backup
- [ ] Verify backup is valid (check size > 0)
- [ ] Note current working state
- [ ] Have rollback commands ready

### After Deployment Issue:
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs qsights-frontend --lines 50`
3. Check Nginx: `sudo nginx -t && sudo systemctl status nginx`
4. If critical - ROLLBACK immediately

---

## 📁 CURRENT BACKUP INVENTORY

### Local Backups (Keep Last 2)
```
/Users/yash/Documents/Projects/QSightsOrg2.0/backups/
└── 2026-02-11_232742_FULL_PRODUCTION_BACKUP/
```

### Server Backups
```
/home/ubuntu/backups/
├── full_backup_20260212_205802.tar.gz
├── full_backup_20260212_205842.tar.gz
└── qsights_db_20260212_205952.sql.gz
```

---

## Last Updated: 13 February 2026
