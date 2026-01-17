# Quick Testing Guide - Notification Templates

## Prerequisites
1. ✅ Backend running: `php artisan serve` (port 8000)
2. ✅ Frontend running: `npm run dev` (port 3000)
3. ✅ Database migration executed
4. ✅ User logged in with valid token

---

## Frontend Testing (Recommended)

### Step 1: Access the Page
1. Open browser: `http://localhost:3000`
2. Log in to your account
3. Navigate to any activity
4. Click "Notifications" tab
5. Click "Email Templates" sub-tab

### Step 2: Test READ (View Templates)
**Expected Result**: 
- See 5 templates listed (all showing "Default" chip)
- Types: invitation, reminder, thank_you, program_expiry, activity_summary
- Each template has 3 buttons: Customize, Preview, (no Delete for defaults)

### Step 3: Test PREVIEW (Default Template)
1. Click "Preview" on any template
2. **Expected**: Modal opens with 3 tabs
3. Check "HTML Preview" tab:
   - See formatted email
   - Placeholders replaced with sample data
   - Subject line shows activity name
4. Check "Plain Text" tab:
   - See text-only version
5. Check "Sample Data" tab:
   - See JSON with 16 placeholder values
6. Click "Close"

### Step 4: Test CREATE (Customize Template)
1. Click "Customize" on "invitation" template
2. **Expected**: Editor modal opens
3. Change subject: `Custom Invitation: {{activity_name}}`
4. Edit body text in rich text editor
5. Click placeholder menu → Insert `{{participant_name}}`
6. Click "Save"
7. **Expected**: 
   - Success message appears
   - Template now shows "Custom" chip (blue)
   - Button changes from "Customize" to "Edit"
   - "Delete" button appears

### Step 5: Test PREVIEW (Custom Template)
1. Click "Preview" on the customized invitation template
2. **Expected**: 
   - See your custom subject with placeholder replaced
   - See your custom body content
   - Chip shows "Custom Template"
3. Click "Close"

### Step 6: Test UPDATE (Edit Custom Template)
1. Click "Edit" on the custom invitation template
2. Change subject: `UPDATED: Join {{activity_name}}`
3. Modify body content
4. Click "Save"
5. **Expected**: 
   - Success message: "Template updated successfully!"
   - Changes persist
6. Click "Preview" to verify changes

### Step 7: Test DELETE (Revert to Default)
1. Click "Delete" on the custom invitation template
2. **Expected**: Confirmation dialog appears
3. Click "OK"
4. **Expected**:
   - Success message: "Template deleted! Reverted to default."
   - Template changes back to "Default" chip
   - Button changes from "Edit" to "Customize"
   - "Delete" button disappears
5. Click "Preview" to verify it's the original default

---

## Backend API Testing (Advanced)

### Get Your Token
```javascript
// In browser console (after logging in)
console.log(localStorage.getItem('token'));
```

### Get Activity ID
```
// From URL: /activities/{activity_id}/notifications
// Or from browser: window.location.pathname.split('/')[2]
```

### Test 1: Get All Templates
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  "http://localhost:8000/api/activities/YOUR_ACTIVITY_ID/notification-templates"
```

**Success**: HTTP 200, returns array of 5 templates

### Test 2: Create Custom Template
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "invitation",
    "subject": "Test: {{activity_name}}",
    "body_html": "<h1>Hello {{participant_name}}</h1>",
    "body_text": "Hello {{participant_name}}",
    "is_active": true
  }' \
  "http://localhost:8000/api/activities/YOUR_ACTIVITY_ID/notification-templates"
```

**Success**: HTTP 201, returns created template with ID

### Test 3: Preview Template
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "invitation",
    "subject": "Join: {{activity_name}}",
    "body_html": "<h1>Hi {{participant_name}}</h1>",
    "body_text": "Hi {{participant_name}}"
  }' \
  "http://localhost:8000/api/activities/YOUR_ACTIVITY_ID/notification-templates/preview"
```

**Success**: HTTP 200, returns preview with placeholders replaced

### Test 4: Delete Custom Template
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/activities/YOUR_ACTIVITY_ID/notification-templates/TEMPLATE_ID"
```

**Success**: HTTP 200, message confirms deletion

---

## Automated Testing

### Run Full CRUD Test
```bash
cd /Users/yash/Documents/Projects/Qsights2.0-Backend

# Set environment variables
export TOKEN="your_bearer_token_here"
export ACTIVITY_ID="your_activity_uuid_here"

# Run test script
bash test_template_crud.sh
```

**Expected Output**:
```
================================================
Testing Notification Template CRUD Operations
================================================

ℹ Test 1: READ - Get all templates
✓ GET all templates: HTTP 200
ℹ Found 5 templates

ℹ Test 2: CREATE - Customize invitation template
✓ CREATE template: HTTP 201
ℹ Created template ID: xxx-xxx-xxx

ℹ Test 3: READ - Get custom invitation template
✓ GET custom template: HTTP 200
ℹ Subject: CUSTOM TEST: Join {{activity_name}}

ℹ Test 4: UPDATE - Update custom template
✓ UPDATE template: HTTP 200
ℹ Updated subject: UPDATED TEST: Join {{activity_name}} Now!

ℹ Test 5: PREVIEW - Preview custom template
✓ PREVIEW template: HTTP 200
ℹ Preview subject: UPDATED TEST: Join Sample Activity
ℹ Placeholders replaced successfully

ℹ Test 6: DELETE - Delete custom template
✓ DELETE template: HTTP 200
ℹ Template deleted, reverted to default

ℹ Test 7: READ - Verify template reverted to default
✓ GET default template: HTTP 200
ℹ Subject: You're Invited: {{activity_name}}
ℹ Is default: true
✓ Template successfully reverted to default

================================================
✓ All CRUD operations completed successfully!
================================================
```

---

## Common Test Scenarios

### Scenario 1: Customize All Templates
1. Customize invitation template → Save
2. Customize reminder template → Save
3. Customize thank_you template → Save
4. Customize program_expiry template → Save
5. Customize activity_summary template → Save
6. **Expected**: All 5 show "Custom" chip

### Scenario 2: Preview All Types
1. Preview invitation (default or custom)
2. Preview reminder (default or custom)
3. Preview thank_you (default or custom)
4. Preview program_expiry (default or custom)
5. Preview activity_summary (default or custom)
6. **Expected**: Each preview shows correct type with sample data

### Scenario 3: Mixed Custom/Default
1. Customize invitation and reminder
2. Leave others as default
3. **Expected**: 
   - invitation: Custom chip, Edit + Delete buttons
   - reminder: Custom chip, Edit + Delete buttons
   - thank_you: Default chip, Customize button only
   - program_expiry: Default chip, Customize button only
   - activity_summary: Default chip, Customize button only

### Scenario 4: Edit Multiple Times
1. Customize invitation → Save
2. Edit invitation → Change subject → Save
3. Edit invitation → Change body → Save
4. Edit invitation → Add more placeholders → Save
5. **Expected**: Each edit persists correctly

### Scenario 5: Delete and Re-customize
1. Customize invitation → Save
2. Delete custom invitation (reverts to default)
3. Customize invitation again (different content)
4. **Expected**: 
   - After delete: Shows default template
   - After re-customize: Shows new custom template

---

## Verification Checklist

### ✅ Basic CRUD
- [ ] Can view all 5 templates (defaults initially)
- [ ] Can customize a template
- [ ] Can edit custom template
- [ ] Can delete custom template
- [ ] Can preview any template

### ✅ UI Behavior
- [ ] Custom templates show "Custom" chip (blue)
- [ ] Default templates show "Default" chip (gray)
- [ ] Custom templates have Edit + Delete buttons
- [ ] Default templates have Customize button only
- [ ] Success/error alerts appear and auto-dismiss

### ✅ Preview Functionality
- [ ] Preview modal opens correctly
- [ ] HTML preview renders in iframe
- [ ] Plain text shows correctly
- [ ] Sample data displays all 16 placeholders
- [ ] Placeholders are replaced with sample values
- [ ] Can refresh preview

### ✅ Editor Functionality
- [ ] Rich text editor loads correctly
- [ ] Can format text (bold, italic, headers, etc.)
- [ ] Placeholder menu shows all 16 placeholders
- [ ] Can insert placeholders by clicking menu
- [ ] Subject field validates (required)
- [ ] Body field validates (required)
- [ ] Save button works
- [ ] Cancel button closes without saving

### ✅ Data Persistence
- [ ] Custom templates persist after page refresh
- [ ] Edits to custom templates persist
- [ ] Deleted templates revert to default permanently
- [ ] Multiple activities have independent templates

### ✅ Error Handling
- [ ] Invalid token shows error
- [ ] Network errors show meaningful message
- [ ] Validation errors show in editor
- [ ] Preview errors show details

---

## Expected Results Summary

| Operation | Initial State | Action | Final State |
|-----------|--------------|--------|-------------|
| **View** | Default | None | See 5 defaults |
| **Customize** | Default | Edit + Save | Custom (new ID) |
| **Edit** | Custom | Modify + Save | Custom (same ID, updated) |
| **Preview** | Any | Click Preview | Modal with rendered email |
| **Delete** | Custom | Confirm Delete | Default (custom removed) |
| **Re-customize** | Default (after delete) | Edit + Save | Custom (new ID) |

---

## Troubleshooting Test Failures

### Templates not loading
- Check network tab: Is API responding?
- Check console: Any JavaScript errors?
- Verify token in localStorage
- Ensure backend is running on port 8000

### Preview shows error
- Check console for detailed error message
- Verify activity exists in database
- Check backend logs: `tail -f storage/logs/laravel.log`
- Ensure template data is valid

### Save doesn't work
- Check network tab: What's the response?
- Verify token is valid (not expired)
- Check validation: Subject and body required
- Look for error alert on UI

### Delete doesn't revert to default
- Check if template was truly deleted
- Refresh page to reload templates
- Check backend: Is default template logic working?

---

## Quick Debug Commands

### Check if backend is running
```bash
curl http://localhost:8000/api/health
```

### Check if authenticated
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/user
```

### Check activity exists
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/activities/YOUR_ACTIVITY_ID
```

### Check database
```bash
# Connect to PostgreSQL
psql -U your_username -d qsights

# Check templates
SELECT id, activity_id, notification_type, subject, is_active 
FROM notification_templates;

# Check for specific activity
SELECT * FROM notification_templates 
WHERE activity_id = 'YOUR_ACTIVITY_ID';
```

---

## Test Results Template

```
NOTIFICATION TEMPLATE TESTING REPORT
=====================================
Date: _____________
Tester: ___________

Frontend Tests:
[ ] View all templates (5 defaults)
[ ] Customize template (create custom)
[ ] Edit custom template (update)
[ ] Delete custom template (revert)
[ ] Preview default template
[ ] Preview custom template
[ ] Placeholder insertion works
[ ] Rich text editor functions

Backend Tests:
[ ] GET all templates
[ ] POST create template
[ ] PUT update template
[ ] DELETE template
[ ] POST preview template
[ ] Placeholders replaced correctly

Issues Found:
_______________________________________
_______________________________________
_______________________________________

Overall Status: [ ] Pass  [ ] Fail
Notes:
_______________________________________
_______________________________________
```

---

**Ready to Test!** 🚀

Start with Frontend Testing for easiest verification.
Use Automated Script for comprehensive backend validation.
Check this guide if anything doesn't work as expected.
