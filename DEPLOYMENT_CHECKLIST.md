# QSights Deployment Checklist & Workflow

## ⚠️ CRITICAL DEPLOYMENT RULE

**NEVER deploy directly to Production!**

**Required Flow**: Local → Pre-Prod → Production

---

## 🔄 Deployment Workflow

```
┌──────────────┐
│    LOCAL     │  Development & Testing
│ Development  │  
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   PRE-PROD   │  Staging Environment
│  3.110.94.207│  • Deploy here FIRST
│              │  • Test ALL features
│              │  • Verify EVERYTHING
└──────┬───────┘
       │
       │  ✅ All tests passed
       │  ✅ Verified for 24 hours
       │  ✅ No critical bugs
       │
       ▼
┌──────────────┐
│  PRODUCTION  │  Live Environment
│13.126.210.220│  • Deploy ONLY after Pre-Prod approval
│              │  • Requires "VERIFIED" confirmation
└──────────────┘
```

---

## 📝 Pre-Deployment Checklist

### Local Development ✅

- [ ] All code changes committed to Git
- [ ] No uncommitted changes (`git status` clean)
- [ ] Local testing completed
- [ ] No console errors
- [ ] Documentation updated

---

## 🔶 PHASE 1: Pre-Production Deployment

### Deploy to Pre-Prod

**Server**: 3.110.94.207  
**Commands**:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Backend
./deploy_backend_preprod.sh

# Frontend
./deploy_frontend_preprod.sh
```

### Pre-Prod Testing Checklist (MANDATORY)

#### ✅ Backend Testing:
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Database operations successful
- [ ] Error handling working
- [ ] Laravel logs clean
- [ ] Scheduled tasks configured

#### ✅ Frontend Testing:
- [ ] All pages load correctly
- [ ] Login/logout functional
- [ ] Forms submit successfully
- [ ] Navigation working
- [ ] No console errors
- [ ] BUILD_ID verified
- [ ] API integrations working

#### ✅ Module Testing:
- [ ] **User Management**: CRUD operations
- [ ] **Programs**: Create, edit, delete
- [ ] **Evaluations**: 
  - Create templates
  - Trigger evaluations
  - Submit evaluations
  - View reports
- [ ] **Analytics**: All 6 endpoints working
- [ ] **Reports**: Generate and export
- [ ] **Permissions**: Role-based access correct

#### ✅ Security & Performance:
- [ ] Authorization working
- [ ] Unauthorized access blocked
- [ ] Page load < 3 seconds
- [ ] API response < 500ms
- [ ] Mobile responsive

### Pre-Prod Approval

**Requirements**:
- ✅ ALL tests above passed
- ✅ Pre-Prod stable for minimum 24 hours
- ✅ No critical bugs found
- ✅ Stakeholders notified

**Sign-Off**: _______________ Date: ___________

---

## 🔴 PHASE 2: Production Deployment

### ⚠️ CRITICAL REQUIREMENTS

**Before deploying to Production, you MUST have**:
1. ✅ Pre-Prod deployment completed
2. ✅ ALL Pre-Prod tests passed
3. ✅ Pre-Prod stable for 24+ hours
4. ✅ No critical bugs in Pre-Prod
5. ✅ Rollback plan prepared

### Deploy to Production

**Server**: 13.126.210.220  

**⚠️ Production scripts require TWO confirmations:**

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Backend
./deploy_backend_prod.sh
# Will ask: "Type 'VERIFIED' to confirm Pre-Prod testing"
# Will ask: "Type 'DEPLOY-TO-PRODUCTION' to deploy"

# Frontend  
./deploy_frontend_prod.sh
# Will ask: "Type 'VERIFIED' to confirm Pre-Prod testing"
# Will ask: "Type 'DEPLOY-TO-PRODUCTION' to deploy"
```

### Post-Production Verification

#### Immediate (0-5 min):
- [ ] Site accessible: https://prod.qsights.com
- [ ] Home page loads
- [ ] Login working
- [ ] No 500 errors
- [ ] No console errors
- [ ] Health check passed

#### Critical Path (5-15 min):
- [ ] User authentication flow
- [ ] Evaluation creation/submission
- [ ] Report generation
- [ ] Critical APIs responding
- [ ] PM2 processes running

#### Monitoring (15-30 min):
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] Server resources healthy
- [ ] Logs clean

**Production Sign-Off**: _______________ Date: ___________

---

## 🔙 Rollback Procedures

### When to Rollback:

**Immediate rollback if**:
- ❌ Site not accessible
- ❌ Critical features broken
- ❌ Data corruption
- ❌ Widespread errors
- ❌ Security vulnerability

### Rollback Commands:

**Backend**:
```bash
./rollback_backend_prod.sh backend_YYYYMMDD_HHMMSS
```

**Frontend**:
```bash
./rollback_frontend_prod.sh frontend_YYYYMMDD_HHMMSS
```

Backup locations:
- Pre-Prod: `/home/ubuntu/backups/preprod/`
- Production: `/home/ubuntu/backups/production/`

---

## 📊 Deployment Schedule

| Environment | Day | Time | Duration |
|-------------|-----|------|----------|
| Pre-Prod | Any Weekday | 10 AM - 4 PM | ~15 min |
| Pre-Prod Testing | 24+ hours | Ongoing | Minimum 1 day |
| Production | Tue/Wed only | 11 AM - 2 PM | ~20 min |
| Post-Deploy Monitor | Same day | 30 min active | + 24 hrs passive |

**⚠️ Never deploy on**:
- Monday (start of week issues)
- Friday (no weekend support)
- Before holidays
- Late evening/night

---

## 🛠️ Quick Reference

### Environment URLs:
- **Local**: http://localhost:3000
- **Pre-Prod**: https://preprod.qsights.com
- **Production**: https://prod.qsights.com

### Server Access:
```bash
# Pre-Prod SSH
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207

# Production SSH
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Pre-Prod SSM
aws ssm start-session --target i-0b62d4d1009b83e2a \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=1199,portNumber=22" --region ap-south-1

# Production SSM
aws ssm start-session --target i-0de19fdf0bd6568b5 \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=3399,portNumber=22" --region ap-south-1
```

### Check Logs:
```bash
# Backend logs
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log

# Frontend logs
pm2 logs qsights-frontend

# Nginx logs
tail -f /var/log/nginx/error.log
```

---

## ❌ DEPLOYMENT BLOCKED Scenarios

**Script will BLOCK deployment if**:

1. **Pre-Prod not verified** → Must type "VERIFIED"
2. **Production confirmation missing** → Must type "DEPLOY-TO-PRODUCTION"
3. **Files missing** → PEM key or source code not found
4. **Build fails** → Frontend build error

---

## 📞 Emergency Contacts

- **PEM Key**: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- **Backups**: `/home/ubuntu/backups/[environment]/`
- **Documentation**: See `DEPLOYMENT_WORKFLOW_GUIDE.md` for detailed procedures

---

**Version**: 2.0  
**Last Updated**: February 7, 2026  
**Enforces**: Mandatory Pre-Prod → Production workflow
