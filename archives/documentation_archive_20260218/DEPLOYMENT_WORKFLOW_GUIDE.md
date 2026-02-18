# QSights Deployment Workflow Guide

## 📋 Table of Contents

1. [Environment Overview](#environment-overview)
2. [Deployment Workflow](#deployment-workflow)
3. [Environment Switching](#environment-switching)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)

---

## 🌍 Environment Overview

### Local Development
- **Purpose**: Development and initial testing
- **Location**: Your Mac
- **Database**: Local MySQL
- **URL**: http://localhost:3000

### Pre-Production (Staging)
- **Purpose**: Final testing before production
- **Server**: 3.110.94.207 (i-0b62d4d1009b83e2a)
- **Database**: AWS RDS Staging
- **URL**: https://preprod.qsights.com
- **PM2 Process**: `qsights-frontend-preprod`

### Production (Live)
- **Purpose**: Live user environment
- **Server**: 13.126.210.220 (i-0de19fdf0bd6568b5)
- **Database**: AWS RDS Production
- **URL**: https://prod.qsights.com
- **PM2 Process**: `qsights-frontend`

---

## 🔄 Deployment Workflow

### The Golden Rule

```
┌─────────────────────────────────────────────────────┐
│  NEVER DEPLOY DIRECTLY TO PRODUCTION               │
│  Always: Local → Pre-Prod → Production             │
└─────────────────────────────────────────────────────┘
```

### Step-by-Step Process

#### STEP 1: Local Development
```bash
# Work on your local machine
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Make changes
# Test locally
# Commit to Git
git add .
git commit -m "Your changes"
```

#### STEP 2: Deploy to Pre-Prod
```bash
# Deploy backend
./deploy_backend_preprod.sh

# Deploy frontend
./deploy_frontend_preprod.sh
```

**What happens**:
1. Creates backup on Pre-Prod server
2. Uploads your code
3. Installs dependencies
4. Clears caches
5. Restarts services

**Duration**: ~5-10 minutes

#### STEP 3: Test on Pre-Prod

Access: https://preprod.qsights.com

**Test everything**:
- ✅ All features working
- ✅ All modules functional
- ✅ APIs responding
- ✅ Reports generating
- ✅ No errors in console
- ✅ No errors in logs

**Minimum stable period**: 24 hours

#### STEP 4: Deploy to Production (Only if Pre-Prod approved)

```bash
# Deploy backend
./deploy_backend_prod.sh

# Deploy frontend
./deploy_frontend_prod.sh
```

**Safety confirmations required**:
1. Type `VERIFIED` (confirms Pre-Prod testing done)
2. Type `DEPLOY-TO-PRODUCTION` (confirms production deployment)

**What happens**:
1. Creates production backup
2. Uploads code
3. Runs migrations (if confirmed)
4. Clears caches
5. Restarts services
6. Runs health checks

**Duration**: ~10-15 minutes

#### STEP 5: Post-Deployment Monitoring

**Immediate (0-5 min)**:
```bash
# Check if site is up
curl -I https://prod.qsights.com

# SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Check logs
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log

# Check PM2
pm2 list
pm2 logs qsights-frontend
```

**Monitor for 30 minutes actively**

---

## 🔧 Environment Switching

### Switch Backend Environment

The backend reads from `.env` file on the server.

**Pre-Prod Backend Configuration**:
```bash
# SSH to Pre-Prod
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207

# Edit .env
cd /var/www/QSightsOrg2.0/backend
sudo nano .env

# Key settings:
APP_ENV=staging
APP_DEBUG=false
DB_HOST=qsights-preprod-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com
APP_URL=https://preprod.qsights.com

# Clear cache after changes
sudo php artisan config:clear
sudo php artisan config:cache
sudo systemctl reload php8.1-fpm
```

**Production Backend Configuration**:
```bash
# SSH to Production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Edit .env
cd /var/www/QSightsOrg2.0/backend
sudo nano .env

# Key settings:
APP_ENV=production
APP_DEBUG=false
DB_HOST=qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com
APP_URL=https://prod.qsights.com

# Clear cache
sudo php artisan config:clear
sudo php artisan config:cache
sudo systemctl reload php8.1-fpm
```

### Switch Frontend Environment

Frontend environment is set during **build time**.

**Building for Pre-Prod**:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend

# Set Pre-Prod environment
export NEXT_PUBLIC_API_URL="https://preprod.qsights.com/api"
export NEXT_PUBLIC_APP_URL="https://preprod.qsights.com"
export NODE_ENV="production"

# Build
npm run build

# Deploy (script handles this automatically)
```

**Building for Production**:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend

# Set Production environment
export NEXT_PUBLIC_API_URL="https://prod.qsights.com/api"
export NEXT_PUBLIC_APP_URL="https://prod.qsights.com"
export NODE_ENV="production"

# Build
npm run build

# Deploy (script handles this automatically)
```

**Note**: Deployment scripts automatically set correct environment variables

---

## 🔙 Rollback Procedures

### When to Rollback

**Immediate rollback required if**:
- ❌ Production site not accessible
- ❌ Critical functionality broken
- ❌ Data corruption detected
- ❌ Widespread user-reported errors
- ❌ Performance severely degraded
- ❌ Security vulnerability introduced

**Consider rollback if**:
- ⚠️ Error rate increased significantly
- ⚠️ Response times doubled
- ⚠️ Multiple features not working

### Backend Rollback

#### Manual Rollback (Fastest)

```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# List available backups
ls -lh /home/ubuntu/backups/production/backend_*.tar.gz

# Identify backup to restore (example: backend_20260207_143000.tar.gz)

# Stop services
sudo systemctl stop php8.1-fpm

# Backup current (failed) deployment
cd /var/www/QSightsOrg2.0
sudo mv backend backend_failed_$(date +%Y%m%d_%H%M%S)

# Restore from backup
sudo tar -xzf /home/ubuntu/backups/production/backend_20260207_143000.tar.gz -C /var/www/QSightsOrg2.0

# Set permissions
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend

# Install dependencies
cd /var/www/QSightsOrg2.0/backend
sudo composer install --no-dev --optimize-autoloader

# Clear caches
sudo php artisan config:clear
sudo php artisan route:clear
sudo php artisan cache:clear
sudo php artisan config:cache
sudo php artisan route:cache

# Start services
sudo systemctl start php8.1-fpm
sudo systemctl reload nginx

# Verify
sudo systemctl status php8.1-fpm
curl -I https://prod.qsights.com/api/health
```

**Time**: 3-5 minutes

### Frontend Rollback

#### Manual Rollback (Fastest)

```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# List available backups
ls -lh /home/ubuntu/backups/production/frontend_*.tar.gz

# Identify backup (example: frontend_20260207_143000.tar.gz)

# Stop PM2
pm2 stop qsights-frontend

# Backup current (failed) deployment
cd /var/www/frontend
sudo mv .next .next_failed_$(date +%Y%m%d_%H%M%S)

# Restore from backup
sudo tar -xzf /home/ubuntu/backups/production/frontend_20260207_143000.tar.gz -C /var/www/frontend

# Set permissions
sudo chown -R www-data:www-data /var/www/frontend/.next
sudo chown -R www-data:www-data /var/www/frontend/package.json

# Restart PM2
pm2 restart qsights-frontend
pm2 save

# Verify
sleep 5
pm2 logs qsights-frontend --lines 20
curl -I https://prod.qsights.com

# Check BUILD_ID
cat /var/www/frontend/.next/BUILD_ID
```

**Time**: 2-3 minutes

### Database Rollback (If needed)

**⚠️ CRITICAL: Only for emergencies**

```bash
# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Get DB credentials
cd /var/www/QSightsOrg2.0/backend
DB_HOST=$(grep '^DB_HOST=' .env | cut -d'=' -f2)
DB_USER=$(grep '^DB_USERNAME=' .env | cut -d'=' -f2)
DB_PASS=$(grep '^DB_PASSWORD=' .env | cut -d'=' -f2)
DB_NAME=$(grep '^DB_DATABASE=' .env | cut -d'=' -f2)

# List migrations to rollback
php artisan migrate:status

# Rollback last batch of migrations
php artisan migrate:rollback --step=1

# Verify
php artisan migrate:status
```

**⚠️ WARNING**: Database rollback can cause data loss. Always restore from RDS snapshot if possible.

### AWS RDS Snapshot Restore (Safest for Database)

**Preferred method for database issues**:

1. **AWS Console** → **RDS** → **Snapshots**
2. Find snapshot taken before deployment
3. Restore snapshot to new instance
4. Update backend `.env` with new DB host
5. Test connection
6. Switch DNS/load balancer if needed

**Time**: 15-30 minutes

---

## 🔍 Troubleshooting

### Deployment Script Fails

**Issue**: Permission denied
```bash
# Solution: Make scripts executable
chmod +x deploy_*.sh
```

**Issue**: PEM key not found
```bash
# Solution: Verify path
ls -l /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem

# Should show: -rw-------
# If not, fix permissions:
chmod 400 /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
```

**Issue**: Cannot connect to server
```bash
# Solution 1: Use SSM instead
# Pre-Prod:
aws ssm start-session --target i-0b62d4d1009b83e2a \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=1199,portNumber=22" --region ap-south-1

# Then SSH via localhost:
ssh -i PEM_KEY ubuntu@localhost -p 1199

# Production:
aws ssm start-session --target i-0de19fdf0bd6568b5 \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=3399,portNumber=22" --region ap-south-1

ssh -i PEM_KEY ubuntu@localhost -p 3399
```

### Backend Issues

**Issue**: 500 Internal Server Error
```bash
# Check Laravel logs
ssh to server
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log

# Check PHP-FPM logs
sudo tail -f /var/log/php8.1-fpm.log

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Clear all caches
cd /var/www/QSightsOrg2.0/backend
sudo php artisan cache:clear
sudo php artisan config:clear
sudo php artisan route:clear
sudo php artisan view:clear
```

**Issue**: Database connection error
```bash
# Verify .env settings
cd /var/www/QSightsOrg2.0/backend
cat .env | grep DB_

# Test database connection
php artisan tinker
DB::connection()->getPdo();
```

**Issue**: Permission errors
```bash
# Fix Laravel permissions
cd /var/www/QSightsOrg2.0
sudo chown -R www-data:www-data backend/
sudo chmod -R 755 backend/
sudo chmod -R 775 backend/storage/
sudo chmod -R 775 backend/bootstrap/cache/
```

### Frontend Issues

**Issue**: PM2 process not starting
```bash
# Check PM2 status
pm2 list

# Check PM2 logs
pm2 logs qsights-frontend --lines 50

# Restart PM2
pm2 restart qsights-frontend

# If still failing, start manually
cd /var/www/frontend
pm2 start npm --name qsights-frontend -- start
pm2 save
```

**Issue**: BUILD_ID mismatch
```bash
# Check deployed BUILD_ID
cat /var/www/frontend/.next/BUILD_ID

# Check served BUILD_ID
curl -s https://prod.qsights.com | grep buildId

# If mismatch, restart PM2
pm2 restart qsights-frontend
sleep 5
pm2 logs qsights-frontend
```

**Issue**: API calls failing (CORS/Network)
```bash
# Check frontend environment
cat /var/www/frontend/.env.local

# Verify API URL in build
# Frontend API URL is set during build time
# Must rebuild with correct NEXT_PUBLIC_API_URL

# Check if API is accessible
curl -I https://prod.qsights.com/api/health
```

### General Troubleshooting

**Check all services**:
```bash
sudo systemctl status nginx
sudo systemctl status php8.1-fpm
pm2 status
```

**Restart all services**:
```bash
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm
pm2 restart all
```

**Check server resources**:
```bash
# CPU and Memory
htop

# Disk space
df -h

# Check for high memory processes
ps aux --sort=-%mem | head -10
```

---

## 📞 Quick Command Reference

### SSH Access
```bash
# Pre-Prod
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207

# Production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### Deployment
```bash
# Pre-Prod
./deploy_backend_preprod.sh
./deploy_frontend_preprod.sh

# Production (requires confirmations)
./deploy_backend_prod.sh
./deploy_frontend_prod.sh
```

### Monitoring
```bash
# Laravel logs
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log

# PM2 logs
pm2 logs qsights-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u php8.1-fpm -f
```

### Health Checks
```bash
# API health
curl https://prod.qsights.com/api/health

# Frontend
curl -I https://prod.qsights.com

# PM2 status
pm2 status

# Services
sudo systemctl status nginx php8.1-fpm
```

---

## 📚 Related Documentation

- `DEPLOYMENT_CHECKLIST.md` - Full testing checklist
- `.env.local` - Local environment configuration
- `.env.preprod` - Pre-Prod environment configuration
- `.env.production` - Production environment configuration

---

**Version**: 1.0  
**Last Updated**: February 7, 2026  
**Maintained By**: Development Team
