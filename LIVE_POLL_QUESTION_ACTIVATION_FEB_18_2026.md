# Live Poll Question Activation Feature

**Date:** February 18, 2026  
**Feature:** Manual Question Activation with Individual Timer (Poll Events Only)

## Overview

This feature enables administrators to manually control which question is active during live poll events. Instead of showing all questions at once, the admin can activate questions one at a time, optionally with a countdown timer.

## Key Features

1. **Manual Question Activation**: Admin can activate/deactivate individual questions
2. **Individual Timer Per Question**: Optional countdown timer (0-3600 seconds)
3. **Single Active Question Mode**: Activating one question auto-deactivates others
4. **Real-time Countdown**: Participants see live countdown timer
5. **Auto-expiry**: Questions become read-only when timer expires
6. **Poll Events Only**: Feature available exclusively for "Poll" type events

## Affected Roles

- Super Admin
- Admin
- Program Admin
- Program Manager
- Program Moderator

## Files Modified/Created

### Database Migration
- `backend/database/migrations/2026_02_18_000001_add_live_question_activation_fields.php`
  - Added `is_live_active` (boolean, default false)
  - Added `live_timer_seconds` (integer, nullable)
  - Added `live_activated_at` (timestamp, nullable)
  - Added index on `is_live_active`

### Backend API (Laravel)
- `backend/app/Http/Controllers/Api/ActivityController.php`
  - `getLiveQuestions()` - Get all questions with activation status
  - `activateLiveQuestion()` - Activate question with optional timer
  - `deactivateLiveQuestion()` - Deactivate single question
  - `updateLiveQuestionTimer()` - Update timer value
  - `deactivateAllLiveQuestions()` - Stop all live questions
  - `getActiveQuestion()` - Public endpoint for participants

### Backend Routes
- `backend/routes/api.php`
  - Protected routes (role-based middleware):
    - `GET /activities/{id}/live-questions`
    - `POST /activities/{id}/live-questions/{questionId}/activate`
    - `POST /activities/{id}/live-questions/{questionId}/deactivate`
    - `PATCH /activities/{id}/live-questions/{questionId}/timer`
    - `POST /activities/{id}/live-questions/deactivate-all`
  - Public route (no auth):
    - `GET /activities/{id}/active-question`

### Frontend API Functions
- `frontend/lib/api.ts`
  - `liveQuestionsApi.getLiveQuestions()`
  - `liveQuestionsApi.activateLiveQuestion()`
  - `liveQuestionsApi.deactivateLiveQuestion()`
  - `liveQuestionsApi.updateLiveQuestionTimer()`
  - `liveQuestionsApi.deactivateAllLiveQuestions()`
  - `getActiveQuestion()` (public standalone function)

### Frontend Components
- `frontend/components/question-activation-panel.tsx` (NEW - ~390 lines)
  - Modal panel for admin to control live questions
  - Question list with activation status
  - Timer input fields
  - Activate/Deactivate buttons
  - Real-time countdown display
  - Single Active Question Mode indicator

### Frontend Pages
- `frontend/app/activities/page.tsx`
  - Added `Zap` icon import
  - Added `QuestionActivationPanel` import
  - Added `questionActivationPanel` state
  - Added Zap button in Actions column (visible for Poll events only)
  - Added QuestionActivationPanel modal render

- `frontend/app/activities/take/[id]/page.tsx`
  - Added `Clock`, `Timer` icon imports
  - Added `getActiveQuestion` import
  - Added live poll state: `livePollMode`, `activeQuestion`, `liveQuestionTimer`, `waitingForQuestion`
  - Added polling useEffect (checks active question every 5 seconds)
  - Added timer countdown useEffect
  - Added live poll question rendering section

## User Flow

### Admin Flow
1. Navigate to Activities page
2. Find a Poll type event
3. Click the Zap (⚡) icon in Actions column
4. Question Activation Panel opens
5. Set optional timer (in seconds) for each question
6. Click "Activate" to make a question live
7. Previously active question is automatically deactivated
8. Click "Deactivate All" to stop the live session

### Participant Flow
1. Open poll event link
2. If admin has activated a question:
   - See only the active question
   - See countdown timer (if set)
   - Submit answer before timer expires
   - After submission, see poll results
   - Wait for next question
3. If no question is active:
   - See "Waiting for Next Question" message
   - Page auto-refreshes every 5 seconds

## API Response Formats

### Get Live Questions Response
```json
{
  "activity_id": "123",
  "activity_name": "Live Poll Event",
  "activity_type": "poll",
  "questions": [
    {
      "id": "q1",
      "title": "Which option do you prefer?",
      "type": "single_choice",
      "order": 1,
      "section_name": "Section 1",
      "is_live_active": true,
      "live_timer_seconds": 60,
      "live_activated_at": "2026-02-18T10:30:00Z"
    }
  ]
}
```

### Get Active Question Response (Participant)
```json
{
  "activity_id": "123",
  "activity_name": "Live Poll Event",
  "active_question": {
    "id": "q1",
    "title": "Which option do you prefer?",
    "formattedQuestion": "<p>Which option do you prefer?</p>",
    "type": "single_choice",
    "options": ["Option A", "Option B", "Option C"],
    "remaining_time": 45,
    "is_expired": false,
    "question_number": 1
  }
}
```

## Deployment Steps

### 1. Run Database Migration
```bash
ssh user@production-server
cd /var/www/QSightsOrg2.0/backend
php artisan migrate --force
```

### 2. Deploy Backend
```bash
# Copy ActivityController.php changes
scp backend/app/Http/Controllers/Api/ActivityController.php user@server:/var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/

# Copy routes/api.php changes
scp backend/routes/api.php user@server:/var/www/QSightsOrg2.0/backend/routes/

# Restart PHP-FPM
ssh user@server "sudo systemctl restart php8.4-fpm"
```

### 3. Deploy Frontend
```bash
# Build
cd frontend
npm run build

# Copy build files
scp -r .next user@server:/var/www/frontend/

# Copy new component
scp components/question-activation-panel.tsx user@server:/var/www/frontend/components/

# Copy updated api.ts
scp lib/api.ts user@server:/var/www/frontend/lib/

# Restart frontend
ssh user@server "cd /var/www/frontend && pm2 restart frontend"
```

## Testing Checklist

- [ ] Create a Poll type event
- [ ] Open Question Activation Panel (Zap icon)
- [ ] Set timer for a question (e.g., 60 seconds)
- [ ] Activate the question
- [ ] Open participant view in another browser
- [ ] Verify only active question is shown
- [ ] Verify countdown timer is displayed
- [ ] Submit answer before timer expires
- [ ] Verify answer is recorded and results are shown
- [ ] Let timer expire without answering
- [ ] Verify "Time is up!" message appears
- [ ] Activate a different question
- [ ] Verify previous question is deactivated
- [ ] Click "Deactivate All"
- [ ] Verify participant sees "Waiting for Next Question"

## Rollback Procedure

### Revert Database
```sql
ALTER TABLE questions DROP COLUMN IF EXISTS is_live_active;
ALTER TABLE questions DROP COLUMN IF EXISTS live_timer_seconds;
ALTER TABLE questions DROP COLUMN IF EXISTS live_activated_at;
```

### Restore Previous Files
Use git to restore previous versions of:
- `backend/app/Http/Controllers/Api/ActivityController.php`
- `backend/routes/api.php`
- `frontend/lib/api.ts`
- `frontend/app/activities/page.tsx`
- `frontend/app/activities/take/[id]/page.tsx`

Remove new files:
- `backend/database/migrations/2026_02_18_000001_add_live_question_activation_fields.php`
- `frontend/components/question-activation-panel.tsx`

## Notes

- The active question polling interval is 5 seconds. This can be adjusted if needed.
- Maximum timer value is 3600 seconds (1 hour).
- The feature only affects Poll type events. Survey and Assessment events are unchanged.
- Participants do not need to be logged in to see active questions (public endpoint).
