# Backup: 19 January 2026 - Focus Fix & Range Display

## Date
19 January 2026

## Issues Fixed

### 1. Focus/Jumping Issue in Questionnaire Builder
**Problem**: When editing any input field (question title, options, settings), the page would jump to the top and lose focus.

**Root Cause**: Input components with `onChange` handlers were calling `setSections()` on every keystroke, causing the entire sections array to rebuild and all components to re-render.

**Solution**: Changed all setting inputs from `onChange` to `onBlur`:
- Changed from `value={...}` + `onChange` to `defaultValue={...}` + `onBlur`
- Added unique `key` props to force re-render only when actual value changes
- Updates now happen only when user finishes editing (blur/tab out)

### 2. Range Display Logic - Overlapping Boundaries
**Problem**: Dial gauge with ranges 0-1, 1-2, 2-3, 3-4, 4-5 showed "Range 1 (0-1)" for both value 0 and value 1.

**Root Cause**: Inclusive bounds (`value >= min && value <= max`) caused overlaps at boundaries - value 1 matched both Range 1 (0-1) and Range 2 (1-2).

**Solution**: Changed to exclusive upper bound for all ranges except the last:
- Ranges 1-4: Use `[min, max)` - includes min, excludes max
- Last range: Uses `[min, max]` - includes both min and max
- Sorted mappings to ensure correct order

**Result**: 
- Range 1 (0-1): Matches value 0 only
- Range 2 (1-2): Matches value 1 only
- Range 3 (2-3): Matches value 2 only
- Range 4 (3-4): Matches value 3 only
- Range 5 (4-5): Matches values 4 and 5

## Files Modified

1. **frontend/app/questionnaires/create/page.tsx**
   - Fixed 21 Input components (slider, dial gauge, likert, star rating settings)
   - Changed from onChange to onBlur for all numeric/text inputs
   - Changed from onChange to onBlur for all URL inputs

2. **frontend/lib/valueDisplayUtils.ts**
   - Modified `resolveDisplayValue()` function
   - Implemented exclusive upper bound logic for range matching
   - Added sorting of range mappings

3. **frontend/components/IsolatedTextInput.tsx**
   - No changes (already using onBlur pattern)
   - Included for reference

## Deployment
- Files deployed to production server (13.126.210.220)
- Frontend rebuilt and PM2 restarted
- All changes live and working

## Testing Verified
✅ Can type in min/max/step fields without jumping
✅ Can type in label fields without jumping  
✅ Can type in URL fields without jumping
✅ Range display shows correct non-overlapping ranges
✅ All images loading correctly (previous fix still working)
