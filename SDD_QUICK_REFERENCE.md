# System Design Document (SDD) & Engineering Governance - Quick Reference

## 🚀 Deployed: 18 January 2026

---

## 📍 ACCESS

**URL:** https://prod.qsights.com/settings/system-design  
**Required Role:** Super Admin only  
**Navigation:** Settings → System Config → View SDD button

---

## 🎯 KEY FEATURES

### 1. System Design Document
- Auto-generated from live system
- Always current and accurate
- Download as versioned PDF
- Includes all architecture, security, database design

### 2. Pre-Deployment Testing ⚠️ MANDATORY
- Test event participation
- Test response saving
- Test notification lifecycle  
- Test reports & analytics
- **All must pass before deployment**

### 3. Schema Validation ⚠️ CRITICAL
- Prevents UUID ↔ BIGINT mismatches
- Validates migrations vs production
- **Blocks deployment on mismatch**

### 4. Critical Features Management
- 10 critical features (MUST always work)
- 4 non-critical features
- Testing requirements per feature
- Impact assessment

### 5. Rollback Procedures
- Database rollback steps
- Feature toggle procedures
- Emergency contacts
- Full system recovery

---

## 🚨 GOVERNANCE RULES (NO EXCEPTIONS)

Before ANY deployment:

1. **✅ SDD Updated** - Reflect all changes
2. **✅ Tests Pass** - Run and pass all tests
3. **✅ Schema Valid** - No mismatches
4. **✅ Rollback Plan** - Document procedure

**If ANY rule violated → DEPLOYMENT BLOCKED**

---

## 🛠️ HOW TO USE

### Before Deploying

```bash
# 1. Run validation script
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./validate_deployment.sh

# 2. If passes, proceed with deployment
# 3. If fails, fix issues and re-run
```

### Via Web UI

1. Login as super-admin
2. Go to Settings → System Config → System Design
3. Click "Run All Tests"
4. Click "Validate Schema"
5. Verify all pass
6. Proceed with deployment

---

## 📋 CRITICAL FEATURES (MUST WORK)

1. User Authentication & Authorization
2. Event Participation (User & Anonymous)
3. Response Saving (Question & Option Level)
4. Notification Lifecycle Tracking
5. Reports & Analytics
6. Role-Based Access Control
7. Data Audit Logging
8. S3 Image Upload
9. Email Campaign System
10. Data Safety Settings

---

## 🔧 API ENDPOINTS (All require super-admin auth)

```
GET  /api/system-design/data
POST /api/system-design/generate-pdf
GET  /api/system-design/download/{filename}
GET  /api/system-design/critical-features
POST /api/system-design/critical-features
POST /api/system-design/run-tests
POST /api/system-design/validate-schema
GET  /api/system-design/rollback-procedures
```

---

## 📁 KEY FILES

**Backend:**
- `backend/app/Http/Controllers/Api/SystemDesignController.php`
- `backend/routes/api.php` (updated)
- `backend/CRITICAL_FEATURES.json`
- `backend/SDD_VERSION.txt`
- `backend/resources/views/sdd-template.blade.php`

**Frontend:**
- `frontend/app/settings/system-design/page.tsx`
- `frontend/app/settings/page.tsx` (updated)

**Documentation:**
- `DEPLOYMENT_GOVERNANCE.md`
- `DEPLOYMENT_GUIDE_COMPLETE_WITH_GOVERNANCE.md`
- `validate_deployment.sh`

---

## ⚡ QUICK COMMANDS

```bash
# Run validation before deployment
./validate_deployment.sh

# Check if backend is accessible
curl https://prod.qsights.com/api/health

# Check if frontend is running
ps aux | grep next-server

# View recent logs
ssh ubuntu@13.126.210.220 "tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log"
```

---

## 🆘 EMERGENCY ROLLBACK

```bash
# If deployment fails:
ssh ubuntu@13.126.210.220

# Stop services
sudo pkill -f next-server

# Rollback code
cd /var/www/QSightsOrg2.0/frontend
sudo git reset --hard HEAD~1
sudo npm run build

# Restart
sudo nohup npm start > /var/log/qsights.log 2>&1 &

# Backend rollback (if needed)
cd /var/www/QSightsOrg2.0/backend
sudo php artisan migrate:rollback --step=1
```

---

## 📖 DOCUMENTATION

1. **DEPLOYMENT_GOVERNANCE.md** - All governance rules
2. **DEPLOYMENT_GUIDE_COMPLETE_WITH_GOVERNANCE.md** - Step-by-step deployment
3. **SDD_DEPLOYMENT_SUCCESS_JAN18_2026.md** - This deployment details
4. **CRITICAL_FEATURES_DO_NOT_BREAK.md** - Critical features list
5. **DISASTER_RECOVERY.md** - Emergency procedures

---

## ✅ STATUS: DEPLOYED & ACTIVE

- Frontend: ✅ Running (PID: 511922)
- Backend: ✅ Accessible
- SDD Page: ✅ Available at /settings/system-design
- All Tests: ✅ Functional
- Documentation: ✅ Complete

---

## 🎯 NEXT ACTIONS

1. **Test the feature:**
   - Login as super-admin
   - Access /settings/system-design
   - Run all tests
   - Validate schema
   - Download PDF

2. **Update for your team:**
   - Edit `backend/CRITICAL_FEATURES.json` to match your needs
   - Update emergency contacts in rollback procedures
   - Train team on governance rules

3. **Before next deployment:**
   - Run `./validate_deployment.sh`
   - Ensure all tests pass
   - Update SDD version if needed

---

**REMEMBER: Quality > Speed. Don't skip governance checks!**
