# ⚠️ CRITICAL NOTE: Notification Display in Multiple Locations

## Issue Identified: January 18, 2026

When displaying notification logs/tracking data, there are **TWO SEPARATE FILES** that show notifications:

### 1. Reports & Analytics Page (GLOBAL VIEW)
**File:** `frontend/app/analytics/page.tsx`
- **Tab:** "Notifications" 
- **Shows:** All notifications across all activities
- **Table Columns:**
  - Participant (name + email)
  - **Activity** (activity_name + activity_id)
  - Status
  - Sent At
  - Delivered At
  - Opened At
  - Clicks

### 2. Event Results Page (PER-ACTIVITY VIEW)
**File:** `frontend/app/activities/[id]/results/page.tsx`
- **Tab:** "Notifications"
- **Shows:** Notifications for ONE specific activity
- **Table Columns:**
  - Participant (name)
  - Email
  - Type
  - Status
  - Sent At
  - Delivered At
  - Opened At

### 3. Notification Logs Page (STANDALONE)
**File:** `frontend/app/activities/[id]/notification-logs/page.tsx`
- **Shows:** Individual notification logs for an activity
- **This is the latest/newest implementation**

---

## The Fix Applied

### Backend Change (DONE ✅)
- **File:** `backend/app/Http/Controllers/Api/ActivityController.php`
- **Change:** Added `program_name` field to activity API response
- Line 191: `$activity->program_name = $activity->program ? $activity->program->name : null;`

### Frontend Changes Required (INCOMPLETE ❌)

#### ✅ FIXED: Reports & Analytics - Event Summary Table
- **File:** `frontend/app/analytics/page.tsx` (Line 865)
- **Changed:** Display `program_name` instead of `program_id`

#### ❌ MISSED: Reports & Analytics - Notifications Tab
- **File:** `frontend/app/analytics/page.tsx` (Line 1202-1204)
- **Current:** Shows `activity_name` and `activity_id` 
- **Missing:** Program column showing program_id or program_name
- **Action Needed:** Check if notification data includes program info

#### ❌ MISSED: Event Results - Notifications Tab  
- **File:** `frontend/app/activities/[id]/results/page.tsx` 
- **Current:** Shows participant, email, type, status, timestamps
- **Missing:** No activity or program columns (makes sense since it's activity-specific)
- **Action Needed:** Consider if program_name should be shown in header

---

## Data Flow

1. **Backend API:** `/api/notifications/reports/${activityId}` or `/api/notifications/logs`
2. **Returns:** Notification logs with:
   - `activity_id`
   - `activity_name`
   - `participant_id`
   - `participant_name`
   - `participant_email`
   - Status fields (sent_at, delivered_at, opened_at, etc.)
3. **CHECK:** Does it include `program_id` or `program_name`? ← **THIS NEEDS VERIFICATION**

---

## Action Items

- [ ] Check notification API response structure
- [ ] Verify if `program_name` is included in notification data
- [ ] Update Reports & Analytics Notifications tab if program data available
- [ ] Consider adding program name to Event Results header/breadcrumb
- [ ] Test both pages after changes
- [ ] Deploy to production

---

## Prevention Strategy

**Before any "display program name" task:**
1. Search for ALL files containing "program_id"
2. Check Reports & Analytics page (all tabs)
3. Check Event Results page (all tabs)  
4. Check any standalone logs/reports pages
5. Verify data source includes program information
6. Update ALL locations simultaneously
