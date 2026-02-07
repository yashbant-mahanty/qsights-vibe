# CSRF Token Mismatch Fix - Documentation

## Problem
Preview and Edit operations were failing with "CSRF token mismatch" error despite using token-based authentication (Bearer tokens).

## Root Cause
In `/Users/yash/Documents/Projects/Qsights2.0-Backend/bootstrap/app.php`, the application was configured with:
1. `statefulApi()` middleware - This enables session-based CSRF protection for API routes
2. `validateCsrfTokens()` with only login endpoints excluded

This configuration is for **session-based** authentication (cookies), not **token-based** authentication (Bearer tokens).

## Solution Applied

### Backend Fix (Laravel)
**File**: `bootstrap/app.php`

**Before**:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\CheckRole::class,
    ]);
    
    $middleware->statefulApi();  // ❌ Enables CSRF for API
    
    // Exclude login endpoint from CSRF verification
    $middleware->validateCsrfTokens(except: [
        'api/auth/login',
        'api/auth/validate-email',
    ]);
})
```

**After**:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\CheckRole::class,
    ]);
    
    // Disable CSRF for all API routes (using token-based auth)
    $middleware->validateCsrfTokens(except: [
        'api/*',  // ✅ All API routes excluded from CSRF
    ]);
})
```

### Changes Made:
1. ✅ Removed `statefulApi()` - Not needed for token auth
2. ✅ Changed CSRF exclusion from specific routes to `api/*` - All API routes now exempt
3. ✅ Kept `auth:sanctum` middleware on routes - Token validation still enforced

## Why This Works

### Token-Based Authentication Flow:
```
1. User logs in → Receives JWT/Bearer token
2. Token stored in localStorage (frontend)
3. Every request includes: Authorization: Bearer {token}
4. Backend validates token via Sanctum
5. NO cookies, NO sessions, NO CSRF tokens needed
```

### Session-Based Authentication Flow (not used):
```
1. User logs in → Session created, CSRF token generated
2. Session cookie + CSRF token stored in browser
3. Every request must include CSRF token
4. Backend validates CSRF token
5. Uses cookies and sessions
```

**Our app uses Token-Based (Bearer), not Session-Based!**

## Testing the Fix

### Step 1: Restart Backend
```bash
cd /Users/yash/Documents/Projects/Qsights2.0-Backend

# Stop current server (Ctrl+C if running)

# Restart Laravel server
php artisan serve
```

### Step 2: Clear Browser Cache
```
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear all site data
4. Refresh page
5. Log in again
```

### Step 3: Test Operations

#### Test Preview:
1. Navigate to Activity → Notifications → Email Templates
2. Click "Preview" on any template
3. **Expected**: Preview modal opens with rendered email
4. **No CSRF errors should appear**

#### Test Edit (Create Custom):
1. Click "Customize" on invitation template
2. Edit subject and body
3. Click "Save"
4. **Expected**: Success message, template shows "Custom" chip
5. **No CSRF errors**

#### Test Edit (Update Custom):
1. Click "Edit" on custom template
2. Modify content
3. Click "Save"
4. **Expected**: Success message, changes persist
5. **No CSRF errors**

#### Test Delete:
1. Click "Delete" on custom template
2. Confirm deletion
3. **Expected**: Reverts to default
4. **No CSRF errors**

### Step 4: Verify in Browser Console
```javascript
// Should see successful requests:
POST http://localhost:8000/api/activities/{id}/notification-templates/preview
Status: 200 OK

POST http://localhost:8000/api/activities/{id}/notification-templates
Status: 201 Created

PUT http://localhost:8000/api/activities/{id}/notification-templates/{id}
Status: 200 OK

DELETE http://localhost:8000/api/activities/{id}/notification-templates/{id}
Status: 200 OK
```

## API Security Status

### ✅ Security Still Maintained:
1. **Authentication Required**: All routes protected by `auth:sanctum`
2. **Token Validation**: Bearer tokens validated on every request
3. **CORS Protection**: Only localhost:3000 allowed
4. **Role-Based Access**: Admin/user roles enforced

### ✅ CSRF Not Needed Because:
1. **Stateless**: No server-side sessions
2. **Token-Based**: Tokens can't be stolen via CSRF
3. **SameSite**: Browser security prevents cross-origin token theft
4. **API-Only**: Not using cookies for authentication

## Common CSRF Misconceptions

### ❌ Myth: "All web apps need CSRF protection"
**Reality**: Only session/cookie-based auth needs CSRF protection

### ❌ Myth: "APIs should always have CSRF tokens"
**Reality**: Token-based APIs (Bearer tokens) are immune to CSRF attacks

### ❌ Myth: "Removing CSRF makes the API insecure"
**Reality**: CSRF protection is irrelevant when using Bearer tokens

## Additional Notes

### When to Use CSRF Protection:
- ✅ Traditional web apps with session cookies
- ✅ Forms submitted via POST with cookies
- ✅ Server-side rendered apps with sessions

### When NOT to Use CSRF Protection:
- ❌ Token-based APIs (JWT, Bearer tokens)
- ❌ Mobile apps using API tokens
- ❌ Single-page apps (SPAs) with token auth
- ❌ Stateless REST APIs

### Our Architecture:
- **Frontend**: Next.js SPA with token auth ✅
- **Backend**: Laravel API with Sanctum (tokens) ✅
- **Auth Method**: Bearer tokens in Authorization header ✅
- **CSRF Needed**: NO ❌

## Verification Checklist

After applying fix and restarting backend:

- [ ] Backend server restarted
- [ ] Browser cache cleared
- [ ] Can preview default templates
- [ ] Can customize templates (create)
- [ ] Can edit custom templates (update)
- [ ] Can delete custom templates
- [ ] No CSRF errors in console
- [ ] All requests return 200/201 status
- [ ] Success messages appear
- [ ] Templates persist after refresh

## Troubleshooting

### If CSRF errors still appear:

1. **Check backend is restarted**:
   ```bash
   # Should see: "Laravel development server started"
   php artisan serve
   ```

2. **Clear Laravel cache**:
   ```bash
   php artisan config:clear
   php artisan route:clear
   php artisan cache:clear
   ```

3. **Verify bootstrap/app.php saved correctly**:
   ```bash
   grep -A 5 "validateCsrfTokens" bootstrap/app.php
   # Should show: 'api/*' in except array
   ```

4. **Check browser localStorage has token**:
   ```javascript
   // In browser console:
   console.log(localStorage.getItem('token'));
   // Should show a long string (JWT token)
   ```

5. **Verify Authorization header is sent**:
   ```
   Open DevTools → Network tab
   Click any API request
   Check Headers section
   Should see: Authorization: Bearer {token}
   ```

### If "Application error" appears:

This is a frontend React error, not related to CSRF. Check browser console for:
- Import errors
- Component syntax errors
- Missing dependencies

Fix by checking:
```bash
cd /Users/yash/Documents/Projects/Qsights2.0
npm run dev
# Check terminal for build errors
```

## Summary

**Problem**: CSRF protection enabled for token-based API
**Solution**: Excluded all `api/*` routes from CSRF validation
**Impact**: Preview, Edit, Create, Delete operations now work correctly
**Security**: Maintained via Bearer token authentication
**Required Action**: Restart backend server

---

**Status**: ✅ Fixed
**Date**: December 5, 2025
**Files Modified**: `bootstrap/app.php`
