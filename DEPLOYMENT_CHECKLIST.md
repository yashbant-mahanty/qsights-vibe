# Deployment Checklist - Evaluation Admin Enhancements

## Pre-Deployment ✅

- [x] Dashboard performance fix implemented (parallel API calls)
- [x] Bulk import modal component created
- [x] Bulk import backend controller created
- [x] API routes added to api.php
- [x] Frontend built successfully (no errors)
- [x] TypeScript compilation successful
- [x] No linting errors
- [x] Documentation created
- [x] Deployment script created and tested
- [x] Rollback procedures documented

## Deployment Steps 🚀

### Option 1: Automated Deployment (Recommended)
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./deploy_evaluation_enhancements.sh
```

### Option 2: Manual Deployment
Follow steps in [EVALUATION_ENHANCEMENTS_SUMMARY.md](EVALUATION_ENHANCEMENTS_SUMMARY.md)

## Post-Deployment Verification ✓

### 1. Service Health Check
- [ ] SSH to production: `ssh -i ~/.ssh/Qsights.pem ec2-user@13.126.210.220`
- [ ] Check PM2 status: `pm2 list`
- [ ] Check PM2 logs: `pm2 logs qsights-frontend --lines 50`
- [ ] Test site availability: `curl -I https://prod.qsights.com`
- [ ] Expected: HTTP 200 OK

### 2. Dashboard Performance Test
- [ ] Login as Evaluation Admin at https://prod.qsights.com
- [ ] Navigate to Evaluation Admin Dashboard
- [ ] Measure load time (should be < 3 seconds)
- [ ] Verify all stats cards display correctly
- [ ] Check browser DevTools Network tab:
  - [ ] See 6 API calls to evaluation endpoints
  - [ ] All calls should complete in parallel
  - [ ] Total load time < 3 seconds

### 3. Bulk Import Feature Test
- [ ] Click "Bulk Import (CSV/Excel)" button on dashboard
- [ ] Verify modal opens correctly
- [ ] Click "Download CSV Sample" button
- [ ] Verify sample.csv downloads (should contain ITES, Sales, HR departments)
- [ ] Open sample CSV and add test data:
  ```csv
  Department,Role,Staff
  TestDept,TestRole,"Test User1, Test User2"
  ```
- [ ] Save as test.csv
- [ ] Upload test.csv via "Select CSV File"
- [ ] Click "Import Data"
- [ ] Verify success message: "Created 1 departments, 1 roles, 2 staff members"
- [ ] Navigate to evaluation staff management
- [ ] Verify new records exist in database

### 4. API Endpoint Verification
- [ ] SSH to production
- [ ] Check routes exist:
  ```bash
  cd /var/www/QSightsOrg2.0/backend
  php artisan route:list | grep bulk-import
  ```
- [ ] Expected output:
  ```
  POST   api/evaluation/bulk-import ............. App\Http\Controllers\Api\EvaluationBulkImportController@import
  GET    api/evaluation/bulk-import/sample ...... App\Http\Controllers\Api\EvaluationBulkImportController@downloadSample
  ```

### 5. Database Verification
- [ ] SSH to production
- [ ] Connect to PostgreSQL:
  ```bash
  psql -h qsights-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com \
       -U qsights_db_admin \
       -d qsights_db_org
  ```
- [ ] Check test import data:
  ```sql
  SELECT * FROM evaluation_departments WHERE name = 'TestDept';
  SELECT * FROM evaluation_roles WHERE name = 'TestRole';
  SELECT * FROM evaluation_staff WHERE name IN ('Test User1', 'Test User2');
  ```

### 6. Error Handling Tests
- [ ] Try uploading invalid file format (.txt)
- [ ] Verify error message: "Please select a CSV file (.csv)"
- [ ] Try uploading CSV with missing columns
- [ ] Verify error message shows missing columns
- [ ] Try uploading empty CSV
- [ ] Verify error message: "CSV file is empty or invalid format"

### 7. Permission Tests
- [ ] Logout from Evaluation Admin
- [ ] Login as regular user (staff member)
- [ ] Navigate to dashboard
- [ ] Verify "Bulk Import" button does NOT appear
- [ ] Try direct API access (should return 403 Forbidden)

### 8. Performance Monitoring
- [ ] Check Laravel logs: `tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`
- [ ] Check PM2 logs: `pm2 logs qsights-frontend`
- [ ] Monitor CPU usage: `top`
- [ ] Monitor memory usage: `free -h`
- [ ] No significant increase in resource usage expected

## Issues & Troubleshooting 🔧

### Issue: Dashboard still slow
**Cause**: API calls not parallelized correctly
**Fix**: 
```bash
# Check browser Network tab - all calls should fire simultaneously
# If not, verify page.tsx was deployed correctly
cd /var/www/frontend/app/evaluation-admin
cat page.tsx | grep "Promise.allSettled"
```

### Issue: Bulk import button not visible
**Cause**: Component not deployed or permission issue
**Fix**:
```bash
# Verify component exists
ls -la /var/www/frontend/components/evaluation/BulkImportModal.tsx
# Verify import in page.tsx
cd /var/www/frontend/app/evaluation-admin
grep "BulkImportModal" page.tsx
```

### Issue: CSV upload fails
**Cause**: Backend controller not deployed or permissions
**Fix**:
```bash
# Verify controller exists
ls -la /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/EvaluationBulkImportController.php
# Verify routes
cd /var/www/QSightsOrg2.0/backend
php artisan route:list | grep bulk-import
# Clear cache
php artisan cache:clear
php artisan route:clear
```

### Issue: Import succeeds but no data
**Cause**: Database transaction issue or program_id mismatch
**Fix**:
```bash
# Check Laravel logs
tail -100 /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log
# Check user's program_id
psql -h ... -U ... -d qsights_db_org
SELECT id, email, role, program_id FROM users WHERE email = 'evaluator@example.com';
```

### Issue: 500 Error on upload
**Cause**: File size limit or PHP configuration
**Fix**:
```bash
# Check PHP limits
php -i | grep upload_max_filesize
php -i | grep post_max_size
# Should be at least 10M
# Edit php.ini if needed
sudo nano /etc/php/8.1/fpm/php.ini
# Then restart PHP-FPM
sudo systemctl restart php8.1-fpm
```

## Rollback Procedure 🔄

If critical issues occur:

```bash
ssh -i ~/.ssh/Qsights.pem ec2-user@13.126.210.220

# Get latest backup timestamp
ls -lt /var/www/frontend/ | grep .next.backup

# Rollback Frontend
cd /var/www/frontend
sudo rm -rf .next
sudo cp -r .next.backup.TIMESTAMP .next
sudo chown -R www-data:www-data .next
pm2 restart qsights-frontend

# Rollback Backend (if needed)
cd /var/www/QSightsOrg2.0/backend
sudo cp routes/api.php.backup.TIMESTAMP routes/api.php
sudo rm app/Http/Controllers/Api/EvaluationBulkImportController.php
php artisan cache:clear
php artisan route:clear

# Verify rollback
curl -I https://prod.qsights.com
pm2 logs qsights-frontend --lines 20
```

## Success Criteria ✅

Deployment is successful if:
- [x] Frontend loads without errors (HTTP 200)
- [x] Dashboard loads in < 3 seconds
- [x] All stats and charts display correctly
- [x] Bulk import button visible for evaluation-admin
- [x] CSV sample downloads successfully
- [x] CSV upload and import works correctly
- [x] New records appear in database after import
- [x] No errors in PM2 or Laravel logs
- [x] Performance baseline maintained (no slowdown)

## Cleanup 🧹

After successful deployment:

```bash
ssh -i ~/.ssh/Qsights.pem ec2-user@13.126.210.220

# Remove temporary files
rm -rf /tmp/.next
rm -f /tmp/api.php
rm -f /tmp/EvaluationBulkImportController.php
rm -f /tmp/page.tsx
rm -rf /tmp/components

# Optional: Remove old backups (keep last 3)
cd /var/www/frontend
ls -t .next.backup.* | tail -n +4 | xargs sudo rm -rf

cd /var/www/QSightsOrg2.0/backend/routes
ls -t api.php.backup.* | tail -n +4 | xargs sudo rm -f
```

## Final Sign-Off ✍️

- [ ] All verification tests passed
- [ ] Performance metrics acceptable
- [ ] No errors in logs
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Monitoring enabled

**Deployed By**: _________________  
**Date**: _________________  
**Time**: _________________  
**Sign-Off**: _________________  

---

**Status**: Ready for Deployment  
**Version**: 1.0  
**Date**: Feb 05, 2026
