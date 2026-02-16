# Thank You Video - Testing Guide

**Date:** February 16, 2026  
**Questionnaire:** Intro_video (ID: 33)  
**Status:** ✅ Code Implementation Complete

## 🎯 What Was Fixed

### 1. Thank You Video Upload
- ✅ Upload interface already exists in questionnaire editor
- ✅ S3 video upload working
- ✅ Backend API endpoints ready (`/videos/metadata` with type=thankyou)

### 2. Thank You Video Display (NEW)
- ✅ Added video state to take activity page
- ✅ Fetches thank you video when activity loads
- ✅ Displays video on existing thank you page (no new page)
- ✅ Video appears between success message and "Take Event Again" button

### 3. Auto-Save Warning (FIXED)
- ✅ Fixed "Failed to auto-save video settings" warning
- ✅ Added `initialLoadCompleteRef` flag to prevent auto-save during initial load
- ✅ Auto-save now only triggers after user makes changes

## 📝 Test Plan

### Step 1: Add Thank You Video to Questionnaire

1. **Open Questionnaire Editor:**
   ```
   https://prod.qsights.com/questionnaires/33
   ```

2. **Scroll to "Thank You Page Video" Section:**
   - Look for the green Video icon card
   - It's below the "Video Intro Block"

3. **Enable and Upload:**
   - Toggle "Enable Thank You Video" to ON
   - Click "Upload Video" - select a test video (MP4/WEBM, max 100MB)
   - Optional: Upload thumbnail image
   - Select play mode: "Inline" (recommended for testing)
   - Toggle "Mandatory Full Watch" if needed
   - Wait for auto-save success message: "Video Saved"

4. **Verify No Warning Messages:**
   - ❌ Should NOT see: "Failed to auto-save video settings"
   - ✅ Should see: "Video Saved" with green checkmark

### Step 2: Test Video Display

**Option A: Quick Preview Test**
```
1. Click "Preview" button (top-right)
2. Answer the 2 MCQ questions
3. Click "Submit"
4. ✅ Verify thank you page shows:
   - Success icon (green checkmark)
   - "Thank you!" message
   - White card with "Thank You Message" heading
   - Video player embedded inside card
   - Video plays when clicked
```

**Option B: Full Activity Test**
```
1. Go to Activities page
2. Find activity using Intro_video questionnaire
3. Copy the take link
4. Open in incognito/new browser
5. Complete questionnaire
6. Submit
7. ✅ Verify video displays on thank you page
```

### Step 3: Verify Technical Implementation

**Browser Console Checks:**
```javascript
// 1. Check video was fetched
// Look for: "Loaded thank you video: {video_url: '...', ...}"

// 2. Check video state
// On thank you page, run:
console.log('Thank you video:', thankyouVideo); // Should show video object
console.log('Watch time:', thankyouVideoWatchTime); // Should increment

// 3. Check API call
// Network tab should show:
// GET /api/public/videos/questionnaire/33?type=thankyou
// Status: 200
```

**Visual Checks:**
- [ ] Video card has white background, rounded corners, shadow
- [ ] "Thank You Message" heading centered at top
- [ ] Video player has controls (play/pause)
- [ ] Video maintains aspect ratio
- [ ] On mobile: video is responsive

## 🔍 Expected Behavior

### When Thank You Video is Configured:
1. Participant submits questionnaire
2. Thank you page displays with success message
3. Below success message, video card appears
4. Video can be played inline (or opens in new tab if configured)
5. Watch time is tracked in state
6. "Take Event Again" button appears below video (if enabled)

### When Thank You Video is NOT Configured:
1. Participant submits questionnaire
2. Standard thank you page displays
3. No video card shown
4. "Take Event Again" button appears (if enabled)

## 📊 Database Verification (Optional)

```sql
-- Check if thank you video record exists
SELECT * FROM questionnaire_videos 
WHERE questionnaire_id = 33 
AND video_type = 'thankyou';

-- Should return 1 row with:
-- - video_url: S3 URL
-- - thumbnail_url: S3 URL (optional)
-- - display_mode: 'inline' or 'new_tab'
-- - must_watch: boolean
-- - autoplay: false (always false for thank you videos)
```

## ✅ Success Criteria

- [ ] Can upload thank you video without errors
- [ ] No "Failed to auto-save" warnings appear
- [ ] Auto-save success message shows after upload
- [ ] Video displays on thank you page after submission
- [ ] Video plays correctly with controls
- [ ] Video is responsive on mobile
- [ ] "Take Event Again" button appears below video (if enabled)

## 🐛 Troubleshooting

### Issue: Video doesn't appear on thank you page
**Check:**
1. Browser console for errors
2. Network tab: API call to `/api/public/videos/questionnaire/33?type=thankyou`
3. Response should have `data` object with video info

### Issue: "Failed to auto-save" warning appears
**Check:**
1. Clear browser cache and reload
2. Ensure you're on latest code version
3. Check if video upload completed before error

### Issue: Video doesn't play
**Check:**
1. S3 URL is accessible (check presigned URL)
2. Video format is supported (MP4, WEBM)
3. Browser console for playback errors

## 📱 Files Modified

### Frontend:
- `frontend/app/activities/take/[id]/page.tsx` (Lines 481-483, 1227-1239, 3761-3774, 3841-3854)
  - Added thank you video state
  - Fetch thank you video on load
  - Display video on thank you page

- `frontend/app/questionnaires/[id]/page.tsx` (Lines 147, 217, 277, 509)
  - Fixed auto-save warning
  - Added `initialLoadCompleteRef` flag

### Backend:
- No changes needed (API already supports thank you videos)

## 🎬 Ready to Test!

Your implementation is complete. Just follow the test steps above to verify everything works!
