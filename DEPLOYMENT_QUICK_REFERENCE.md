# 🚀 QSights Deployment Quick Reference

## 📋 Deployment Flow (MANDATORY)

```
Local → Pre-Prod → Production
  ↓        ↓           ↓
 Test   24hrs+    Go Live
        Testing
```

**⚠️ NEVER SKIP PRE-PROD!**

---

## 🔧 Quick Commands

### Deploy to Pre-Prod (Staging)
```bash
./deploy_backend_preprod.sh
./deploy_frontend_preprod.sh
```
- ✅ No special confirmations needed
- ⏱️ Takes ~5-10 minutes
- 🌐 Test at: https://preprod.qsights.com

### Deploy to Production (After Pre-Prod approval)
```bash
./deploy_backend_prod.sh
./deploy_frontend_prod.sh
```
- ⚠️ Requires typing `VERIFIED`
- ⚠️ Requires typing `DEPLOY-TO-PRODUCTION`
- ⏱️ Takes ~10-15 minutes
- 🌐 Live at: https://prod.qsights.com

---

## 🔙 Emergency Rollback

### List Available Backups
```bash
# SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# List backups
ls -lh /home/ubuntu/backups/production/
```

### Rollback Backend
```bash
./rollback_backend_prod.sh backend_20260207_143000
```
- Must type `ROLLBACK` to confirm
- ⏱️ Takes ~3-5 minutes

### Rollback Frontend
```bash
./rollback_frontend_prod.sh frontend_20260207_143000
```
- Must type `ROLLBACK` to confirm
- ⏱️ Takes ~2-3 minutes

---

## 🔍 Health Checks

### Check Site Status
```bash
# Quick check
curl -I https://prod.qsights.com

# API health
curl https://prod.qsights.com/api/health
```

### Check Logs (SSH to server first)
```bash
# Laravel logs
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log

# PM2 logs
pm2 logs qsights-frontend

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Check Services
```bash
# SSH to server, then:
pm2 list
sudo systemctl status nginx
sudo systemctl status php8.1-fpm
```

---

## 🌐 Environment URLs

| Environment | URL | Server IP |
|-------------|-----|-----------|
| Local | http://localhost:3000 | Your Mac |
| Pre-Prod | https://preprod.qsights.com | 3.110.94.207 |
| Production | https://prod.qsights.com | 13.126.210.220 |

---

## 🔑 SSH Access

### Pre-Prod
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207
```

### Production
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
```

### SSM (Alternative)
```bash
# Pre-Prod (port 1199)
aws ssm start-session --target i-0b62d4d1009b83e2a \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=1199,portNumber=22" --region ap-south-1

# Then: ssh -i PEM_KEY ubuntu@localhost -p 1199

# Production (port 3399)
aws ssm start-session --target i-0de19fdf0bd6568b5 \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=3399,portNumber=22" --region ap-south-1

# Then: ssh -i PEM_KEY ubuntu@localhost -p 3399
```

---

## ⏰ Deployment Schedule

### Pre-Prod
- ✅ Any weekday: 10 AM - 4 PM
- ✅ Test for minimum **24 hours**

### Production
- ✅ **Tuesday or Wednesday only**
- ✅ **11 AM - 2 PM** (working hours)
- ❌ **NEVER**: Monday, Friday, before holidays, late evening

---

## 📝 Pre-Deployment Checklist

Before deploying to **Pre-Prod**:
- [ ] Code committed to Git
- [ ] Local testing passed
- [ ] No pending uncommitted changes

Before deploying to **Production**:
- [ ] Pre-Prod deployed and stable for 24+ hours
- [ ] All tests passed (Backend, Frontend, Security, Mobile)
- [ ] No critical bugs found
- [ ] Stakeholders notified
- [ ] Rollback plan prepared

---

## 🧪 Testing Checklist (Pre-Prod)

### Backend (12 items)
- [ ] All API endpoints responding
- [ ] Authentication working
- [ ] Database connections OK
- [ ] Error handling working
- [ ] Logs recording properly
- [ ] Scheduled tasks running

### Frontend (15 items)
- [ ] All pages load
- [ ] Login/logout works
- [ ] Forms submitting
- [ ] Navigation working
- [ ] No console errors
- [ ] BUILD_ID correct
- [ ] API calls successful

### Modules
- [ ] User Management (CRUD)
- [ ] Programs (Create/Edit/Delete)
- [ ] Evaluations (Templates/Trigger/Submit/Reports)
- [ ] Analytics (6 endpoints working)
- [ ] Reports (Generate/Export)
- [ ] Permissions (Role-based access)

### Security (8 items)
- [ ] Auth required for protected routes
- [ ] Unauthorized access blocked
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF tokens working
- [ ] Session management OK
- [ ] Password hashing secure
- [ ] Rate limiting active

### Performance
- [ ] Page load < 3 seconds
- [ ] API response < 500ms
- [ ] Database queries optimized
- [ ] Caching working

### Mobile
- [ ] Responsive design working
- [ ] Touch interactions OK
- [ ] Mobile navigation smooth
- [ ] Forms usable on mobile

---

## 🚨 Rollback Triggers (Immediate)

Roll back production if:
- ❌ Site not accessible
- ❌ Critical functionality broken (login, evaluations, reports)
- ❌ Data corruption detected
- ❌ Widespread user-reported errors
- ❌ Performance severely degraded (5x slower)
- ❌ Security vulnerability introduced

---

## 📞 Emergency Contacts

*Add your team contacts here*

---

## 📚 Full Documentation

- **Complete Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Detailed Workflow**: `DEPLOYMENT_WORKFLOW_GUIDE.md`
- **Environment Configs**: `.env.local`, `.env.preprod`, `.env.production`

---

## 🔧 Common Issues & Quick Fixes

### Issue: Permission Denied
```bash
chmod +x deploy_*.sh rollback_*.sh
```

### Issue: Site Returns 500
```bash
# SSH to server
cd /var/www/QSightsOrg2.0/backend
sudo php artisan cache:clear
sudo php artisan config:clear
sudo systemctl restart php8.1-fpm
```

### Issue: PM2 Not Running
```bash
# SSH to server
pm2 restart qsights-frontend
pm2 save
pm2 logs qsights-frontend
```

### Issue: BUILD_ID Mismatch
```bash
# SSH to server
pm2 restart qsights-frontend
sleep 5
# Then check: cat /var/www/frontend/.next/BUILD_ID
```

---

**Version**: 1.0  
**Last Updated**: February 7, 2026  

**Remember**: Pre-Prod → Production. Always test first! 🚀
