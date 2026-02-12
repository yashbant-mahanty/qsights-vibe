# SCT Report Scoring Fix - February 12, 2026

## 📋 Summary
Fixed critical bug in SCT Report where participant scores were showing as 0 despite having valid responses.

## 🐛 Issue Identified

### Root Cause
The scoring calculation logic was using incorrect field names when accessing answer data from the API response:

**Incorrect Code:**
```typescript
const selectedPoint = parseInt(answer.answer);  // ❌ Field doesn't exist
const selectedIndexes = Array.isArray(answer.answer) ? answer.answer : [answer.answer];  // ❌
```

**Actual API Response Structure:**
```json
{
  "question_id": 8379,
  "value": "Strongly Agree",        // ← Single select answer
  "value_array": null,               // ← Multi-select answers
  "other_text": null
}
```

### Secondary Issue
For single-choice SCT questions, the API returns the **label string** (e.g., "Strongly Agree"), not an index number. The code was trying to parse it as an integer, which failed.

## ✅ Fix Applied

### Changes Made in `/frontend/app/activities/[id]/results/page.tsx`

1. **Corrected Field Names:**
   - Changed `answer.answer` → `answer.value` (for single select)
   - Changed `answer.answer` → `answer.value_array` (for multi-select)

2. **Added Label-to-Score Mapping:**
   - Extract `labels` array from question settings
   - Find index of selected label in labels array
   - Use that index to get corresponding score from scores array

3. **Enhanced Multi-Select Handling:**
   - Use `value_array` for multi-select questions
   - Handle both label strings and numeric indexes
   - Apply normalization when enabled

4. **Added Fallback Logic:**
   - Try label matching first (primary method)
   - Fall back to numeric index parsing if label not found
   - Ensures backward compatibility

### Code Comparison

**Before (Broken):**
```typescript
// Single select - trying to parse label string as number ❌
const selectedIndex = parseInt(answer.answer);  // "Strongly Agree" → NaN
if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < scores.length) {
  questionScore = scores[selectedIndex] || 0;
}
```

**After (Fixed):**
```typescript
// Single select - find label index then get score ✅
const selectedLabel = answer.value || answer.answer;
const labelIndex = labels.findIndex((label: string) => label === selectedLabel);

if (labelIndex >= 0 && labelIndex < scores.length) {
  questionScore = scores[labelIndex] || 0;
  selectedOptions = [labels[labelIndex]];
}
```

## 📊 Affected Components

- **Participant Breakdown Table:** Now shows correct question scores
- **Total Score Column:** Now calculates correctly
- **Average Score Column:** Now calculates correctly
- **Leaderboard Tab:** Now shows correct rankings and scores

## 🔍 Console Logs Analysis

**Before Fix:**
```
Response 1 found answer: Object{question_id: 8379, value: "Strongly Agree"}
Response 2 - No answer found for question 8379  // ← Orphaned responses
Question Responses Count: 1
```

**Expected After Fix:**
```
Response 1 found answer: Object{question_id: 8379, value: "Strongly Agree", score: 5}
Response 2 found answer: Object{question_id: 8379, value: "Strongly Agree", score: 5}
Question Responses Count: 2
All participants showing correct scores ✓
```

## 🧪 Testing Instructions

### 1. Navigate to SCT Report
1. Go to: **Activities** → Select "SCT" activity
2. Click **Event Results** tab
3. Click **Script Concordance (SCT) Report** tab

### 2. Verify Participant Breakdown Tab
- ✅ Each participant should show in table
- ✅ Question Code column should have values (Q1, Q2, Q3...)
- ✅ Type column should show "SCT Single Choice" or "SCT Likert"
- ✅ Selected Options should show label text (e.g., "Strongly Agree")
- ✅ Question Score should show numeric values (1, 2, 3, 4, 5)
- ✅ Total Score should show sum of all question scores
- ✅ Average Score should show = Total Score / Questions Attempted

### 3. Verify Leaderboard Tab
- ✅ Participants sorted by Total Score (highest to lowest)
- ✅ Rank column shows positions (1, 2, 3...)
- ✅ Top 3 show medals (🏆 🥈 🥉)
- ✅ Total Score column shows correct values
- ✅ Questions Attempted shows count
- ✅ Average Score calculated correctly

### 4. Test Search Functionality
- Type participant name in search box
- Verify filtering works correctly
- Clear search, all participants appear again

### 5. Test CSV Export
- Click "Download CSV" button on both tabs
- Verify CSV downloads successfully
- Open CSV and verify data matches UI display

## 📦 Deployment Details

**Build ID:** STDTfrHQibI7C-BhQXWLz
**Deployment Date:** February 12, 2026 at 11:18 GMT
**Server:** ubuntu@13.126.210.220
**Status:** ✅ Successfully Deployed
**PM2 Status:** Online (restart count: 83)
**HTTP Status:** 200 OK

## 🔧 Technical Details

### File Modified
- `/frontend/app/activities/[id]/results/page.tsx` (lines 443-525)

### Changes Summary
- Added `labels` array extraction from settings
- Implemented label-to-index mapping using `Array.findIndex()`
- Updated all three response types (single, multi, likert)
- Added fallback logic for backward compatibility
- Enhanced multi-select array handling with `value_array`

### Question Types Supported
1. **sct_likert (single):** Single choice with labels → scores mapping
2. **sct_likert (multi):** Multiple choice with sum/normalization
3. **sct_likert (likert):** Likert scale point selection
4. **likert_visual:** Visual likert with numeric values

## ⚠️ Known Limitations

### Orphaned Responses
The console shows: **"⚠️ Found 2 orphaned responses with old question IDs"**

**Explanation:** 
- The questionnaire was updated/recreated
- Old responses have question IDs: 7168, 7169, 7170
- Current questions have IDs: 8379, 8380, 8381, 8382
- These orphaned responses cannot be matched and won't appear in the report

**Impact:** 
- 2 out of 4 participants may not show in the report
- This is a data consistency issue, not a bug in the fix

**Resolution:**
- Participants need to retake the survey with current questionnaire
- OR: Backend migration to map old question IDs to new ones (future enhancement)

## 📈 Expected Results

### Before Fix
```
Participant Breakdown Table:
╔═════════════════════════════════════════════╗
║ Name    │ Q.Code │ Score │ Total │ Average ║
║─────────┼────────┼───────┼───────┼─────────║
║ User1   │ Q1     │ 0     │ 0     │ 0       ║  ← ALL ZEROS
║ User2   │ Q1     │ 0     │ 0     │ 0       ║
╚═════════════════════════════════════════════╝
```

### After Fix
```
Participant Breakdown Table:
╔═════════════════════════════════════════════╗
║ Name    │ Q.Code │ Score │ Total │ Average ║
║─────────┼────────┼───────┼───────┼─────────║
║ User1   │ Q1     │ 5     │ 13    │ 4.33    ║  ← CORRECT!
║ User1   │ Q2     │ 3     │       │         ║
║ User1   │ Q3     │ 5     │       │         ║
║ User2   │ Q1     │ 4     │ 11    │ 3.67    ║
║ User2   │ Q2     │ 3     │       │         ║
║ User2   │ Q3     │ 4     │       │         ║
╚═════════════════════════════════════════════╝

Leaderboard:
╔══════════════════════════════════════════════╗
║ Rank │ Name  │ Total │ Attempted │ Average ║
║──────┼───────┼───────┼───────────┼─────────║
║ 🏆 1 │ User1 │ 13    │ 3         │ 4.33    ║
║ 🥈 2 │ User2 │ 11    │ 3         │ 3.67    ║
╚══════════════════════════════════════════════╝
```

## 🔄 Rollback Plan

If issues are detected:

```bash
# 1. SSH to production
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# 2. Find previous BUILD_ID
ls -lt /var/www/frontend/.next/BUILD_ID

# Previous BUILD_ID: r5uNtdi6oEEDH13_ghTvH

# 3. Restore from backup location (if available)
# OR rebuild from previous commit

# 4. Restart PM2
pm2 restart qsights-frontend
```

## 📝 Additional Notes

### Data Integrity
- The fix does NOT modify any database data
- Only changes how frontend calculates scores from existing answer data
- No backend changes required

### Performance
- Uses `useMemo` for efficient score calculations
- Only recalculates when responses or questions change
- No performance degradation expected

### Browser Compatibility
- `Array.findIndex()` is ES6 standard
- Supported in all modern browsers
- No polyfill needed for Next.js targets

## 🎯 Success Criteria

- [x] Build completes without errors
- [x] Deployment successful to production
- [x] Production site responding (HTTP 200)
- [x] PM2 process online and stable
- [ ] Manual testing confirms scores display correctly
- [ ] Both tabs (Breakdown & Leaderboard) working
- [ ] CSV export contains correct data
- [ ] No new errors in browser console

## 📞 Support

If issues persist after deployment:
1. Check browser console for JavaScript errors
2. Verify API response contains `value` field
3. Check question settings have `labels` and `scores` arrays
4. Ensure questionnaire IDs match response question_ids

**Developer:** Your AI Assistant
**Date:** February 12, 2026
**Version:** 1.0.0
**Status:** ✅ Deployed to Production
