# Quick Test Guide - Subordinate Selection Feature

## 🎯 What to Test

### Test 1: Basic Subordinate Selection
1. Login as Evaluation Admin
2. Go to **Evaluation System → Trigger** tab
3. Select any evaluation form
4. Filter by a department (e.g., "Engineering")
5. **Check** one evaluator
   - ✅ Subordinates list should **expand automatically**
   - ✅ All subordinates should be **checked by default**
   - ✅ Should show "Select All / Deselect All" button

### Test 2: Deselect/Select All
1. Click **"Deselect All"** button
   - ✅ All subordinates should become unchecked
   - ✅ Should show warning: "⚠️ No subordinates selected"
2. Click **"Select All"** button
   - ✅ All subordinates should become checked
   - ✅ Warning should disappear

### Test 3: Individual Selection
1. Manually **uncheck** 2-3 subordinates
2. Leave others checked
3. Check the summary at bottom:
   - ✅ Should show: "1 evaluator(s) selected • X subordinate(s) to evaluate"
   - ✅ X should match the number of checked subordinates

### Test 4: Multiple Evaluators
1. Select **2-3 evaluators**
2. For first evaluator:
   - Deselect 2 subordinates
3. For second evaluator:
   - Keep all selected
4. For third evaluator:
   - Deselect all subordinates
5. Check summary:
   - ✅ Total subordinates = (first eval subs) + (second eval subs) + 0
   - ✅ Third evaluator should show warning

### Test 5: Validation
1. Select evaluators but deselect ALL subordinates for all of them
2. Click **"Trigger Evaluation"**
   - ✅ Should show error: "Please select at least one subordinate for evaluation"
   - ✅ Should NOT open the confirmation modal

### Test 6: Successful Trigger
1. Select 1 evaluator
2. Select 2-3 subordinates only
3. Click "Trigger Evaluation"
4. Confirm and trigger
5. Go to **History** tab
6. Check the triggered evaluation:
   - ✅ Should show correct subordinate count
7. **Check evaluator's email**
   - ✅ Should list only the selected subordinates

### Test 7: Department Filter Reset
1. Select evaluator and some subordinates
2. Change department filter
   - ✅ Evaluator selection should reset
   - ✅ Subordinate selections should reset

## 🔍 Visual Checkpoints

### When Evaluator is NOT Selected:
```
☐ John Doe (Manager)
   Engineering • Senior Manager
   5 subordinates
```

### When Evaluator IS Selected:
```
☑ John Doe (Manager)
   Engineering • Senior Manager
   5 subordinates
   
   Select Subordinates to Evaluate:        [Deselect All]
   ☑ Alice Smith
      Software Engineer
   ☑ Bob Johnson  
      Software Engineer
   ☑ Carol Williams
      Senior Developer
   ☐ David Brown  ← unchecked
      Junior Developer
   ☑ Eve Davis
      Tech Lead
```

### Summary Section:
```
Ready to send?
Performance Review • 1 evaluator(s) selected • 4 subordinate(s) to evaluate
[Trigger Evaluation]
```

## ⚠️ Error Scenarios

### Scenario 1: No Subordinates Selected
**Action:** All evaluators have zero subordinates checked
**Expected:** Error toast - "Please select at least one subordinate for evaluation"

### Scenario 2: No Evaluators Selected
**Action:** Click trigger without selecting evaluators
**Expected:** Error toast - "Please select at least one evaluator"

### Scenario 3: No Form Selected
**Action:** Click trigger without selecting form
**Expected:** Error toast - "Please select an evaluation form"

## 📧 Backend Verification

After triggering, check database:

### Check Triggered Record
```sql
SELECT 
  id,
  evaluator_name,
  subordinates_count,
  subordinates
FROM evaluation_triggered
ORDER BY triggered_at DESC
LIMIT 1;
```

**Expected:**
- `subordinates_count` = number of selected subordinates
- `subordinates` JSON contains ONLY selected subordinates

### Check Email Log
```sql
SELECT 
  evaluator_email,
  email_sent_at,
  email_subject
FROM evaluation_triggered
WHERE email_sent_at IS NOT NULL
ORDER BY email_sent_at DESC
LIMIT 1;
```

**Expected:**
- Email sent successfully
- Subject matches configured subject

## ✅ Success Criteria

- [ ] Subordinate list appears when evaluator selected
- [ ] All subordinates checked by default
- [ ] Select All / Deselect All works correctly
- [ ] Individual checkbox selection works
- [ ] Summary shows correct counts
- [ ] Validation prevents empty subordinate selections
- [ ] Triggered evaluation stores only selected subordinates
- [ ] Email contains only selected subordinates
- [ ] Evaluator sees only selected subordinates in form
- [ ] Department filter resets selections

## 🐛 Common Issues

### Issue: Subordinates don't appear
- **Check:** Is evaluator checkbox checked?
- **Fix:** Check the evaluator first

### Issue: Cannot trigger
- **Check:** Are any subordinates selected?
- **Fix:** Select at least one subordinate for any evaluator

### Issue: Wrong count in summary
- **Check:** Browser console for errors
- **Fix:** Refresh page and try again

---

**Test Date:** _____________  
**Tested By:** _____________  
**Result:** ☐ Pass  ☐ Fail  
**Notes:** _______________________________________________
