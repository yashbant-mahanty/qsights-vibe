# DEPLOYMENT GOVERNANCE RULES

## 🚨 MANDATORY PRE-DEPLOYMENT CHECKLIST

**NO DEPLOYMENT WITHOUT COMPLETING ALL STEPS**

### 1. ✅ SDD UPDATED
- [ ] System Design Document reflects all changes
- [ ] Critical features list is current
- [ ] Version number updated
- [ ] PDF can be generated successfully

**Command:**
```bash
# Via UI: Settings → System Config → System Design Document
# Or via API:
curl -X GET https://prod.qsights.com/api/system-design/data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Result:** All sections populated, no errors

---

### 2. ✅ PRE-DEPLOYMENT TESTS PASSED
- [ ] Event Participation Test: PASSED
- [ ] Response Saving Test: PASSED
- [ ] Notification Lifecycle Test: PASSED
- [ ] Reports & Analytics Test: PASSED

**Command:**
```bash
# Via UI: Settings → System Design → Pre-Deployment Tests → Run All Tests
# Or via API:
curl -X POST https://prod.qsights.com/api/system-design/run-tests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Result:** All tests PASSED, zero failures

**❌ DEPLOYMENT BLOCKED IF ANY TEST FAILS**

---

### 3. ✅ SCHEMA VALIDATED
- [ ] No UUID ↔ BIGINT mismatches
- [ ] Migration files consistent with production
- [ ] No unexpected schema changes

**Command:**
```bash
# Via UI: Settings → System Design → Schema Validation → Validate Schema
# Or via API:
curl -X POST https://prod.qsights.com/api/system-design/validate-schema \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Result:** "Schema Valid" with zero issues

**❌ DEPLOYMENT BLOCKED ON SCHEMA MISMATCH**

---

### 4. ✅ ROLLBACK PLAN DOCUMENTED
- [ ] Rollback procedure identified for this change
- [ ] Emergency contact information updated
- [ ] Database backup completed
- [ ] Code backup checkpoint created

**Command:**
```bash
# Via UI: Settings → System Design → Rollback Procedures
# Or create manual checkpoint:
cd /Users/yash/Documents/Projects/QSightsOrg2.0
mkdir -p backups/$(date +%Y-%m-%d)_PRE_DEPLOYMENT
cp -r backend frontend backups/$(date +%Y-%m-%d)_PRE_DEPLOYMENT/
```

**Result:** Documented rollback steps, backup verified

---

## 🎯 GOVERNANCE ENFORCEMENT

### Rule 1: No SDD Update → No Merge
- Pull requests MUST include SDD updates if they affect:
  - Architecture
  - Database schema
  - Critical features
  - Security model
  - APIs

### Rule 2: No Tests → No Deployment
- ALL pre-deployment tests must be executed
- ALL tests must pass
- Test results must be documented in deployment log

### Rule 3: Schema Mismatch → Hard Stop
- Schema validation MUST pass
- UUID ↔ BIGINT consistency enforced
- Production schema documented in SDD

### Rule 4: No Rollback Plan → Block Release
- Every deployment needs a rollback procedure
- Emergency procedures must be documented
- Database and code backups required

---

## 📋 DEPLOYMENT EXECUTION CHECKLIST

1. **Pre-Flight Checks**
   ```bash
   # 1. Confirm tests passed
   # 2. Validate schema
   # 3. Create backup
   # 4. Review rollback plan
   ```

2. **Backend Deployment**
   ```bash
   ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
   cd /var/www/QSightsOrg2.0/backend
   
   # Pull latest code
   git pull origin main
   
   # Install dependencies
   composer install --no-dev --optimize-autoloader
   
   # Run migrations (if any)
   php artisan migrate --force
   
   # Clear caches
   php artisan config:clear
   php artisan cache:clear
   php artisan route:clear
   php artisan view:clear
   
   # Optimize
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

3. **Frontend Deployment**
   ```bash
   cd /var/www/QSightsOrg2.0/frontend
   
   # Pull latest code
   git pull origin main
   
   # Install dependencies
   npm install
   
   # Build
   npm run build
   
   # Clear Next.js cache
   rm -rf .next/cache
   
   # Restart PM2
   pm2 restart qsights-frontend --update-env
   
   # Verify
   pm2 status
   pm2 logs qsights-frontend --lines 50
   ```

4. **Post-Deployment Verification**
   ```bash
   # 1. Check frontend loads: https://prod.qsights.com
   # 2. Test login: superadmin@qsights.com
   # 3. Verify critical features:
   #    - User authentication
   #    - Event participation
   #    - Response saving
   #    - Notification system
   #    - Reports & Analytics
   # 4. Check logs for errors
   # 5. Monitor for 15 minutes
   ```

---

## 🚨 EMERGENCY ROLLBACK PROCEDURE

If deployment fails or causes issues:

### Immediate Actions
```bash
# 1. Stop services
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
cd /var/www/QSightsOrg2.0/frontend
pm2 stop qsights-frontend

# 2. Rollback code
git reset --hard HEAD~1
npm run build
rm -rf .next/cache
pm2 restart qsights-frontend

# 3. Rollback database (if migrations ran)
cd /var/www/QSightsOrg2.0/backend
php artisan migrate:rollback --step=1

# 4. Verify system
curl -I https://prod.qsights.com
pm2 logs qsights-frontend --lines 100
```

### Communication
- Notify stakeholders immediately
- Document what failed
- Log incident in DISASTER_RECOVERY.md
- Schedule post-mortem

---

## 📊 DEPLOYMENT LOG TEMPLATE

Create log entry in `deployment_log.txt`:

```
==================================================
DEPLOYMENT: [DATE] [TIME]
==================================================
Version: [SDD Version]
Deployed By: [Name]
Changes:
  - [Feature/Fix 1]
  - [Feature/Fix 2]

PRE-DEPLOYMENT CHECKS:
  ✅ SDD Updated: YES
  ✅ Tests Passed: ALL
  ✅ Schema Validated: PASS
  ✅ Rollback Plan: DOCUMENTED
  ✅ Backup Created: YES

DEPLOYMENT STEPS:
  1. Backend deployment: SUCCESS
  2. Frontend deployment: SUCCESS
  3. Verification: SUCCESS

POST-DEPLOYMENT:
  - Frontend loads: ✅
  - Login works: ✅
  - Critical features tested: ✅
  - No errors in logs: ✅

ROLLBACK PLAN:
  - git reset --hard [COMMIT_HASH]
  - php artisan migrate:rollback --step=1

STATUS: ✅ SUCCESS
==================================================
```

---

## 🔒 SECURITY REMINDERS

1. **Never expose credentials**
   - Use environment variables
   - Never commit .env files
   - Rotate API keys quarterly

2. **Database Safety**
   - Always backup before migrations
   - Test migrations in staging first
   - Have rollback SQL ready

3. **Access Control**
   - Only super-admin can access SDD
   - SSH keys protected with proper permissions
   - API tokens expire after inactivity

---

## 📞 EMERGENCY CONTACTS

- **System Administrator**: [ADD CONTACT]
- **DevOps Lead**: [ADD CONTACT]
- **Database Administrator**: [ADD CONTACT]

---

**REMEMBER: SAFETY OVER SPEED**

Better to delay deployment than break production!
