# Subordinates Count Display Bug Fix

**Date:** February 1, 2025  
**Status:** ✅ FIXED AND DEPLOYED

## Issue Description

In the Staff Evaluation System under "My Evaluation Tasks", the "Subordinates to Evaluate" column was displaying incorrect count:
- **Displayed:** "1 staff member(s)"
- **Expected:** "2 staff member(s)"
- **Staff:** Yashbant Mahanty (yashbant.mahanty.staff@bioquestglobal.com)
- **Actual Subordinates:** 2 (Ashwin TK and Jayalakshmi T)

## Root Cause

**File:** `/frontend/app/evaluation-new/page.tsx` (Line 844)

The frontend code was hardcoding `subordinates_count` to 1 when transforming the API response:

```tsx
// INCORRECT CODE (Line 844)
const tasks = tasksResponse.data.map((task: any) => ({
  id: task.triggered_id,
  template_name: task.event_name,
  evaluator_name: task.evaluator_name,
  subordinates_count: 1,  // ❌ Hardcoded to 1
  status: task.status,
  // ... other fields
}));
```

Despite the backend API correctly returning:
```json
{
  "subordinates_count": 2,
  "subordinates": [
    {"id": "11dcf9cd-2a47-46e2-9688-0d67ce5a2a8f", "name": "Ashwin TK"},
    {"id": "66f7d078-3774-4175-bcfb-abb2dad99595", "name": "Jayalakshmi T"}
  ]
}
```

## Solution

Updated the code to use the actual `subordinates_count` value from the API response:

```tsx
// FIXED CODE (Line 844)
const tasks = tasksResponse.data.map((task: any) => ({
  id: task.triggered_id,
  template_name: task.event_name,
  evaluator_name: task.evaluator_name,
  subordinates_count: task.subordinates_count || 1,  // ✅ Use API value with fallback
  status: task.status,
  // ... other fields
}));
```

## Files Changed

### Frontend
- **File:** `/frontend/app/evaluation-new/page.tsx`
- **Line:** 844
- **Change:** `subordinates_count: 1` → `subordinates_count: task.subordinates_count || 1`

## Backend Verification

Verified that the backend endpoint `/my-evaluations/pending` correctly calculates subordinates count:

**File:** `/backend/app/Http/Controllers/Api/EvaluationTakeController.php`
**Method:** `getMyPendingEvaluations` (Line 195-269)

```php
// Decode subordinates JSON
$subordinates = json_decode($triggered->subordinates, true) ?? [];

// Count total subordinates
$totalSubordinates = count($subordinates);

// Return in response
return [
    'subordinates_count' => $totalSubordinates,  // ✅ Correctly calculated
    'subordinates' => $subordinates,
    // ... other fields
];
```

## Test Data

### Staff Member Details
- **Name:** Yashbant Mahanty
- **ID:** 3e7ee66d-934f-481a-a7c3-41012888241f
- **Email:** yashbant.mahanty.staff@bioquestglobal.com
- **Role:** AGH
- **Program:** BQ-Evaluation (a0f94ecb-77c7-49c9-8494-a079cce90c85)

### Subordinates
1. **Ashwin TK**
   - ID: 11dcf9cd-2a47-46e2-9688-0d67ce5a2a8f
   - Email: ashwin.tk@bioquestglobal.com
   - Role: Manager/Leads

2. **Jayalakshmi T**
   - ID: 66f7d078-3774-4175-bcfb-abb2dad99595
   - Email: jayalakshmi.t@bioquestglobal.com
   - Role: Manager/Leads

### Triggered Evaluation
- **ID:** 654e38c2-3d9a-4792-a1e8-4f223f749cac
- **Event:** Competency Rating
- **Description:** "Evaluate 2 team member(s)"
- **Status:** pending

## Deployment Details

### Build
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
npm run build
```
- **Status:** ✅ SUCCESS
- **Build Time:** ~2 minutes
- **Build ID:** Generated successfully

### Deployment
```bash
# Copy .next build to server
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    -r .next ubuntu@13.126.210.220:/var/www/frontend/

# Restart frontend service
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    ubuntu@13.126.210.220 "pm2 restart qsights-frontend"
```
- **Status:** ✅ SUCCESS
- **Process:** qsights-frontend (PM2)
- **PID:** 1986647

## Testing Steps

1. ✅ Log in as staff member: yashbant.mahanty.staff@bioquestglobal.com
2. ✅ Navigate to "Evaluation System" → "My Evaluation Tasks"
3. ✅ Verify "Subordinates to Evaluate" column shows "2 staff member(s)"
4. ✅ Open browser console and verify API response has `subordinates_count: 2`
5. ✅ Verify subordinates array contains both Ashwin TK and Jayalakshmi T

## Expected Behavior After Fix

### Before Fix
- Display: "1 staff member(s)" ❌
- API Response: `subordinates_count: 2` ✅
- Issue: Frontend ignoring API data

### After Fix
- Display: "2 staff member(s)" ✅
- API Response: `subordinates_count: 2` ✅
- Issue: RESOLVED ✅

## Impact

- **Affected Users:** All staff members with multiple subordinates to evaluate
- **Severity:** Medium (display bug, data integrity intact)
- **Data Loss:** None (backend data always correct)
- **User Experience:** Improved - accurate count now displayed

## Related Issues

This fix is part of the Evaluation System improvements:
1. ✅ Trigger permission fix (evaluation-admin access)
2. ✅ Program-based questionnaire filtering
3. ✅ **Subordinates count display bug** (THIS FIX)

## Notes

- The backend was always calculating and returning correct values
- The bug was purely in frontend data transformation
- Console logs showed API returning correct data but UI displaying wrong value
- Fix includes fallback value `|| 1` for safety in edge cases where API might return null/undefined

## Verification Commands

```bash
# Check frontend service status
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    ubuntu@13.126.210.220 "pm2 status qsights-frontend"

# View frontend logs
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    ubuntu@13.126.210.220 "pm2 logs qsights-frontend --lines 50"

# Test API endpoint directly
curl -X GET https://qsights.in/api/my-evaluations/pending \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Commit Message

```
fix(evaluation): Display correct subordinates count in My Evaluation Tasks

Fixed hardcoded subordinates_count value (1) in frontend data transformation.
Now uses actual count from API response (task.subordinates_count).

- Updated: frontend/app/evaluation-new/page.tsx line 844
- Changes: subordinates_count: 1 -> subordinates_count: task.subordinates_count || 1
- Impact: Staff members now see accurate subordinate count
- Test Case: Yashbant Mahanty with 2 subordinates now displays "2 staff member(s)"

Backend API was always correct - this was a frontend display bug only.
```
