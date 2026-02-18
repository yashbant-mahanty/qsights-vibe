# VIDEO QUESTION FEATURE - QUICK START GUIDE
**Date**: February 12, 2026  
**Status**: Backend Complete ✅ | Frontend Partial 🚧  
**Priority**: HIGH

---

## 🎯 WHAT'S BEEN IMPLEMENTED

### ✅ BACKEND (100% Complete)

1. **Database Schema**
   - New `video_watch_tracking` table to track participant viewing
   - Updated `questions` table with 5 new video-specific fields
   - Migrations tested and working

2. **API Endpoints**
   - `POST /videos/question/upload` - Upload video files (MP4/MOV/WEBM, max 100MB)
   - `POST /public/videos/question/track-progress` - Track watch time in real-time
   - `POST /public/videos/question/get-progress` - Resume tracking on page reload

3. **Models & Logic**
   - `VideoWatchTracking` model with relationships
   - `Question` model updated with video fields
   - Time formatting helper (seconds → HH:MM:SS)
   - Completion percentage calculation

4. **Validation**
   - File type: MP4, MOV, WEBM only
   - Max size: 100MB
   - Duration detection using getID3/ffprobe

### 🚧 FRONTEND (60% Complete)

1. **✅ Completed**
   - Video question type registered in questionnaire builder
   - Video icon imported from lucide-react

2. **⏳ Remaining Tasks**
   - Video question configuration UI (upload, settings)
   - Video player component with tracking
   - Mandatory watch validation
   - Reporting updates

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Option A: Automated Deployment

```bash
cd /var/www/QSightsOrg2.0
./deploy_video_question_feature.sh
```

This script will:
- Pull latest changes
- Run database migrations
- Clear caches
- Build frontend
- Restart services

### Option B: Manual Deployment

```bash
# 1. Backend - Run migrations
cd /var/www/QSightsOrg2.0/backend
php artisan migrate --path=database/migrations/2026_02_12_000001_add_video_support_to_questions_table.php --force
php artisan migrate --path=database/migrations/2026_02_12_000002_create_video_watch_tracking_table.php --force

# 2. Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# 3. Build frontend
cd /var/www/QSightsOrg2.0/frontend
npm run build

# 4. Restart services
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx
pm2 restart qsights
```

---

## 📊 DATABASE CHANGES

### New Table: `video_watch_tracking`
```sql
- id (bigint, primary key)
- response_id (uuid) → tracks which submission
- participant_id (uuid, nullable) → anonymous support
- activity_id (uuid)
- question_id (uuid)
- watch_time_seconds (int) → total time watched
- watch_time_formatted (string) → HH:MM:SS format
- completed_watch (boolean) → did they finish?
- completion_percentage (decimal) → % watched
- total_plays, total_pauses, total_seeks (int)
- timestamps
```

### Updated Table: `questions`
```sql
+ video_url (text, nullable)
+ video_thumbnail_url (text, nullable)
+ video_duration_seconds (int, nullable)
+ is_mandatory_watch (boolean, default false)
+ video_play_mode (enum: inline|new_tab, default inline)
```

---

## 🧪 TESTING

### Backend Tests (after deployment)

```bash
# Check migrations
php artisan migrate:status | grep video

# Test API endpoints
curl -X POST http://your-domain.com/api/videos/question/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-video.mp4" \
  -F "questionnaire_id=123" \
  -F "question_id=abc-uuid"

# Test watch tracking
curl -X POST http://your-domain.com/api/public/videos/question/track-progress \
  -H "Content-Type: application/json" \
  -d '{
    "response_id": "uuid",
    "activity_id": "uuid",
    "question_id": "uuid",
    "watch_time_seconds": 125,
    "completed_watch": false
  }'
```

### Database Verification

```sql
-- Check questions table
SELECT id, title, type, video_url, is_mandatory_watch 
FROM questions 
WHERE type = 'video';

-- Check tracking table
SELECT * FROM video_watch_tracking 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 📝 NEXT STEPS (Frontend Implementation)

### Phase 1: Questionnaire Builder UI (Priority 1)

**File**: `frontend/app/questionnaires/create/page.tsx`

**Add to question configuration**:
```tsx
{question.type === 'video' && (
  <>
    {/* Video Upload */}
    <S3VideoUpload
      value={question.video_url}
      onChange={(url) => updateQuestion(sectionIdx, qIndex, 'video_url', url)}
      folder="questionnaire-videos"
      maxSize={100}
      accept="video/mp4,video/mov,video/webm"
    />
    
    {/* OR External Video URL */}
    <Input
      placeholder="Or enter external video URL"
      value={question.video_url}
      onChange={(e) => updateQuestion(sectionIdx, qIndex, 'video_url', e.target.value)}
    />
    
    {/* Duration */}
    <Input
      type="number"
      label="Video Duration (seconds)"
      value={question.video_duration_seconds}
      onChange={(e) => updateQuestion(sectionIdx, qIndex, 'video_duration_seconds', e.target.value)}
    />
    
    {/* Mandatory Toggle */}
    <Switch
      label="Mandatory Watch"
      checked={question.is_mandatory_watch}
      onChange={(checked) => updateQuestion(sectionIdx, qIndex, 'is_mandatory_watch', checked)}
    />
    
    {/* Play Mode */}
    <Select
      label="Play Mode"
      value={question.video_play_mode}
      onChange={(value) => updateQuestion(sectionIdx, qIndex, 'video_play_mode', value)}
    >
      <option value="inline">Play Inline</option>
      <option value="new_tab">Open in New Tab</option>
    </Select>
  </>
)}
```

### Phase 2: Video Player Component (Priority 2)

**Create**: `frontend/components/VideoPlayerWithTracking.tsx`

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  isMandatory: boolean;
  playMode: 'inline' | 'new_tab';
  responseId: string;
  participantId?: string;
  activityId: string;
  questionId: string;
}

export default function VideoPlayerWithTracking({
  videoUrl,
  thumbnailUrl,
  duration,
  isMandatory,
  playMode,
  responseId,
  participantId,
  activityId,
  questionId
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [plays, setPlays] = useState(0);
  const [pauses, setPauses] = useState(0);
  
  // Load existing progress on mount
  useEffect(() => {
    loadProgress();
  }, []);
  
  // Track every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        trackProgress();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [watchTime]);
  
  async function loadProgress() {
    const res = await fetch('/api/public/videos/question/get-progress', {
      method: 'POST',
      body: JSON.stringify({ response_id: responseId, question_id: questionId })
    });
    const data = await res.json();
    if (data.data) {
      setWatchTime(data.data.watch_time_seconds);
      setCompleted(data.data.completed_watch);
      if (videoRef.current) {
        videoRef.current.currentTime = data.data.watch_time_seconds;
      }
    }
  }
  
  async function trackProgress() {
    const currentTime = Math.floor(videoRef.current?.currentTime || 0);
    const isComplete = currentTime >= duration * 0.95;
    
    await fetch('/api/public/videos/question/track-progress', {
      method: 'POST',
      body: JSON.stringify({
        response_id: responseId,
        participant_id: participantId,
        activity_id: activityId,
        question_id: questionId,
        watch_time_seconds: currentTime,
        completed_watch: isComplete,
        total_plays: plays,
        total_pauses: pauses,
        total_seeks: 0
      })
    });
    
    setWatchTime(currentTime);
    if (isComplete) setCompleted(true);
  }
  
  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        controls
        onPlay={() => setPlays(prev => prev + 1)}
        onPause={() => setPauses(prev => prev + 1)}
        onEnded={() => trackProgress()}
        className="w-full rounded-lg"
      />
      
      {isMandatory && !completed && (
        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
          ⚠️ You must watch the full video before submitting
        </div>
      )}
    </div>
  );
}
```

### Phase 3: Take Activity Integration (Priority 3)

**File**: `frontend/app/activities/take/[id]/page.tsx`

**Add to renderQuestion function**:
```tsx
case 'video':
  return (
    <VideoPlayerWithTracking
      videoUrl={question.video_url}
      thumbnailUrl={question.video_thumbnail_url}
      duration={question.video_duration_seconds}
      isMandatory={question.is_mandatory_watch}
      playMode={question.video_play_mode}
      responseId={responseId}
      participantId={participantId}
      activityId={activityId}
      questionId={question.id}
    />
  );
```

**Add validation before submit**:
```tsx
async function validateVideoQuestions() {
  const videoQuestions = allQuestions.filter(q => q.type === 'video' && q.is_mandatory_watch);
  
  for (const video of videoQuestions) {
    const res = await fetch('/api/public/videos/question/get-progress', {
      method: 'POST',
      body: JSON.stringify({ response_id: responseId, question_id: video.id })
    });
    const data = await res.json();
    
    if (!data.data || !data.data.completed_watch) {
      toast.error(`Please watch the full video: "${video.title}"`);
      return false;
    }
  }
  
  return true;
}

// In handleSubmit:
const canSubmit = await validateVideoQuestions();
if (!canSubmit) return;
```

---

## 📈 USAGE EXAMPLE

### Admin Creating Video Question

1. Go to Questionnaire Builder
2. Add Question → Select "Video"
3. Upload video (MP4, max 100MB) OR enter external URL
4. Enter duration (auto-detected if uploaded)
5. Toggle "Mandatory Watch" if required
6. Select "Play Inline" or "New Tab"
7. Save questionnaire

### Participant Taking Activity

1. Navigate to video question
2. See thumbnail with play button
3. Click play → video starts
4. Watch time tracked automatically every 10 seconds
5. If mandatory: cannot submit until 95%+ watched
6. Progress saved - can resume if page reloads

---

## 🐛 TROUBLESHOOTING

### Migration Fails
```bash
# Check migration status
php artisan migrate:status | grep video

# Rollback if needed
php artisan migrate:rollback --step=2

# Re-run
php artisan migrate --force
```

### Video Upload Fails
- Check S3 configuration in system settings
- Verify file is MP4/MOV/WEBM
- Check file size < 100MB
- Check server upload_max_filesize in php.ini

### Watch Tracking Not Working
- Check browser console for API errors
- Verify responseId and participantId are valid UUIDs
- Check video_watch_tracking table has records
- Ensure video has duration set

---

## 📞 SUPPORT

**Documentation**: [VIDEO_QUESTION_FEATURE_IMPLEMENTATION.md](./VIDEO_QUESTION_FEATURE_IMPLEMENTATION.md)

**API Endpoints**:
- Upload: `POST /videos/question/upload`
- Track: `POST /public/videos/question/track-progress`
- Get Progress: `POST /public/videos/question/get-progress`

**Database Tables**:
- `questions` (updated with video fields)
- `video_watch_tracking` (new table)

**Files to Complete**:
- `frontend/app/questionnaires/create/page.tsx` (config UI)
- `frontend/components/VideoPlayerWithTracking.tsx` (new)
- `frontend/app/activities/take/[id]/page.tsx` (integration)
- `frontend/app/activities/[id]/results/page.tsx` (reporting)

---

**Implementation Progress**: 60% Complete  
**Estimated Completion**: 10-13 hours remaining  
**Contact**: Development Team
