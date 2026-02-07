# Subordinate Selection Enhancement - Evaluation System

## Date: February 6, 2026

## Overview
Enhanced the evaluation trigger process to allow admins to selectively choose which subordinates each evaluator should rate, rather than automatically including all subordinates in the hierarchy.

---

## ✨ New Features

### 1. **Subordinate Selection UI**
- When an evaluator is selected, their subordinates list expands automatically
- All subordinates are **selected by default**
- Admin can individually select/deselect subordinates
- "Select All" / "Deselect All" toggle for quick management

### 2. **Visual Indicators**
- Selected evaluators show in blue with expanded subordinate list
- Each subordinate has a checkbox for easy selection
- Warning message appears if no subordinates are selected for an evaluator
- Summary shows total number of subordinates to be evaluated

### 3. **Smart Validation**
- System validates at least one subordinate is selected before triggering
- Cannot trigger evaluation for evaluators with zero subordinates selected
- Clear error messages guide the admin

---

## 🎯 Use Cases

### Use Case 1: Partial Team Evaluation
**Scenario:** Manager has 10 subordinates but only 5 need evaluation this quarter.

**Solution:** 
1. Select the manager as evaluator
2. Deselect the 5 subordinates who don't need evaluation
3. Trigger evaluation - manager only sees the 5 selected subordinates

### Use Case 2: New Joiners Exclusion
**Scenario:** Some team members joined recently and shouldn't be evaluated yet.

**Solution:**
1. Select evaluator
2. Deselect new joiners from subordinates list
3. Manager receives evaluation form with only eligible subordinates

### Use Case 3: Department-Specific Evaluation
**Scenario:** Conduct evaluation only for specific roles within a department.

**Solution:**
1. Filter by department
2. Select relevant evaluators
3. For each evaluator, deselect subordinates from non-target roles
4. Trigger focused evaluation

---

## 🔧 Technical Implementation

### Frontend Changes

**File:** `frontend/app/evaluation-new/page.tsx`

#### 1. **New State Management**
```typescript
const [selectedSubordinates, setSelectedSubordinates] = useState<Record<string, string[]>>({});
// Structure: { evaluatorId: [subordinateId1, subordinateId2, ...] }
```

#### 2. **Subordinate Selection UI**
- Expandable list under each evaluator
- Individual checkboxes for each subordinate
- Select All / Deselect All toggle
- Shows subordinate name and role

#### 3. **Updated Trigger Payload**
```typescript
evaluator_data: [
  {
    evaluator_id: "uuid-1",
    subordinate_ids: ["sub-uuid-1", "sub-uuid-2"]
  },
  {
    evaluator_id: "uuid-2",
    subordinate_ids: ["sub-uuid-3", "sub-uuid-4"]
  }
]
```

### Backend Changes

**File:** `backend/app/Http/Controllers/Api/EvaluationTriggerController.php`

#### 1. **Updated Validation Rules**
```php
'evaluator_data' => 'required|array|min:1',
'evaluator_data.*.evaluator_id' => 'required|uuid|exists:evaluation_staff,id',
'evaluator_data.*.subordinate_ids' => 'required|array|min:1',
'evaluator_data.*.subordinate_ids.*' => 'uuid|exists:evaluation_staff,id',
```

#### 2. **Changed Subordinate Retrieval**
**Before:** Fetched ALL subordinates from hierarchy table
```php
$subordinates = DB::table('evaluation_hierarchy as eh')
    ->join('evaluation_staff as es', 'eh.staff_id', '=', 'es.id')
    ->where('eh.reports_to_id', $evaluatorId)
    ->get();
```

**After:** Fetches ONLY selected subordinates
```php
$subordinates = DB::table('evaluation_staff as es')
    ->whereIn('es.id', $subordinateIds)
    ->whereNull('es.deleted_at')
    ->get();
```

---

## 🎨 UI/UX Flow

### Step-by-Step User Experience

1. **Navigate to Trigger Tab**
   - Admin goes to Evaluation System → Trigger

2. **Select Evaluation Form**
   - Choose existing template or custom questionnaire

3. **Select Evaluators**
   - Optional: Filter by Department
   - Check evaluators to include

4. **Select Subordinates** ⭐ NEW
   - Each selected evaluator automatically expands
   - Shows list of their subordinates
   - **All subordinates selected by default**
   - Admin can:
     - Click "Deselect All" to uncheck all
     - Individually check/uncheck subordinates
     - Click "Select All" to re-check all

5. **Review Summary**
   - Shows: "X evaluator(s) selected • Y subordinate(s) to evaluate"

6. **Trigger Evaluation**
   - System validates at least one subordinate is selected
   - Sends evaluation with only selected subordinates

---

## 📊 Data Flow

```
Admin Action → Frontend State → Backend API → Database
     ↓              ↓               ↓             ↓
Select      Update selected   Validate     Store only
Evaluator → Subordinates   → Payload  → selected subs
            (all by default)
```

### Database Storage
The `evaluation_triggered` table stores:
```json
{
  "subordinates": [
    {"id": "uuid-1", "name": "John Doe", "email": "john@example.com"},
    {"id": "uuid-2", "name": "Jane Smith", "email": "jane@example.com"}
  ],
  "subordinates_count": 2
}
```

**Only selected subordinates are stored** - not all subordinates from hierarchy.

---

## ✅ Testing Checklist

### Functional Testing

- [ ] Select single evaluator → subordinates list appears
- [ ] All subordinates checked by default
- [ ] Click "Deselect All" → all unchecked
- [ ] Click "Select All" → all checked again
- [ ] Uncheck evaluator → subordinates list collapses
- [ ] Trigger with no subordinates → shows error
- [ ] Trigger with some subordinates → creates evaluation
- [ ] Filter by department → only shows relevant evaluators
- [ ] Change filter → resets subordinate selections

### Validation Testing

- [ ] Cannot trigger if no evaluators selected
- [ ] Cannot trigger if all selected evaluators have zero subordinates
- [ ] Can trigger if at least one evaluator has subordinates selected
- [ ] Warning message appears when evaluator has no subordinates

### Integration Testing

- [ ] Triggered evaluation stored with correct subordinates
- [ ] Email sent to evaluator with correct subordinate list
- [ ] Evaluator sees only selected subordinates in evaluation form
- [ ] Reports show only evaluations for selected subordinates

---

## 🔍 Validation Rules

### Frontend Validation
1. At least one evaluator must be selected
2. At least one subordinate must be selected across all evaluators
3. Cannot proceed if all evaluators have zero subordinates selected

### Backend Validation
1. `evaluator_data` must be array with at least 1 entry
2. Each `evaluator_id` must exist in `evaluation_staff` table
3. Each `subordinate_ids` must be array with at least 1 entry
4. All `subordinate_ids` must exist in `evaluation_staff` table
5. Subordinates must not be deleted (`deleted_at IS NULL`)

---

## 📁 Files Modified

### Frontend
- `frontend/app/evaluation-new/page.tsx`
  - Added `selectedSubordinates` state
  - Updated evaluator selection UI with subordinate list
  - Updated trigger handler to send `evaluator_data`
  - Added subordinate count to summary
  - Added validation for subordinate selection

### Backend
- `backend/app/Http/Controllers/Api/EvaluationTriggerController.php`
  - Updated validation rules to accept `evaluator_data`
  - Changed subordinate retrieval to use selected IDs
  - Added validation for subordinate existence

### Deployment
- `deploy_subordinate_selection.sh` (New)
- `SUBORDINATE_SELECTION_ENHANCEMENT.md` (This file)

---

## 🚀 Deployment

### Automated Deployment
```bash
chmod +x deploy_subordinate_selection.sh
./deploy_subordinate_selection.sh
```

### Manual Deployment

#### Backend
```bash
scp -i QSights-Mumbai-12Aug2019.pem \
  backend/app/Http/Controllers/Api/EvaluationTriggerController.php \
  ubuntu@13.126.210.220:/var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
```

#### Frontend
```bash
cd frontend
npm run build
scp -i ../QSights-Mumbai-12Aug2019.pem -r .next/static ubuntu@13.126.210.220:/var/www/frontend/.next/
scp -i ../QSights-Mumbai-12Aug2019.pem .next/BUILD_ID ubuntu@13.126.210.220:/var/www/frontend/.next/
ssh -i ../QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 "pm2 restart qsights-frontend"
```

---

## 🎓 User Guide

### For Evaluation Admins

#### How to Select Specific Subordinates

1. **Access Evaluation System**
   - Navigate to Evaluation System
   - Click on "Trigger" tab

2. **Choose Evaluation Form**
   - Select from existing templates OR
   - Choose custom questionnaire

3. **Select Evaluators**
   - (Optional) Filter by Department
   - Check the box next to evaluators you want to include

4. **Configure Subordinates** ⭐
   - When you check an evaluator, their subordinates list appears below
   - **By default, ALL subordinates are selected**
   - To exclude someone:
     - Uncheck their individual checkbox
     - OR click "Deselect All" and then select specific ones
   - To include everyone:
     - Click "Select All" (if previously deselected)

5. **Review & Trigger**
   - Check the summary: "X evaluator(s) • Y subordinate(s) to evaluate"
   - Click "Trigger Evaluation"
   - Confirm details and send

#### Tips
- ✅ Use department filter to narrow down evaluators
- ✅ Check subordinate count before triggering
- ✅ Warning appears if no subordinates selected for an evaluator
- ✅ Summary shows total subordinates across all evaluators

---

## 🐛 Troubleshooting

### Issue: Subordinates list not appearing
**Solution:** Ensure the evaluator checkbox is checked. List only appears for selected evaluators.

### Issue: Cannot trigger evaluation
**Possible Causes:**
1. No evaluators selected → Select at least one evaluator
2. No subordinates selected → Select at least one subordinate for any evaluator
3. No evaluation form selected → Select a template or custom questionnaire

### Issue: Wrong subordinates appearing
**Solution:** 
1. Check department filter - may be filtering unintentionally
2. Verify hierarchy mappings in Setup tab
3. Ensure staff are not marked as deleted

---

## 📈 Benefits

### For Admins
- ✅ More control over evaluation scope
- ✅ Flexibility to exclude specific team members
- ✅ Reduced burden on evaluators
- ✅ Better evaluation targeting

### For Evaluators
- ✅ See only relevant subordinates to evaluate
- ✅ Less confusion about who to evaluate
- ✅ Faster evaluation completion
- ✅ Clearer expectations

### For Organization
- ✅ More accurate evaluation data
- ✅ Flexible evaluation processes
- ✅ Better resource utilization
- ✅ Improved evaluation quality

---

## 🔮 Future Enhancements

### Potential Improvements
1. **Save Selection Templates** - Save common subordinate selection patterns
2. **Bulk Operations** - Apply same subordinate selection to multiple evaluators
3. **Role-Based Auto-Selection** - Auto-select subordinates based on role criteria
4. **History Tracking** - Show which subordinates were selected in past evaluations
5. **Smart Suggestions** - AI-powered suggestions for subordinate selection

---

## 📞 Support

For questions or issues with this feature:
- Check the troubleshooting section above
- Review the user guide
- Contact: yash@qsights.com

---

## ✅ Status

- **Development:** ✅ Complete
- **Testing:** ⏳ Pending
- **Deployment:** ⏳ Ready
- **Documentation:** ✅ Complete

---

**Last Updated:** February 6, 2026  
**Author:** QSights Development Team  
**Version:** 1.0
