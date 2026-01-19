# COMPLETE DEPLOYMENT GUIDE WITH GOVERNANCE

## 🎯 OVERVIEW

This guide provides step-by-step instructions for deploying QSights to production while enforcing strict engineering governance rules.

**CRITICAL:** All deployments must pass validation checks. No exceptions.

---

## 📋 PRE-DEPLOYMENT REQUIREMENTS

### 1. Access Requirements
- SSH Key: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- Production Server: `ubuntu@13.126.210.220`
- Super Admin Access: Required for validation checks

### 2. Critical Documents to Review
- `DEPLOYMENT_GOVERNANCE.md` - Governance rules
- `CRITICAL_FEATURES_DO_NOT_BREAK.md` - Features that must always work
- `DISASTER_RECOVERY.md` - Emergency procedures

### 3. Tools Required
- Git
- Node.js 18+
- PHP 8.2+
- Composer
- SSH access

---

## 🚨 STEP 1: GOVERNANCE VALIDATION (MANDATORY)

**Run the automated validation script:**

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Set your auth token (get from login API)
export AUTH_TOKEN="your-super-admin-token-here"

# Run validation
./validate_deployment.sh
```

The script validates:
- ✅ SDD is updated
- ✅ All pre-deployment tests pass
- ✅ Schema is consistent
- ✅ Rollback plan is documented

**If validation fails, deployment is BLOCKED. Fix issues before proceeding.**

### Manual Validation (If Script Can't Run)

1. **Check SDD via UI:**
   - Login to https://prod.qsights.com
   - Navigate to Settings → System Config → System Design Document
   - Click "Run All Tests" → All must pass
   - Click "Validate Schema" → Must show "Schema Valid"

2. **Verify Critical Features:**
   - Review `backend/CRITICAL_FEATURES.json`
   - Confirm all critical features are documented
   - Verify testing requirements

3. **Confirm Rollback Plan:**
   - Create backup checkpoint:
     ```bash
     mkdir -p backups/$(date +%Y-%m-%d)_PRE_DEPLOYMENT
     cp -r backend frontend backups/$(date +%Y-%m-%d)_PRE_DEPLOYMENT/
     ```

---

## 🔧 STEP 2: LOCAL TESTING

**Test locally before deploying:**

```bash
# Backend tests
cd backend
composer test  # If tests configured
php artisan config:clear
php artisan cache:clear

# Frontend build test
cd ../frontend
npm install
npm run build

# Verify no errors in build output
```

---

## 📦 STEP 3: PREPARE DEPLOYMENT

### 3.1 Create Deployment Branch (Optional but Recommended)

```bash
git checkout -b deployment/$(date +%Y-%m-%d)
git add .
git commit -m "feat: [describe changes] - deployment ready"
git push origin deployment/$(date +%Y-%m-%d)
```

### 3.2 Update Version

```bash
# Update SDD version
echo "2.1.0" > backend/SDD_VERSION.txt
git add backend/SDD_VERSION.txt
git commit -m "chore: bump SDD version to 2.1.0"
```

### 3.3 Create Deployment Log Entry

```bash
cat >> deployment_log.txt << EOF

==================================================
DEPLOYMENT: $(date '+%Y-%m-%d %H:%M:%S')
==================================================
Version: 2.1.0
Deployed By: [Your Name]
Changes:
  - System Design Document (SDD) feature
  - Pre-deployment testing framework
  - Schema validation system
  - Rollback procedures documentation

PRE-DEPLOYMENT CHECKS:
  ✅ SDD Updated: YES
  ✅ Tests Passed: ALL
  ✅ Schema Validated: PASS
  ✅ Rollback Plan: DOCUMENTED
  ✅ Backup Created: YES

EOF
```

---

## 🚀 STEP 4: BACKEND DEPLOYMENT

### 4.1 Connect to Production Server

```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### 4.2 Deploy Backend

```bash
cd /var/www/QSightsOrg2.0/backend

# Create backup
sudo tar -czf ~/backups/backend-$(date +%Y%m%d-%H%M%S).tar.gz .

# Pull latest code
sudo git fetch origin
sudo git pull origin main

# Install dependencies
sudo composer install --no-dev --optimize-autoloader

# Run migrations (if any)
sudo php artisan migrate --force

# Clear all caches
sudo php artisan config:clear
sudo php artisan cache:clear
sudo php artisan route:clear
sudo php artisan view:clear

# Optimize for production
sudo php artisan config:cache
sudo php artisan route:cache
sudo php artisan view:cache

# Set proper permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### 4.3 Verify Backend

```bash
# Test API health
curl -I https://prod.qsights.com/api/health

# Check Laravel logs
sudo tail -n 50 storage/logs/laravel.log
```

---

## 🎨 STEP 5: FRONTEND DEPLOYMENT

### 5.1 Deploy Frontend

```bash
cd /var/www/QSightsOrg2.0/frontend

# Create backup
sudo tar -czf ~/backups/frontend-$(date +%Y%m%d-%H%M%S).tar.gz .

# Pull latest code
sudo git fetch origin
sudo git pull origin main

# Install dependencies
sudo npm install

# Build for production
sudo npm run build

# Verify build completed
ls -la .next/BUILD_ID

# Clear Next.js cache
sudo rm -rf .next/cache

# Restart PM2
sudo pm2 restart qsights-frontend --update-env

# Wait for startup
sleep 5

# Check status
sudo pm2 status qsights-frontend
```

### 5.2 Verify Frontend

```bash
# Check PM2 logs
sudo pm2 logs qsights-frontend --lines 100

# Verify build ID changed
cat .next/BUILD_ID

# Test frontend
curl -I https://prod.qsights.com
```

---

## ✅ STEP 6: POST-DEPLOYMENT VERIFICATION

### 6.1 Smoke Tests

**Login and test critical features:**

1. **Authentication**
   ```bash
   curl -X POST https://prod.qsights.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@qsights.com","password":"YOUR_PASSWORD"}'
   ```

2. **Access UI**
   - Open https://prod.qsights.com
   - Login as super admin
   - Verify dashboard loads

3. **Test Critical Features:**
   - ✅ User authentication works
   - ✅ Navigate to Settings → System Config → System Design
   - ✅ Click "Run All Tests" → All pass
   - ✅ View Reports & Analytics
   - ✅ Check Activities list
   - ✅ Test notification system

### 6.2 Monitor Logs

```bash
# Frontend logs
sudo pm2 logs qsights-frontend --lines 200

# Backend logs
sudo tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### 6.3 Performance Check

```bash
# Check PM2 status
sudo pm2 monit

# Check disk space
df -h

# Check memory
free -m
```

---

## 📝 STEP 7: COMPLETE DEPLOYMENT LOG

```bash
# On local machine, update deployment log
cat >> deployment_log.txt << EOF

DEPLOYMENT STEPS:
  1. Backend deployment: SUCCESS
  2. Frontend deployment: SUCCESS
  3. Verification: SUCCESS

POST-DEPLOYMENT:
  - Frontend loads: ✅
  - Login works: ✅
  - Critical features tested: ✅
  - No errors in logs: ✅
  - Performance normal: ✅

ROLLBACK PLAN:
  - git reset --hard [COMMIT_HASH_BEFORE_DEPLOYMENT]
  - pm2 restart qsights-frontend
  - php artisan migrate:rollback --step=1

STATUS: ✅ SUCCESS
TIME COMPLETED: $(date '+%Y-%m-%d %H:%M:%S')
==================================================

EOF

# Commit the log
git add deployment_log.txt
git commit -m "docs: deployment log $(date +%Y-%m-%d)"
git push origin main
```

---

## 🚨 ROLLBACK PROCEDURE (IF NEEDED)

If something goes wrong:

### Immediate Rollback

```bash
# Connect to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Stop frontend
cd /var/www/QSightsOrg2.0/frontend
sudo pm2 stop qsights-frontend

# Rollback code
sudo git reset --hard HEAD~1
sudo npm run build
sudo rm -rf .next/cache
sudo pm2 restart qsights-frontend

# Rollback backend if needed
cd /var/www/QSightsOrg2.0/backend
sudo git reset --hard HEAD~1
sudo php artisan migrate:rollback --step=1
sudo php artisan config:clear
sudo php artisan cache:clear

# Verify
curl -I https://prod.qsights.com
sudo pm2 logs qsights-frontend --lines 100
```

### Restore from Backup

```bash
# Restore backend
cd /var/www/QSightsOrg2.0
sudo tar -xzf ~/backups/backend-[TIMESTAMP].tar.gz -C backend/

# Restore frontend
sudo tar -xzf ~/backups/frontend-[TIMESTAMP].tar.gz -C frontend/

# Restart services
cd frontend
sudo pm2 restart qsights-frontend
```

---

## 📊 MONITORING CHECKLIST

**Monitor for 30 minutes after deployment:**

- [ ] Frontend loads correctly
- [ ] Login works for all user types
- [ ] No 500 errors in logs
- [ ] PM2 shows "online" status
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] No database errors
- [ ] Critical features work

---

## 🔒 SECURITY CHECKLIST

- [ ] .env files not committed to git
- [ ] API keys not exposed in logs
- [ ] SSH key permissions correct (chmod 400)
- [ ] Database credentials secure
- [ ] HTTPS working correctly
- [ ] CORS configured properly

---

## 📞 EMERGENCY CONTACTS

- **System Administrator**: [ADD CONTACT]
- **Database Admin**: [ADD CONTACT]
- **DevOps Lead**: [ADD CONTACT]

---

## 📚 REFERENCE DOCUMENTS

- `DEPLOYMENT_GOVERNANCE.md` - Strict governance rules
- `CRITICAL_FEATURES_DO_NOT_BREAK.md` - Features that must work
- `DISASTER_RECOVERY.md` - Emergency procedures
- `TESTING_COMPLETE_PASS_REPORT_JAN18_2026.md` - Test results template
- `START_SSH_TUNNEL.md` - SSH connection guide

---

## ✅ SUCCESS CRITERIA

Deployment is successful when:

1. ✅ All governance checks passed
2. ✅ All pre-deployment tests passed
3. ✅ Frontend and backend deployed without errors
4. ✅ All critical features working
5. ✅ No errors in logs after 15 minutes
6. ✅ Deployment log completed and committed
7. ✅ System Design Document updated and accessible

---

**REMEMBER: Quality over speed. It's better to delay than to break production.**

**If in doubt, DON'T DEPLOY. Consult with team first.**
