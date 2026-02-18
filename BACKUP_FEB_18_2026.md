# BACKUP AND ROLLBACK - February 18, 2026

## BACKUP LOCATIONS

### 1. LOCAL BACKUP (MacBook)
**Path:** `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/`

| Backup | Date | Contents |
|--------|------|----------|
| `FULL_PRODUCTION_BACKUP_20260213_155000` | Feb 13, 2026 | Frontend, Backend, Database |
| `FULL_PRODUCTION_BACKUP_20260216_222849` | Feb 16, 2026 | Frontend, Backend, Database |

### 2. PRODUCTION SERVER BACKUP (AWS EC2)
**Server:** `ubuntu@13.126.210.220`
**Path:** `/var/www/backups/`

| Backup | Date | Contents |
|--------|------|----------|
| `FULL_BACKUP_20260218_200747` | Feb 18, 2026 | Frontend (2.2GB), Backend (134MB), Database (160MB) |

**Full Backup Contents:**
```
/var/www/backups/FULL_BACKUP_20260218_200747/
├── frontend/          # Complete Next.js frontend
├── backend/           # Complete Laravel backend  
└── db_backup.sql      # PostgreSQL database dump (160MB)
```

### 3. GIT REPOSITORIES
**Primary Repo (Push First):** https://github.com/yashbant-mahanty/qsights-vibe.git
**Secondary Repo:** https://github.com/yashbant-mahanty/qsights-provibe.git

**Latest Branch:** `Production-Package-Feb-18-2026`

---

## ROLLBACK PROCEDURES

### Frontend Rollback
```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Rollback to backup
sudo rm -rf /var/www/frontend/.next
sudo cp -r /var/www/backups/FULL_BACKUP_20260218_200747/frontend/.next /var/www/frontend/
sudo chown -R www-data:www-data /var/www/frontend/.next
pm2 restart 6
```

### Backend Rollback
```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Rollback controller/routes
sudo cp /var/www/backups/FULL_BACKUP_20260218_200747/backend/app/Http/Controllers/Api/* /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
sudo cp /var/www/backups/FULL_BACKUP_20260218_200747/backend/routes/* /var/www/QSightsOrg2.0/backend/routes/

# Clear cache and restart
cd /var/www/QSightsOrg2.0/backend
sudo php artisan config:clear
sudo php artisan cache:clear
sudo php artisan route:clear
sudo systemctl restart php8.4-fpm
```

### Database Rollback
```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Restore database (CAUTION: This overwrites current data)
export PGPASSWORD='mleim6GkNDgSHpSiff7IBAaf'
psql -h qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com -U qsights_user -d qsights-db < /var/www/backups/FULL_BACKUP_20260218_200747/db_backup.sql
```

---

## CLEANUP COMPLETED

### Local Cleanup
- ✅ Archived 76 old documentation files → `archives/documentation_archive_20260218/`
- ✅ Archived 50+ old deployment scripts → `archives/old_scripts/`
- ✅ Removed junk/empty files (evaladmin, id, manager, moderator, etc.)
- ✅ Kept 2 latest backups (Feb 13, Feb 16)
- ✅ Retained essential reference docs (12 files)
- ✅ Retained essential scripts (13 files)

### Production Server Cleanup
- ✅ Removed old `.next_backup_*` folders (1.4GB freed)
- ✅ Removed temp backup files from `/tmp`
- ✅ Single comprehensive backup retained: `FULL_BACKUP_20260218_200747`

### Git Repository Updates
- ✅ Created new branch: `Production-Package-Feb-18-2026`
- ✅ Pushed to qsights-vibe (primary)
- ✅ Pushed to qsights-provibe (secondary)
- ✅ Both repos synchronized

---

## DEPLOYMENT WORKFLOW

**Standard Deployment Process:**
1. Make changes locally
2. Test locally (npm run build)
3. Push to `qsights-vibe` first (origin)
4. Push to `qsights-provibe` (provibe)
5. Deploy to production

**Deploy Commands:**
```bash
# Frontend deployment
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
npm run build
./deploy_frontend_prod.sh

# Backend deployment
./deploy_backend_prod.sh
```

---

## QUICK REFERENCE

| Item | Path/Command |
|------|--------------|
| PEM Key | `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem` |
| Production Server | `ubuntu@13.126.210.220` |
| Production Frontend | `/var/www/frontend` |
| Production Backend | `/var/www/QSightsOrg2.0/backend` |
| PM2 Frontend ID | `6` |
| PHP Service | `php8.4-fpm` |
| Database Host | `qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com` |
| Database Name | `qsights-db` |

---

*Generated: February 18, 2026*
