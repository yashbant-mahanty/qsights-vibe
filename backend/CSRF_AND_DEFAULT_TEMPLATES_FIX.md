# CSRF & Default Templates Fix - December 5, 2025

## Issues Fixed

### 1. CSRF Token Mismatch (419 Error)
**Problem:** POST requests failing with 419 (CSRF token mismatch)

**Root Cause:** Laravel's Sanctum requires CSRF cookie for SPA authentication

**Solution:**
- Added `getCsrfCookie()` function to fetch CSRF cookie before state-changing requests
- Added `credentials: 'include'` to all fetch requests
- Added `X-Requested-With: 'XMLHttpRequest'` header

### 2. Default Templates Not Showing
**Problem:** Empty list on first load, requiring "Create All Defaults" button click

**Root Cause:** Backend `index()` method only returned custom templates

**Solution:**
- Modified backend `NotificationTemplateController::index()` to return ALL templates (custom + default)
- For each notification type, return custom template if exists, otherwise return default
- Frontend now shows all 5 templates immediately with correct status chips

## Changes Made

### Backend Changes

#### File: `app/Http/Controllers/Api/NotificationTemplateController.php`

**Method: `index()`**
- Changed from returning only custom templates to returning ALL templates
- For each notification type (invitation, reminder, thank_you, program_expiry, activity_summary):
  * If custom template exists → return it with `id` and no `is_default` flag
  * If no custom template → return default template with `id: null` and `is_default: true`
- Response now includes complete list of 5 templates always

### Frontend Changes

#### File: `src/components/notifications/NotificationTemplateManager.jsx`

**Changes:**
1. Added `BASE_URL` constant for CSRF endpoint
2. Added `getCsrfCookie()` function:
   ```javascript
   const getCsrfCookie = async () => {
     await fetch(`${BASE_URL}/sanctum/csrf-cookie`, {
       credentials: 'include',
     });
   };
   ```
3. Updated `fetchWithAuth()`:
   - Calls `getCsrfCookie()` before POST/PUT/DELETE requests
   - Added `credentials: 'include'` to fetch options
   - Added `X-Requested-With: 'XMLHttpRequest'` header
4. Updated template detection:
   - Changed from checking array length to checking `is_default` flag
   - `isCustomTemplate()` now checks: `template.id && !template.is_default`
5. Removed "Create All Defaults" button (no longer needed)

#### File: `src/components/notifications/NotificationTemplatePreview.jsx`

**Changes:**
1. Added `BASE_URL` constant
2. Added `getCsrfCookie()` function
3. Updated `fetchWithAuth()` with CSRF handling
4. Added `credentials: 'include'` to all requests

## Technical Details

### CSRF Flow
```
1. User clicks Edit/Preview/Delete
2. Frontend calls getCsrfCookie()
3. GET /sanctum/csrf-cookie (returns XSRF-TOKEN cookie)
4. Frontend makes POST/PUT/DELETE with:
   - Authorization: Bearer {token}
   - X-Requested-With: XMLHttpRequest
   - Credentials: include (sends cookies)
5. Laravel validates CSRF token from cookie
6. Request succeeds ✅
```

### Default Templates Flow
```
1. Component loads
2. GET /api/activities/{id}/notification-templates
3. Backend checks for each type:
   - Custom exists? → Return custom template
   - No custom? → Return default template with is_default flag
4. Frontend receives 5 templates always
5. Shows correct Custom/Default chip based on is_default flag
6. User can customize any default template ✅
```

## Template Structure

### Custom Template (from database):
```json
{
  "id": "uuid",
  "activity_id": "activity-uuid",
  "notification_type": "invitation",
  "subject": "Custom subject",
  "body_html": "<html>...</html>",
  "body_text": "Plain text...",
  "is_active": true
}
```

### Default Template (generated):
```json
{
  "id": null,
  "activity_id": "activity-uuid",
  "notification_type": "invitation",
  "subject": "You're Invited to {{activity_name}}",
  "body_html": "<html>Default template...</html>",
  "body_text": "Plain text version...",
  "is_active": true,
  "is_default": true,
  "placeholders": {...}
}
```

## User Experience Improvements

### Before:
- ❌ Empty list on first visit
- ❌ Required clicking "Create All Defaults" button
- ❌ 419 errors on any save/delete action
- ❌ Confusing UX

### After:
- ✅ All 5 templates show immediately
- ✅ Clear Custom/Default status chips
- ✅ No CSRF errors
- ✅ Can customize any template directly
- ✅ Delete reverts to default (not empty)
- ✅ Intuitive workflow

## Testing Checklist

- [x] Navigate to Activity → Notifications → Email Templates
- [x] Verify 5 templates show with "Default" chip
- [x] Click "Customize" on Invitation template
- [x] Modify subject and body
- [x] Click "Save Template" → Should succeed without 419 error
- [x] Verify template now shows "Custom" chip
- [x] Click "Preview" → Should show rendered template
- [x] Click "Delete" → Should revert to "Default" chip
- [x] Repeat for all 5 notification types

## Files Modified

1. `/Users/yash/Documents/Projects/Qsights2.0-Backend/app/Http/Controllers/Api/NotificationTemplateController.php`
   - Modified `index()` method (lines 14-48)

2. `/Users/yash/Documents/Projects/Qsights2.0/src/components/notifications/NotificationTemplateManager.jsx`
   - Added CSRF handling
   - Updated template detection logic
   - Removed "Create All Defaults" button

3. `/Users/yash/Documents/Projects/Qsights2.0/src/components/notifications/NotificationTemplatePreview.jsx`
   - Added CSRF handling

## Status: ✅ FIXED

Both issues resolved:
1. ✅ CSRF token mismatch fixed (419 errors gone)
2. ✅ Default templates show immediately (no empty list)

---
*Fixed: December 5, 2025 at 16:15*
