# 🚀 QUICK RESTORE REFERENCE CARD
## Emergency Recovery Guide - Feb 05, 2026

---

## 📦 BACKUP LOCATIONS

```
LOCAL:       /Users/yash/Documents/Projects/QSightsOrg2.0/backups/FULL_BACKUP_20260205_124433/
PRODUCTION:  /home/ubuntu/backups/production_backup_20260205_072017/
GIT:         Production-Package-Feb-05-2026 branch
```

---

## ⚡ ONE-COMMAND EMERGENCY ROLLBACK

### Full System Restore (3 minutes)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /tmp && tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/backend.tar.gz && tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/frontend.tar.gz && sudo rm -rf /var/www/QSightsOrg2.0/backend && sudo mv QSightsOrg2.0/backend /var/www/QSightsOrg2.0/ && sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend && sudo rm -rf /var/www/frontend && sudo mv frontend /var/www/ && sudo chown -R www-data:www-data /var/www/frontend && cd /var/www/QSightsOrg2.0/backend && php artisan config:clear && php artisan cache:clear && pm2 restart qsights-frontend && echo 'ROLLBACK COMPLETE'"
```

### Backend Only (2 minutes)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /tmp && tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/backend.tar.gz && sudo rm -rf /var/www/QSightsOrg2.0/backend && sudo mv QSightsOrg2.0/backend /var/www/QSightsOrg2.0/ && sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend && cd /var/www/QSightsOrg2.0/backend && php artisan config:clear && php artisan cache:clear && echo 'BACKEND RESTORED'"
```

### Frontend Only (1 minute)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /tmp && tar -xzf /home/ubuntu/backups/production_backup_20260205_072017/frontend.tar.gz && sudo rm -rf /var/www/frontend && sudo mv frontend /var/www/ && sudo chown -R www-data:www-data /var/www/frontend && pm2 restart qsights-frontend && echo 'FRONTEND RESTORED'"
```

---

## 🔍 QUICK VERIFICATION

```bash
# Check site
curl -I https://prod.qsights.com

# Check PM2
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "pm2 status"

# Check backend
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "curl -I http://localhost:8000/api/health"
```

---

## 📚 FULL DOCUMENTATION

See: `COMPLETE_BACKUP_RESTORE_FEB_05_2026.md`

---

## 🆘 KEY PATHS

```
Server:    13.126.210.220
SSH Key:   /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
Backend:   /var/www/QSightsOrg2.0/backend
Frontend:  /var/www/frontend
Backups:   /home/ubuntu/backups
DB Host:   qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com
```

---

## ✅ STATUS

**Backup Date:** February 05, 2026  
**Backup ID:** 20260205_072017  
**Git Commit:** 554bc96  
**All Systems:** ✅ READY FOR INSTANT RESTORE
