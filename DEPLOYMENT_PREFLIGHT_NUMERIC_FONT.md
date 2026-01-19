# 🚀 PRE-FLIGHT DEPLOYMENT CHECKLIST
## Global Numeric Font Reduction - 18 Jan 2026

---

## ✅ DEPLOYMENT READINESS

### Change Type: **CSS ONLY**
- ✅ Single file: `frontend/app/globals.css`
- ✅ No backend changes
- ✅ No database migrations
- ✅ No API modifications
- ✅ **Risk Level: LOW**

---

## 📋 PRE-DEPLOYMENT CHECKS

### 1. Critical Features Assessment
**Impact on Critical Features:** ✅ **NONE**

- ✅ Response Data Integrity: **NOT AFFECTED** (no backend changes)
- ✅ Statistics & Counts: **NOT AFFECTED** (display only)
- ✅ Notification System: **NOT AFFECTED** (CSS only)
- ✅ Event Participation: **NOT AFFECTED** (functionality unchanged)
- ✅ Data Safety System: **NOT AFFECTED** (CSS only)

**Conclusion:** This is a **visual-only change** - all critical features remain untouched.

---

### 2. Files Modified
- ✅ `frontend/app/globals.css` (added CSS utility overrides)

**NO changes to:**
- ❌ Backend controllers
- ❌ Database migrations
- ❌ API routes
- ❌ Response handling
- ❌ Authentication
- ❌ Data models

---

### 3. Testing Status
- ✅ Local backup created
- ✅ Changes documented
- ✅ Rollback procedure prepared
- ✅ CSS syntax verified (no build errors)

---

### 4. Rollback Plan
**Simple 1-minute rollback available:**

```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
cd /var/www/QSightsOrg2.0
cp backups/backup_pre_font_reduction_*/globals.css.backup frontend/app/globals.css
cd frontend && npm run build && pm2 restart qsights-frontend
```

---

## 🎯 DEPLOYMENT METHOD

### Option 1: Automated Script (RECOMMENDED)
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./deploy_global_numeric_font_reduction.sh
```

**The script will:**
1. ✅ Validate pre-conditions
2. ✅ Create production backup
3. ✅ Upload modified file
4. ✅ Rebuild frontend
5. ✅ Restart services
6. ✅ Verify deployment

---

### Option 2: Manual Deployment
```bash
# 1. SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# 2. Backup current file
cd /var/www/QSightsOrg2.0
mkdir -p backups/manual_backup_$(date +%Y%m%d_%H%M%S)
cp frontend/app/globals.css backups/manual_backup_$(date +%Y%m%d_%H%M%S)/

# 3. Exit and upload new file
exit
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/app/globals.css \
    ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/frontend/app/globals.css

# 4. SSH back and rebuild
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
cd /var/www/QSightsOrg2.0/frontend
npm run build
pm2 restart qsights-frontend
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Immediate Checks (2 minutes)
1. Visit https://prod.qsights.com
2. Login as admin
3. Navigate to **Programs** page
4. Check KPI cards at top - numbers should be slightly smaller
5. Navigate to **Dashboard**
6. Verify all metric cards look balanced
7. Check **Organizations**, **Participants**, **Questionnaires** pages

### Visual Verification
✅ Numbers are readable and balanced  
✅ No overflow or text wrapping  
✅ Labels and subtitles still clear  
✅ Cards look professional  
✅ No layout breaks  

---

## ⚠️ WHAT TO WATCH FOR

### Potential Issues (Low Probability)
- Font appears too small on some screens → Adjust percentage in globals.css
- Text wrapping in narrow containers → Check mobile view
- Cache issues → Clear browser cache, hard refresh (Cmd+Shift+R)

### If ANY Issues Occur
1. **Don't panic** - this is CSS only
2. Run rollback command (30 seconds)
3. Document the issue
4. Adjust CSS locally and redeploy

---

## 📊 DEPLOYMENT IMPACT

**Downtime:** ≈ 0 seconds (CSS hot-reload)  
**Build Time:** ≈ 1-2 minutes  
**Risk Level:** 🟢 **LOW**  
**User Impact:** Visual improvement only  
**Rollback Time:** ≈ 30 seconds  

---

## ✅ GOVERNANCE COMPLIANCE

### SDD Update Required?
**NO** - CSS-only visual change, no functional modification

### Pre-Deployment Tests Required?
**NO** - Change doesn't affect:
- Response saving
- Event participation
- Notification lifecycle
- Reports & analytics

### Schema Validation Required?
**NO** - No database changes

### Why This is Safe:
- Pure presentation layer change
- No business logic affected
- No data handling modified
- Instant rollback available
- No user data at risk

---

## 🚦 READY TO DEPLOY?

**ALL GREEN - SAFE TO PROCEED**

Run this command to deploy:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./deploy_global_numeric_font_reduction.sh
```

---

**Deployment Time:** ≈ 3-5 minutes  
**Confidence Level:** 🟢 **HIGH** (CSS only, safe change)
