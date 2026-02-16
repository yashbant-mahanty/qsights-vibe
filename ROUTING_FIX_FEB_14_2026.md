# Critical Routing Fix - February 14, 2026

## Bug Description

**Critical Issue**: When logged in as Program Admin, Program Manager, or Program Moderator, hard refreshing the dashboard or organization tabs resulted in a 404 error with console message:
```
GET https://prod.qsights.com/login 404 (Not Found)
```

## Root Cause

Three page components were attempting to redirect to `/login` which doesn't exist in the application:
- `/app/program-admin/page.tsx`
- `/app/program-manager/page.tsx`  
- `/app/program-moderator/page.tsx`

The actual login page is at `/` (homepage/root route).

Additionally, these pages were checking authentication state **before** the auth context finished loading, causing premature redirects during hard refresh.

## Files Modified

### 1. `/frontend/app/program-admin/page.tsx`
- **Line 49**: Added `isLoading: authLoading` to `useAuth()` destructuring
- **Lines 87-95**: Added auth loading check and changed redirect from `/login` to `/`

### 2. `/frontend/app/program-manager/page.tsx`
- **Line 39**: Added `isLoading: authLoading` to `useAuth()` destructuring
- **Lines 104-112**: Added auth loading check and changed redirect from `/login` to `/`

### 3. `/frontend/app/program-moderator/page.tsx`
- **Line 60**: Added `isLoading: authLoading` to `useAuth()` destructuring
- **Lines 116-124**: Added auth loading check and changed redirect from `/login` to `/`

## Changes Made

### Before:
```typescript
const { currentUser: authUser } = useAuth();

async function loadDashboardData() {
  if (!authUser) {
    router.push('/login');  // ❌ Wrong route - doesn't exist
    return;
  }
}
```

### After:
```typescript
const { currentUser: authUser, isLoading: authLoading } = useAuth();

async function loadDashboardData() {
  // Wait for auth to finish loading before redirecting
  if (authLoading) {
    return;
  }
  
  if (!authUser) {
    router.push('/');  // ✅ Correct route - homepage/login
    return;
  }
}
```

## Testing Steps

1. Log in as Program Admin, Program Manager, or Program Moderator
2. Navigate to Dashboard tab
3. Perform hard refresh (Cmd+Shift+R or Ctrl+F5)
4. Verify: Page loads correctly without 404 error
5. Navigate to Organizations tab (if accessible)
6. Perform hard refresh
7. Verify: Page loads correctly without 404 error

## Deployment

Run the deployment script:
```bash
chmod +x deploy_routing_fix_feb_14_2026.sh
./deploy_routing_fix_feb_14_2026.sh
```

## Impact

- **Severity**: CRITICAL  
- **Affected Users**: Program Admins, Program Managers, Program Moderators
- **Affected Pages**: Dashboard, Organizations (for applicable roles)
- **User Experience**: Hard refresh now works correctly without 404 errors

## Verification

After deployment, verify in production:
1. Login as each affected role
2. Test hard refresh on dashboard and organizations pages
3. Confirm no console errors
4. Confirm page loads correctly

## Backup

Automatic backup created at: `/var/www/backups/frontend_backup_YYYYMMDD_HHMMSS.tar.gz`

## Rollback Procedure

If issues occur:
```bash
ssh -i /path/to/key.pem ubuntu@13.126.210.220
cd /var/www/frontend
sudo pm2 stop frontend
sudo tar -xzf /var/www/backups/frontend_backup_YYYYMMDD_HHMMSS.tar.gz -C /var/www/frontend/
sudo pm2 restart frontend
```

---

**Fix Completed**: February 14, 2026  
**Deployed By**: Development Team  
**Status**: ✅ Ready for Production Deployment
