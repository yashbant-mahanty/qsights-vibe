# QSights Backup and Rollback Process
**Date:** February 14, 2026  
**Version:** 1.0  
**Status:** Production Ready

---

## 📋 Overview

Complete backup and rollback system for QSights production environment including:
- PostgreSQL database backups (custom format)
- Backend PHP/Laravel code
- Frontend Next.js code
- Automated restore capabilities

---

## 🚀 Quick Start

### Run the Interactive Script

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./backup_and_rollback.sh
```

### Menu Options

```
1) Create Full Backup (Database + Backend + Frontend)
2) Create Database Backup Only
3) Create Code Backup Only (Backend + Frontend)
4) List Available Backups
5) Rollback from Backup
6) Exit
```

---

## 📦 Backup Types

### 1. Full Backup (Recommended)
**Creates:**
- PostgreSQL database dump (custom format)
- Complete backend code (excluding vendor, logs)
- Complete frontend code (excluding node_modules, cache)
- Metadata file with timestamp and git commit

**Usage:**
```bash
./backup_and_rollback.sh
# Select option: 1
```

**Output Location:**
```
./backups/backup_YYYYMMDD_HHMMSS/
├── database.dump          # PostgreSQL custom format
├── backend/               # Laravel backend code
├── frontend/              # Next.js frontend code
└── backup_info.txt        # Backup metadata
```

**Estimated Time:** 2-5 minutes  
**Estimated Size:** 500MB - 2GB

---

### 2. Database Only Backup
**Use Case:** Quick database snapshot before schema changes

**Usage:**
```bash
./backup_and_rollback.sh
# Select option: 2
```

**Estimated Time:** 30-60 seconds  
**Estimated Size:** 100-500MB

---

### 3. Code Only Backup
**Use Case:** Before deploying code changes without DB modifications

**Usage:**
```bash
./backup_and_rollback.sh
# Select option: 3
```

**Estimated Time:** 1-2 minutes  
**Estimated Size:** 400MB - 1.5GB

---

## 🔄 Rollback Process

### Interactive Rollback

1. **List Available Backups:**
```bash
./backup_and_rollback.sh
# Select option: 4
```

2. **Perform Rollback:**
```bash
./backup_and_rollback.sh
# Select option: 5
# Choose backup number
# Type 'RESTORE' to confirm
```

### ⚠️ Rollback Safety Checklist

**BEFORE rolling back:**
- [ ] Active users notified of maintenance
- [ ] Current state backed up first
- [ ] Verify backup integrity
- [ ] Confirm backup timestamp matches desired state
- [ ] Super Admin approval obtained

**DURING rollback:**
- Script will ask for confirmation: Type `RESTORE`
- Services will restart automatically
- Database connections will be briefly interrupted (2-3 seconds)

**AFTER rollback:**
- [ ] Test critical workflows
- [ ] Verify data integrity
- [ ] Check service status
- [ ] Monitor error logs for 15 minutes

---

## 📊 Backup Storage

### Local Storage
```
/Users/yash/Documents/Projects/QSightsOrg2.0/backups/
├── backup_20260214_143000/
├── backup_20260214_120000/
└── backup_20260213_180000/
```

### Retention Policy
- **Hourly backups:** Keep last 24 hours (if created)
- **Daily backups:** Keep last 7 days
- **Weekly backups:** Keep last 4 weeks
- **Monthly backups:** Keep last 6 months

### Manual Cleanup
```bash
# Delete backups older than 7 days
find ./backups -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;

# Keep only last 10 backups
ls -t ./backups | tail -n +11 | xargs -I {} rm -rf ./backups/{}
```

---

## 🛠️ Manual Backup Commands

### Database Backup (Manual)
```bash
# On server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

cd /var/www/QSightsOrg2.0/backend
php artisan config:cache

# Get DB credentials
DB_NAME=$(php artisan tinker --execute='echo config("database.connections.pgsql.database");' 2>/dev/null | tail -1)
DB_USER=$(php artisan tinker --execute='echo config("database.connections.pgsql.username");' 2>/dev/null | tail -1)
DB_PASS=$(php artisan tinker --execute='echo config("database.connections.pgsql.password");' 2>/dev/null | tail -1)

# Create backup
PGPASSWORD="$DB_PASS" pg_dump -U "$DB_USER" -F c -b -v -f ~/backup_$(date +%Y%m%d).dump "$DB_NAME"

# Download backup
exit
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220:~/backup_*.dump ./
```

### Code Backup (Manual)
```bash
# Backend
rsync -avz --exclude='vendor' --exclude='node_modules' \
  -e "ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem" \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/ \
  ./manual_backup/backend/

# Frontend
rsync -avz --exclude='node_modules' --exclude='.next/cache' \
  -e "ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem" \
  ubuntu@13.126.210.220:/var/www/frontend/ \
  ./manual_backup/frontend/
```

---

## 🔧 Manual Restore Commands

### Database Restore (Manual)
```bash
# Upload backup to server
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  ./backups/backup_20260214_143000/database.dump \
  ubuntu@13.126.210.220:/tmp/restore.dump

# On server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

cd /var/www/QSightsOrg2.0/backend
DB_NAME=$(php artisan tinker --execute='echo config("database.connections.pgsql.database");' 2>/dev/null | tail -1)
DB_USER=$(php artisan tinker --execute='echo config("database.connections.pgsql.username");' 2>/dev/null | tail -1)
DB_PASS=$(php artisan tinker --execute='echo config("database.connections.pgsql.password");' 2>/dev/null | tail -1)

# Restore database (will drop existing objects with -c flag)
PGPASSWORD="$DB_PASS" pg_restore -U "$DB_USER" -d "$DB_NAME" -c -v /tmp/restore.dump

# Clean up
rm /tmp/restore.dump
```

### Code Restore (Manual)
```bash
# Backend
rsync -avz --delete --exclude='vendor' --exclude='storage/logs' \
  -e "ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem" \
  ./backups/backup_20260214_143000/backend/ \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/

# Restart backend
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo systemctl restart php8.4-fpm"

# Frontend
rsync -avz --delete --exclude='node_modules' \
  -e "ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem" \
  ./backups/backup_20260214_143000/frontend/ \
  ubuntu@13.126.210.220:/var/www/frontend/

# Restart frontend
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo -u ubuntu pm2 restart qsights-frontend"
```

---

## 🔍 Verification After Restore

### 1. Service Status
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  echo '=== PHP-FPM Status ===' &&
  sudo systemctl status php8.4-fpm --no-pager | head -5 &&
  echo '' &&
  echo '=== PM2 Status ===' &&
  sudo -u ubuntu pm2 list &&
  echo '' &&
  echo '=== HTTP Test ===' &&
  curl -I http://localhost:3000 2>&1 | head -3
"
```

### 2. Database Integrity
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  cd /var/www/QSightsOrg2.0/backend &&
  php artisan tinker --execute=\"
    echo 'Users: ' . DB::table('users')->count() . PHP_EOL;
    echo 'Programs: ' . DB::table('programs')->count() . PHP_EOL;
    echo 'Activities: ' . DB::table('activities')->count() . PHP_EOL;
    echo 'Approval Requests: ' . DB::table('activity_approval_requests')->count() . PHP_EOL;
  \"
"
```

### 3. Application Tests
- [ ] Login as Super Admin
- [ ] Create test activity
- [ ] Submit approval request
- [ ] Check manager review workflow
- [ ] Verify email notifications
- [ ] Test participant registration

---

## 🚨 Emergency Rollback Scenarios

### Scenario 1: Bad Code Deployment
**Symptoms:** 500 errors, white screen, PHP errors

**Quick Rollback:**
```bash
./backup_and_rollback.sh
# Option 5 (Rollback)
# Select latest backup before deployment
# Type RESTORE
```

**Time to Recovery:** 2-3 minutes

---

### Scenario 2: Database Migration Issues
**Symptoms:** Database errors, missing columns, constraint violations

**Quick Rollback:**
```bash
./backup_and_rollback.sh
# Option 5 (Rollback)
# Select backup before migration
# Type RESTORE
```

**Time to Recovery:** 1-2 minutes (DB only)

---

### Scenario 3: Data Corruption
**Symptoms:** Missing records, corrupted data, foreign key errors

**Quick Rollback:**
```bash
./backup_and_rollback.sh
# Option 5 (Rollback)
# Select backup from known good state
# Type RESTORE
```

**Time to Recovery:** 2-5 minutes

---

## 📝 Best Practices

### When to Create Backups

**ALWAYS before:**
- Database migrations
- Major code deployments
- Configuration changes
- User bulk operations
- Schema modifications
- Production hotfixes

**Recommended schedule:**
- **Before each deployment** (mandatory)
- **Daily at 2:00 AM** (automated via cron)
- **Before maintenance windows**
- **After major data imports**

---

## 🔒 Security Notes

### Backup Security
- Backups contain sensitive data (passwords, user info)
- Store in secure location with restricted access
- Never commit backups to git
- Encrypt backups if storing offsite
- Use `.gitignore` to exclude `backups/` directory

### Access Control
- PEM key required for all operations
- Only authorized personnel should have PEM key
- Audit backup/restore operations
- Log all rollback actions

---

## 🤖 Automated Backups (Cron Setup)

### Daily Automated Backup
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /Users/yash/Documents/Projects/QSightsOrg2.0 && echo "1" | ./backup_and_rollback.sh > /tmp/qsights_backup_$(date +\%Y\%m\%d).log 2>&1

# Weekly cleanup at 3 AM Sunday
0 3 * * 0 find /Users/yash/Documents/Projects/QSightsOrg2.0/backups -type d -name "backup_*" -mtime +30 -exec rm -rf {} \;
```

---

## 📊 Backup Monitoring

### Check Backup Success
```bash
# View today's backup log
cat /tmp/qsights_backup_$(date +%Y%m%d).log

# Check backup size
du -sh ./backups/backup_*/ | tail -5

# Verify backup integrity
ls -lh ./backups/backup_*/database.dump
ls -lh ./backups/backup_*/backend/ | wc -l
ls -lh ./backups/backup_*/frontend/ | wc -l
```

---

## 🆘 Troubleshooting

### Issue: "Permission denied" during backup
**Solution:**
```bash
# Check PEM key permissions
chmod 400 /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
```

### Issue: "Disk space full" on backup
**Solution:**
```bash
# Check available space
df -h

# Clean old backups
rm -rf ./backups/backup_20260101_*

# Or use cleanup command
ls -t ./backups | tail -n +6 | xargs -I {} rm -rf ./backups/{}
```

### Issue: "Database restore failed"
**Solution:**
```bash
# Check if database exists
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "psql -U postgres -l"

# Try restore without -c flag (no drop)
PGPASSWORD="$DB_PASS" pg_restore -U "$DB_USER" -d "$DB_NAME" -v /tmp/restore.dump
```

### Issue: "PM2 frontend won't start after restore"
**Solution:**
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "
  cd /var/www/frontend &&
  sudo -u ubuntu pm2 delete qsights-frontend &&
  sudo -u ubuntu pm2 start npm --name qsights-frontend -- start &&
  sudo -u ubuntu pm2 save
"
```

---

## 📞 Support & Documentation

### Related Documentation
- [Manager Review Workflow](MANAGER_REVIEW_WORKFLOW_IMPLEMENTATION_FEB_XX_2026.md)
- [Deployment Process](DEPLOYMENT_PROCEDURES.md)
- [Emergency Procedures](EMERGENCY_PROCEDURES.md)

### Contact Information
- **System Administrator:** ubuntu@13.126.210.220
- **Database:** PostgreSQL on localhost
- **Services:** PHP 8.4-FPM, PM2, Nginx

---

## ✅ Pre-Deployment Checklist

Before any production deployment:
- [ ] Create full backup
- [ ] Verify backup completion
- [ ] Check available disk space (>10GB free)
- [ ] Note current git commit hash
- [ ] Document changes being deployed
- [ ] Have rollback plan ready
- [ ] Test in pre-prod first
- [ ] Notify team of deployment window

---

## 📈 Backup History Tracking

Keep a log of major backups:

```
Date       | Time  | Type | Reason                | Size  | Status
-----------|-------|------|----------------------|-------|--------
2026-02-14 | 14:30 | Full | Pre-deployment       | 1.2GB | ✓
2026-02-14 | 10:00 | Full | Daily automated      | 1.1GB | ✓
2026-02-13 | 18:00 | Full | Pre-migration        | 1.0GB | ✓
```

---

**Script Location:** `/Users/yash/Documents/Projects/QSightsOrg2.0/backup_and_rollback.sh`

**Last Updated:** February 14, 2026
