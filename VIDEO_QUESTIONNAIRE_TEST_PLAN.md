# Video Questionnaire Feature - Comprehensive Test Plan

**Date:** February 12, 2026  
**Status:** Ready for Testing  
**Test Coverage:** Unit, Integration, Manual, Load Testing  

---

## ✅ Pre-Testing Validation (PASSED)

### Code Quality Checks
- ✅ **TypeScript Compilation:** No errors in VideoPlayer.tsx
- ✅ **TypeScript Compilation:** No errors in S3VideoUpload.tsx  
- ✅ **TypeScript Compilation:** No errors in take activity page
- ✅ **TypeScript Compilation:** No errors in results page
- ✅ **PHP Syntax:** No errors in VideoUploadController.php
- ✅ **PHP Syntax:** No errors in VideoViewLog.php
- ✅ **PHP Syntax:** No errors in QuestionnaireVideo.php

### Build Verification
- ✅ **Frontend Build:** Compiled successfully (Next.js)
- ✅ **Static Generation:** 82 pages generated
- ✅ **Bundle Size:** Routes optimized and within limits
- ⚠️ **Dynamic Routes:** Expected warnings for API routes (non-blocking)

### API Routes Verification
- ✅ `POST /api/videos/upload` - Video upload endpoint
- ✅ `POST /api/videos/metadata` - Save video metadata
- ✅ `GET /api/videos/questionnaire/{id}` - Fetch video by questionnaire
- ✅ `DELETE /api/videos/{id}` - Delete video
- ✅ `GET /api/videos/statistics/{id}` - Get video statistics
- ✅ `POST /api/public/videos/log-view` - Log video view (public)
- ✅ `POST /api/public/videos/watch-log` - Get watch log (public)

### Database Migrations Status
- ⏳ `2026_02_12_100000_create_questionnaire_videos_table` - Ready to run
- ⏳ `2026_02_12_100001_create_video_view_logs_table` - Ready to run
- 📝 **Note:** Migrations pending deployment to database

---

## 🧪 Test Scenarios

### Category 1: Video Upload & Configuration

#### Test 1.1: Upload Video (<100MB)
**Prerequisites:** Admin logged in, questionnaire open in builder  
**Steps:**
1. Navigate to questionnaire builder
2. Scroll to "Video Intro Block" section
3. Click "Upload Video"
4. Select valid video file (MP4/WEBM, <100MB)
5. Wait for upload to complete

**Expected Results:**
- ✅ File uploads successfully
- ✅ Progress indicator shows upload status
- ✅ Success message appears
- ✅ Video duration auto-detected
- ✅ Video URL stored in database
- ✅ Video can be played in preview

**Test Data:**
- File: sample_video.mp4 (50MB, 2:30 duration)
- Format: H.264 codec, MP4 container
- Resolution: 1920x1080

---

#### Test 1.2: Upload Video (>100MB) - Should Fail
**Prerequisites:** Admin logged in, questionnaire open  
**Steps:**
1. Navigate to questionnaire builder
2. Try to upload video >100MB

**Expected Results:**
- ❌ Upload blocked with error message
- ❌ Error: "Video file size must be less than 100MB"
- ✅ No partial upload to server
- ✅ User can try again with smaller file

**Test Data:**
- File: large_video.mp4 (125MB)

---

#### Test 1.3: Upload Invalid Format
**Prerequisites:** Admin logged in  
**Steps:**
1. Try to upload video in unsupported format (AVI, MOV, FLV)

**Expected Results:**
- ❌ Upload blocked
- ❌ Error: "Only MP4 and WEBM formats are supported"
- ✅ File selection filtered to .mp4, .webm

**Test Data:**
- File: test_video.avi (30MB)

---

#### Test 1.4: Configure Video Settings
**Prerequisites:** Video uploaded successfully  
**Steps:**
1. Upload thumbnail (optional)
2. Select display mode: Inline
3. Toggle must-watch: ON
4. Toggle autoplay: OFF
5. Save questionnaire

**Expected Results:**
- ✅ All settings saved to database
- ✅ Thumbnail displayed in preview
- ✅ Must-watch badge shows in preview
- ✅ Settings persist after page reload

**Settings to Test:**
- Display mode: Inline vs Modal
- Must-watch: ON vs OFF
- Autoplay: ON vs OFF
- Thumbnail: Uploaded vs None

---

### Category 2: Participant Video Experience

#### Test 2.1: Video Intro (Non-Must-Watch)
**Prerequisites:** Activity with video intro, must-watch OFF  
**Steps:**
1. Register for activity
2. Complete registration form
3. See video intro screen
4. Click "Skip" or watch partially
5. Click "Start Questionnaire"

**Expected Results:**
- ✅ Video intro screen displays
- ✅ Video plays when clicked
- ✅ "Start Questionnaire" button enabled immediately
- ✅ Can skip video and proceed
- ✅ Watch time logged to database

---

#### Test 2.2: Video Intro (Must-Watch)
**Prerequisites:** Activity with video intro, must-watch ON  
**Steps:**
1. Register for activity
2. See video intro screen
3. Try clicking "Start Questionnaire" immediately
4. Watch video to <90%
5. Watch video to ≥90%

**Expected Results:**
- ✅ "Start Questionnaire" button disabled initially
- ✅ Warning message: "Please watch video to continue"
- ✅ Button stays disabled until 90% watched
- ✅ Completion badge appears at 90%
- ✅ Button enabled after 90%
- ✅ Can proceed to questionnaire

**Test Data:**
- Video duration: 2:30 (150 seconds)
- 90% threshold: 2:15 (135 seconds)

---

#### Test 2.3: Video Autoplay
**Prerequisites:** Activity with autoplay ON  
**Steps:**
1. Register and proceed to video intro screen

**Expected Results:**
- ✅ Video starts playing automatically
- ✅ Audio plays (if not muted by browser)
- ✅ Controls visible and functional
- ✅ Can pause/resume

**Browser Notes:**
- Chrome: May block autoplay with audio
- Firefox: Check autoplay settings
- Safari: Check website preferences

---

#### Test 2.4: Video Player Controls
**Prerequisites:** Video intro screen visible  
**Steps:**
1. Click Play/Pause button
2. Drag progress bar
3. Click Volume button (mute/unmute)
4. Click Fullscreen button
5. Use keyboard shortcuts (space, arrows)

**Expected Results:**
- ✅ Play/Pause toggles video state
- ✅ Progress bar seeks to position
- ✅ Volume toggles mute state
- ✅ Fullscreen works
- ✅ Time display accurate (MM:SS / MM:SS)

---

#### Test 2.5: Video Display Modes
**Test 2.5a: Inline Mode**
- ✅ Video embedded in page
- ✅ Scrolling works normally
- ✅ Video visible at all times

**Test 2.5b: Modal Mode**
- ✅ Thumbnail shows first
- ✅ Click opens modal overlay
- ✅ Video plays in modal
- ✅ Close button works
- ✅ Clicking outside closes modal

---

### Category 3: Watch Time Tracking (Task 8)

#### Test 3.1: Periodic Auto-Save
**Prerequisites:** Video intro with periodic save enabled  
**Steps:**
1. Start video playback
2. Wait 35 seconds (beyond first 30s interval)
3. Check database for view log entry
4. Wait another 35 seconds
5. Check database again

**Expected Results:**
- ✅ First save at ~30 seconds
- ✅ Second save at ~60 seconds
- ✅ watch_duration_seconds increases
- ✅ completion_percentage updates
- ✅ Only one record per participant+activity+video

**Database Check:**
```sql
SELECT participant_id, watch_duration_seconds, completion_percentage, updated_at
FROM video_view_logs
WHERE video_id = '<video_id>' AND activity_id = '<activity_id>'
ORDER BY updated_at DESC;
```

---

#### Test 3.2: Page Unload Handling
**Prerequisites:** Video playing  
**Steps:**
1. Start video playback
2. Watch for 45 seconds
3. Close browser tab (or refresh page)
4. Check database

**Expected Results:**
- ✅ Watch time saved to database
- ✅ watch_duration_seconds = ~45
- ✅ completed = false (if <90%)
- ✅ beforeunload event fired successfully

**Test Variations:**
- Browser close
- Tab close
- Page refresh (F5)
- Navigate away
- Alt+Tab (visibility change on mobile)

---

#### Test 3.3: Resume from Last Position
**Prerequisites:** Existing watch log with watch_duration_seconds > 10  
**Steps:**
1. Register for activity (as same participant)
2. Navigate to video intro screen
3. See resume dialog
4. Check dialog text
5. Click "Resume from X:XX"
6. Verify video position

**Expected Results:**
- ✅ Resume dialog appears automatically
- ✅ Dialog shows last watched position (e.g., "2:45")
- ✅ Three buttons visible:
  - "Resume from 2:45" (blue)
  - "Start Over" (outline)
  - "Continue to Questionnaire" (green, if completed)
- ✅ Clicking "Resume" starts video at saved position
- ✅ Clicking "Start Over" starts from 0:00

**Test Cases:**
- **Partial Watch (<90%):** Shows resume + start over
- **Complete Watch (≥90%):** Shows watch again + continue
- **Very Short Watch (<10s):** No dialog, starts fresh

---

#### Test 3.4: Resume Dialog - Already Completed
**Prerequisites:** Watch log with completed = true  
**Steps:**
1. Return to video intro screen
2. See resume dialog

**Expected Results:**
- ✅ Dialog text: "You've already watched this video"
- ✅ "Watch Again" button visible
- ✅ "Continue to Questionnaire" button visible (green)
- ✅ Clicking "Continue" enables start button immediately
- ✅ VideoCompleted state set to true

---

### Category 4: Video Metrics & Reports

#### Test 4.1: Video Statistics Card
**Prerequisites:** Activity with responses and video views  
**Steps:**
1. Admin navigates to Activity Results page
2. Scroll to "Video Intro Engagement" section
3. Review displayed metrics

**Expected Results:**
- ✅ Card displays if video exists and has views
- ✅ Card hidden if no video or no views
- ✅ Purple gradient design with 4 metric cards:
  1. **Completed Views:** count + percentage
  2. **Avg Watch Time:** HH:MM:SS format
  3. **Completion Rate:** percentage ≥90%
  4. **Total Views:** total count
- ✅ Metrics accurate vs database
- ✅ Responsive: 1 col mobile → 4 cols desktop

**Test Data:**
- 20 participants
- 18 watched video
- 15 completed (≥90%)
- Expected completion rate: 83%

---

#### Test 4.2: Export with Video Data (CSV)
**Prerequisites:** Activity with video and responses  
**Steps:**
1. Click "Export" button
2. Select "CSV"
3. Download and open file

**Expected Results:**
- ✅ 3 new columns present:
  - "Video Watch Duration" (HH:MM:SS or "Not watched")
  - "Completed Video?" (Yes/No)
  - "Video Completion %" (0-100%)
- ✅ Data accurate per participant
- ✅ "Not watched" for participants who didn't view
- ✅ All other columns unchanged

**Sample Data:**
```csv
Name,Email,Video Watch Duration,Completed Video?,Video Completion %,Q1 Answer
John Doe,john@example.com,00:02:45,Yes,92%,Excellent
Jane Smith,jane@example.com,Not watched,No,0%,Good
Bob Jones,bob@example.com,00:01:30,No,50%,Average
```

---

#### Test 4.3: Export with Video Data (Excel)
**Prerequisites:** Same as 4.2  
**Steps:**
1. Export as Excel (.xlsx)
2. Open in Excel/Google Sheets

**Expected Results:**
- ✅ Same 3 video columns as CSV
- ✅ Formatting preserved
- ✅ Columns sortable and filterable
- ✅ No encoding issues

---

#### Test 4.4: Export Without Video
**Prerequisites:** Activity without video intro  
**Steps:**
1. Export responses (CSV or Excel)

**Expected Results:**
- ✅ Video columns NOT present
- ✅ Standard export format unchanged
- ✅ No errors or blank columns

---

### Category 5: Edge Cases & Error Handling

#### Test 5.1: Network Interruption During Video
**Steps:**
1. Start video playback
2. Disable network (airplane mode or DevTools)
3. Continue playing (from buffer)
4. Enable network

**Expected Results:**
- ✅ Video continues from buffer
- ✅ Periodic save fails silently
- ✅ Next save retries successfully
- ✅ No error shown to user
- ✅ Final save on "Start Questionnaire" works

---

#### Test 5.2: Browser Crash During Video
**Steps:**
1. Start video playback
2. Force-kill browser process
3. Reopen browser
4. Return to activity

**Expected Results:**
- ✅ Last periodic save preserved (up to 30s ago)
- ✅ Resume dialog offers last saved position
- ✅ No data corruption

---

#### Test 5.3: Multiple Tabs/Windows
**Steps:**
1. Open activity in two browser tabs
2. Watch video in both simultaneously

**Expected Results:**
- ✅ Both tabs work independently
- ✅ Watch logs update for each tab
- ✅ Last save wins (updateOrCreate)
- ✅ No race conditions or conflicts

---

#### Test 5.4: Video File 404 (Deleted from S3)
**Steps:**
1. Configure video intro
2. Manually delete video from S3 bucket
3. Participant tries to watch

**Expected Results:**
- ✅ Video player shows error
- ✅ Error message: "Video failed to load"
- ✅ Can skip video (if not must-watch)
- ✅ Admin notified (logs)

---

#### Test 5.5: Anonymous Participant
**Prerequisites:** Activity with anonymous mode  
**Steps:**
1. Access activity with anonymous link
2. Watch video intro
3. Start questionnaire

**Expected Results:**
- ✅ Video works for anonymous users
- ✅ Watch log created with participant_id
- ✅ No email/name required
- ✅ View appears in statistics

---

#### Test 5.6: Preview Mode
**Prerequisites:** Admin in preview mode  
**Steps:**
1. Click "Preview" button
2. Watch video intro
3. Start questionnaire

**Expected Results:**
- ✅ Video plays normally
- ✅ Watch log created but marked as preview
- ✅ Toast: "Preview Mode - No data saved"
- ✅ Not counted in statistics

---

### Category 6: Cross-Browser Testing

#### Test 6.1: Desktop Browsers
**Browsers to Test:**
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (macOS)
- ✅ Edge (latest)

**Test Checklist per Browser:**
- Video upload works
- Video playback works
- Controls functional
- Periodic save works
- Page unload save works
- Resume dialog works
- Must-watch enforcement works

**Known Issues:**
- Safari: Autoplay may be blocked by default
- Firefox: Requires user gesture for autoplay with sound

---

#### Test 6.2: Mobile Browsers
**Devices to Test:**
- ✅ iOS Safari (iPhone)
- ✅ iOS Safari (iPad)
- ✅ Android Chrome
- ✅ Android Firefox

**Mobile-Specific Checks:**
- Touch controls work
- Fullscreen toggle works
- Video resizes correctly
- App switching triggers visibility save
- Resume dialog readable on small screens

---

### Category 7: Performance Testing

#### Test 7.1: Multiple Concurrent Video Uploads
**Steps:**
1. Admin uploads 5 videos simultaneously to different questionnaires
2. Monitor server resources
3. Check all uploads complete

**Expected Results:**
- ✅ All uploads succeed
- ✅ No timeouts or crashes
- ✅ S3 presigned URLs work
- ✅ Database writes successful

---

#### Test 7.2: Many Concurrent Participants Watching Video
**Steps:**
1. Simulate 50 participants watching same video intro
2. All at different positions (staggered start times)
3. Monitor database write load

**Expected Results:**
- ✅ All periodic saves succeed
- ✅ No database locks or conflicts
- ✅ UpdateOrCreate handles concurrency
- ✅ Response time <500ms per save

**Load Testing Tool:**
```bash
# Apache Bench or k6
k6 run load-test-video-views.js --vus 50 --duration 2m
```

---

#### Test 7.3: Large Video File (Near 100MB Limit)
**Steps:**
1. Upload 95MB video file
2. Monitor upload progress
3. Check S3 storage
4. Participant watches video

**Expected Results:**
- ✅ Upload completes successfully
- ✅ Progress indicator accurate
- ✅ Video streams smoothly (no buffer issues)
- ✅ CloudFront CDN delivers efficiently (if configured)

---

### Category 8: Data Integrity

#### Test 8.1: Orphaned Video Cleanup
**Steps:**
1. Create questionnaire with video
2. Delete video from questionnaire
3. Check database

**Expected Results:**
- ✅ Video record marked as deleted
- ✅ S3 file deleted (or marked for cleanup)
- ✅ View logs preserved (for reporting)
- ✅ Statistics show 0 views for deleted videos

---

#### Test 8.2: Duplicate Prevention
**Steps:**
1. Participant watches video
2. Manually call log-view API multiple times with same data
3. Check database

**Expected Results:**
- ✅ Only one record in video_view_logs
- ✅ UpdateOrCreate updates existing record
- ✅ No duplicate participant+activity+video combinations

---

#### Test 8.3: Data Export Consistency
**Steps:**
1. Export data as CSV
2. Export same data as Excel
3. Compare content

**Expected Results:**
- ✅ Video columns match exactly
- ✅ Watch durations identical
- ✅ Completion statuses identical
- ✅ No rounding errors or encoding issues

---

## 🔒 Security Testing

### Test S.1: Unauthorized Video Upload
**Steps:**
1. Logout or use non-admin user
2. Try to access video upload endpoint directly

**Expected Results:**
- ❌ 401 Unauthorized
- ❌ No video upload possible
- ✅ Error message: "Authentication required"

---

### Test S.2: Video File Type Validation (Backend)
**Steps:**
1. Bypass frontend validation
2. POST malicious file (e.g., .exe renamed to .mp4)

**Expected Results:**
- ❌ Backend rejects file
- ❌ MIME type validation fails
- ✅ Error: "Invalid video format"

---

### Test S.3: SQL Injection on Video Metadata
**Steps:**
1. Try to inject SQL in video metadata fields

**Expected Results:**
- ✅ Laravel ORM prevents SQL injection
- ✅ Parameterized queries used
- ✅ No database errors

---

### Test S.4: XSS in Video Title/Description
**Steps:**
1. Try to inject JavaScript in video title

**Expected Results:**
- ✅ React auto-escapes output
- ✅ No script execution
- ✅ Safe rendering in UI

---

## 📊 Test Results Summary

### Automated Test Results
```bash
# Run these commands to verify
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Frontend build
cd frontend && npm run build
# Expected: ✅ Compiled successfully

# Backend routes
cd backend && php artisan route:list | grep video
# Expected: ✅ 7 routes registered

# TypeScript check
cd frontend && npx tsc --noEmit
# Expected: ✅ No errors

# PHP syntax check
cd backend && php -l app/Http/Controllers/Api/VideoUploadController.php
# Expected: ✅ No syntax errors
```

---

## 📝 Manual Testing Checklist

### Pre-Deployment Checklist
- [ ] All automated tests pass
- [ ] Frontend builds without errors
- [ ] Backend migrations run successfully
- [ ] API routes accessible
- [ ] Video upload works (<100MB, valid format)
- [ ] Video playback works (Chrome, Firefox, Safari)
- [ ] Must-watch enforcement works
- [ ] Periodic save works (check database after 30s)
- [ ] Resume dialog works (return to video)
- [ ] Video statistics display correctly
- [ ] CSV export includes video columns
- [ ] Excel export includes video columns
- [ ] Mobile video playback works (iOS, Android)
- [ ] Page unload saves progress
- [ ] No console errors in browser
- [ ] No PHP errors in backend logs

### Post-Deployment Verification
- [ ] Production video upload works
- [ ] S3/CloudFront delivery works
- [ ] Database writes succeed
- [ ] Statistics update in real-time
- [ ] Exports download correctly
- [ ] No performance degradation
- [ ] Monitor error logs for 24 hours

---

## 🐛 Known Issues

### Non-Critical
1. **PHP Deprecation Warnings:** PDO::MYSQL_ATTR_SSL_CA constant deprecated in PHP 8.5
   - **Impact:** Console warnings only, functionality unaffected
   - **Fix:** Update Laravel framework to latest version

2. **Next.js Dynamic Route Warnings:** API routes show dynamic server usage warnings
   - **Impact:** Expected behavior for dynamic API routes
   - **Fix:** None needed (by design)

### Pending Resolution
1. **Notifications Migration Error:** Foreign key type mismatch
   - **Impact:** Blocks full migration suite
   - **Fix:** Update notification migration to use UUID for participant_id

---

## 📋 Test Sign-Off

### Development Testing Sign-Off
- **Tester:** _____________
- **Date:** _____________
- **Status:** [ ] Passed [ ] Failed [ ] Partial
- **Notes:** _____________

### QA Testing Sign-Off
- **Tester:** _____________
- **Date:** _____________
- **Status:** [ ] Passed [ ] Failed [ ] Partial
- **Notes:** _____________

### UAT (User Acceptance Testing) Sign-Off
- **Stakeholder:** _____________
- **Date:** _____________
- **Status:** [ ] Approved [ ] Rejected [ ] Needs Changes
- **Notes:** _____________

---

## 🚀 Deployment Readiness Criteria

### Must-Have (Blocking)
- ✅ Frontend builds successfully
- ✅ No TypeScript errors
- ✅ No PHP syntax errors
- ✅ API routes registered
- ⏳ Database migrations run successfully
- ⏳ Video upload works in staging
- ⏳ Video playback works in staging
- ⏳ Must-watch enforcement tested
- ⏳ Watch time tracking tested

### Should-Have (Important)
- ⏳ Periodic auto-save tested
- ⏳ Resume functionality tested
- ⏳ Cross-browser tested (Chrome, Firefox, Safari)
- ⏳ Mobile tested (iOS, Android)
- ⏳ Export functionality tested

### Nice-to-Have (Optional)
- ⏳ Load testing completed
- ⏳ Performance benchmarks met
- ⏳ Security audit completed
- ⏳ Documentation reviewed

**Current Status:** 
- **Code Validation:** 100% Complete ✅
- **Manual Testing:** 0% Complete ⏳
- **Overall Readiness:** 60% - Needs Manual Testing

---

## 📚 Testing Resources

### Test Data Files
- `test-videos/` - Sample video files for testing
  - `sample_2min_50mb.mp4` - Valid video under 100MB
  - `sample_5min_80mb.mp4` - Valid longer video
  - `large_video_125mb.mp4` - Invalid (too large)
  - `invalid_format.avi` - Invalid format

### Test Accounts
- **Admin:** admin@test.com / TestPass123
- **Program Admin:** program.admin@test.com / TestPass123
- **Test Participant:** participant@test.com / TestPass123

### Database Queries for Verification
```sql
-- Check video uploads
SELECT id, questionnaire_id, video_url, video_duration_seconds, must_watch, created_at
FROM questionnaire_videos
ORDER BY created_at DESC LIMIT 10;

-- Check watch logs
SELECT video_id, participant_id, watch_duration_seconds, completed, completion_percentage, updated_at
FROM video_view_logs
ORDER BY updated_at DESC LIMIT 20;

-- Check statistics
SELECT 
    v.video_url,
    COUNT(l.id) as total_views,
    COUNT(CASE WHEN l.completed THEN 1 END) as completed_views,
    AVG(l.watch_duration_seconds) as avg_watch_time
FROM questionnaire_videos v
LEFT JOIN video_view_logs l ON v.id = l.video_id
GROUP BY v.id;
```

---

## 🎯 Success Criteria

Feature is considered **production-ready** when:

1. ✅ All code quality checks pass
2. ⏳ Database migrations run without errors
3. ⏳ 100% of Category 1 tests pass (Upload & Configuration)
4. ⏳ 100% of Category 2 tests pass (Participant Experience)
5. ⏳ 80%+ of Category 3 tests pass (Watch Time Tracking)
6. ⏳ 100% of Category 4 tests pass (Metrics & Reports)
7. ⏳ 90%+ of Category 5 tests pass (Edge Cases)
8. ⏳ Chrome + Firefox + Safari tested
9. ⏳ iOS + Android mobile tested
10. ⏳ No critical bugs found

**Current Score:** 1/10 categories complete (10%)

**Recommendation:** Proceed with manual testing in staging environment before production deployment.
