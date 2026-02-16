# 🔒 BACKUP & RESTORE PROCEDURES - Feb 03, 2026

## 📋 BACKUP LOCATIONS SUMMARY

| Location | Path | Size | Date |
|----------|------|------|------|
| **LOCAL** | `/Users/yash/Documents/Projects/backups/PRODUCTION_BACKUP_20260203_160700/` | 2.7 MB (compressed) | Feb 03, 2026 16:07 |
| **PRODUCTION SERVER** | `/home/ubuntu/backups/PRODUCTION_20260203_103739/` | 160 MB | Feb 03, 2026 10:37 UTC |
| **GIT REPO** | `https://github.com/yashbant-mahanty/qsights-vibe.git` Branch: `production-package` | Full repo | Feb 03, 2026 |

---

## 1️⃣ LOCAL BACKUP DETAILS

### Location
```
/Users/yash/Documents/Projects/backups/PRODUCTION_BACKUP_20260203_160700/
└── QSightsOrg2.0_FULL_20260203_160700.tar.gz (2.7 MB)
```

### What's Included
- ✅ All frontend source code (app/, components/, lib/, contexts/)
- ✅ All backend source code (Controllers, Models, Routes, Migrations)
- ✅ Configuration files (next.config.mjs, package.json, composer.json)
- ✅ Documentation files (.md files)
- ❌ Excludes: node_modules, .next, vendor, .git, backups

### Restore from Local Backup
```bash
# Navigate to projects folder
cd /Users/yash/Documents/Projects

# Create restore directory
mkdir -p QSightsOrg2.0_RESTORED

# Extract backup
tar -xzf backups/PRODUCTION_BACKUP_20260203_160700/QSightsOrg2.0_FULL_20260203_160700.tar.gz -C QSightsOrg2.0_RESTORED

# Install dependencies
cd QSightsOrg2.0_RESTORED/frontend && npm install
cd ../backend && composer install

# Ready to use
```

---

## 2️⃣ PRODUCTION SERVER BACKUP DETAILS

### Location
```
/home/ubuntu/backups/PRODUCTION_20260203_103739/
├── frontend_20260203_103739.tar.gz (155 MB)
└── backend_20260203_103739.tar.gz (4.2 MB)
```

### SSH Connection
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### What's Included
- ✅ Complete frontend (all source files)
- ✅ Complete backend (all PHP files, routes, migrations)
- ❌ Excludes: node_modules, .next, vendor, .git

### 🚨 QUICK RESTORE COMMANDS (Production Server)

#### Restore Frontend Only
```bash
# SSH to server first
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Backup current (just in case)
sudo mv /var/www/frontend /var/www/frontend_broken_$(date +%Y%m%d_%H%M%S)

# Extract backup
cd /var/www
sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260203_103739/frontend_20260203_103739.tar.gz

# Reinstall dependencies and rebuild
cd /var/www/frontend
npm install
npm run build

# Restart PM2
pm2 restart qsights-frontend
```

#### Restore Backend Only
```bash
# SSH to server first
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Backup current (just in case)
sudo mv /var/www/QSightsOrg2.0/backend /var/www/QSightsOrg2.0/backend_broken_$(date +%Y%m%d_%H%M%S)

# Extract backup
cd /var/www
sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260203_103739/backend_20260203_103739.tar.gz

# Fix permissions
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend

# Restart PHP-FPM
sudo systemctl restart php8.4-fpm
```

#### Restore BOTH Frontend + Backend
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Backup current
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo mv /var/www/frontend /var/www/frontend_broken_${TIMESTAMP}
sudo mv /var/www/QSightsOrg2.0/backend /var/www/QSightsOrg2.0/backend_broken_${TIMESTAMP}

# Extract both
cd /var/www
sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260203_103739/frontend_20260203_103739.tar.gz
sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260203_103739/backend_20260203_103739.tar.gz

# Install and build frontend
cd /var/www/frontend
npm install
npm run build

# Fix backend permissions
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend

# Restart services
pm2 restart qsights-frontend
sudo systemctl restart php8.4-fpm

# Verify
curl -s -o /dev/null -w "HTTP: %{http_code}\n" https://prod.qsights.com
```

---

## 3️⃣ GIT REPOSITORY BACKUP

### Repository
```
URL: https://github.com/yashbant-mahanty/qsights-vibe.git
Branch: production-package
Commit: 7a0cbba
```

### What's Included
- ✅ ALL source code (frontend + backend)
- ✅ All documentation
- ✅ All migrations
- ✅ Configuration files
- ❌ Excludes: .env files (secrets), node_modules, vendor, .next

### Restore from Git
```bash
# Clone fresh
cd /Users/yash/Documents/Projects
git clone https://github.com/yashbant-mahanty/qsights-vibe.git QSightsOrg2.0_FROM_GIT
cd QSightsOrg2.0_FROM_GIT

# Checkout production-package branch
git checkout production-package

# Install dependencies
cd frontend && npm install
cd ../backend && composer install

# Copy .env files from existing setup (IMPORTANT!)
cp /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/.env.local frontend/
cp /Users/yash/Documents/Projects/QSightsOrg2.0/backend/.env backend/
```

### Deploy from Git to Production
```bash
# On local machine
cd /Users/yash/Documents/Projects
git clone https://github.com/yashbant-mahanty/qsights-vibe.git deploy_temp
cd deploy_temp
git checkout production-package

# Upload to production
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -r frontend/* ubuntu@13.126.210.220:/tmp/frontend_deploy/
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -r backend/* ubuntu@13.126.210.220:/tmp/backend_deploy/

# SSH and deploy
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
sudo cp -r /tmp/frontend_deploy/* /var/www/frontend/
sudo cp -r /tmp/backend_deploy/* /var/www/QSightsOrg2.0/backend/
cd /var/www/frontend && npm install && npm run build
pm2 restart qsights-frontend
sudo systemctl restart php8.4-fpm
```

---

## 🔥 EMERGENCY ONE-LINER ROLLBACKS

### Rollback Frontend (from production backup)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www && sudo rm -rf frontend && sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260203_103739/frontend_20260203_103739.tar.gz && cd frontend && npm install && npm run build && pm2 restart qsights-frontend"
```

### Rollback Backend (from production backup)
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "cd /var/www && sudo rm -rf QSightsOrg2.0/backend && sudo tar -xzf /home/ubuntu/backups/PRODUCTION_20260203_103739/backend_20260203_103739.tar.gz && sudo chown -R www-data:www-data QSightsOrg2.0/backend && sudo systemctl restart php8.4-fpm"
```

---

## 📁 OLDER BACKUPS (Kept for Reference)

### Local
| File | Date | Size |
|------|------|------|
| `QSightsOrg2.0_backup_20260128_122313.tar.gz` | Jan 28, 2026 | 77 MB |
| `QSightsOrg2.0_source_20260131_104221.tar.gz` | Jan 31, 2026 | 9.2 MB |

### Production Server
```bash
# List all production backups
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "ls -la /home/ubuntu/backups/"
```

---

## ⚠️ IMPORTANT NOTES

1. **NEVER commit .env files** - They contain SendGrid credentials and database passwords
2. **Always backup before major changes** - Run the backup commands first
3. **Test locally first** - Before deploying to production
4. **Keep at least 2 backups** - Current + previous version
5. **Check PM2 status after restore** - `pm2 status` should show "online"
6. **Check HTTP status** - `curl https://prod.qsights.com` should return 200

---

## 🔑 CREDENTIALS LOCATION (DO NOT COMMIT)

- Frontend: `/var/www/frontend/.env.local`
- Backend: `/var/www/QSightsOrg2.0/backend/.env`

These contain:
- Database credentials
- SendGrid API key
- AWS S3 keys
- JWT secrets

---

**Last Updated:** February 03, 2026
**Created By:** GitHub Copilot
