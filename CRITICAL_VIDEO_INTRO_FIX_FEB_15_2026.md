# CRITICAL FIX: Video Intro Not Playing on Take Activity Page

**Date:** February 15, 2026  
**Status:** ✅ RESOLVED  
**Priority:** CRITICAL (Client Demo Blocker)

---

## Problem Summary

Video intro on the "Take Activity" page (`/activities/take/[id]`) was visible but would not play when clicking the play button. The video question type worked correctly, but the intro video feature was broken.

---

## Symptoms

1. Video thumbnail/player visible on page
2. Clicking play button does nothing or video briefly starts then stops
3. Console error: `"The play() request was interrupted because the media was removed from the document"`
4. Video metadata loads successfully (duration detected)
5. Presigned URLs generated correctly

---

## Root Cause Analysis

### Issue 1: Missing Public Presigned URL Endpoint

The S3 bucket (`qsights`) is **private** and requires presigned URLs for video access. The take activity page is **public** (no authentication), but the presigned URL endpoint required authentication.

**Solution:** Added public route `/api/public/s3/view-url` in backend.

### Issue 2: React Component Remounting (PRIMARY CAUSE)

The `VideoPlayer.tsx` component had a nested function component `VideoContent` defined inside the main component:

```tsx
// ❌ BAD - Function recreated on every render
const VideoContent = () => {
  return (
    <div>
      <video ref={videoRef} ... />
    </div>
  );
};

return <VideoContent />;
```

**Why this breaks video playback:**
- React sees `VideoContent` as a "new" component on every render (new function reference)
- React unmounts the old video element and mounts a new one
- Any `play()` call gets interrupted because the element is removed from DOM
- This causes the error: `"The play() request was interrupted because the media was removed from the document"`

---

## Solution

### Fix 1: Backend Public Route

**File:** `backend/routes/api.php`

Added inside the public group (around line 518):
```php
Route::post("s3/view-url", [S3UploadController::class, "getViewUrl"]);
```

### Fix 2: Frontend VideoPlayer Component (CRITICAL)

**File:** `frontend/components/VideoPlayer.tsx`

Changed from nested function to JSX variable:

```tsx
// ✅ GOOD - Stable JSX variable, not recreated on render
const videoContentJsx = (
  <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
    <video
      ref={videoRef}
      src={presignedVideoUrl!}
      poster={thumbnailUrl}
      playsInline
      preload="auto"
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      ...
    />
    {/* Controls */}
  </div>
);

// Use JSX variable directly, not as component
return videoContentJsx;  // ✅ Correct
// NOT: return <VideoContent />;  // ❌ Wrong
```

### Fix 3: Frontend S3 Utils

**File:** `frontend/lib/s3Utils.ts`

Added `getPresignedUrlPublic()` function that calls the public endpoint without authentication:

```typescript
export async function getPresignedUrlPublic(s3Url: string): Promise<string | null> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';
  
  const response = await fetch(`${API_BASE_URL}/public/s3/view-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: s3Key }),
  });
  
  // Returns presigned URL valid for 1 hour
}
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/routes/api.php` | Added public S3 presigned URL route |
| `frontend/lib/s3Utils.ts` | Added `getPresignedUrlPublic()` function |
| `frontend/components/VideoPlayer.tsx` | **CRITICAL:** Changed `VideoContent` function to `videoContentJsx` variable |

---

## Why VideoPlayerWithTracking Works

The `VideoPlayerWithTracking.tsx` component (used for video questions) works because it renders the video element **directly** in the return statement, not through a nested function:

```tsx
// VideoPlayerWithTracking.tsx - Works correctly
return (
  <div className="space-y-3">
    <div className="relative rounded-lg overflow-hidden bg-black group">
      <video
        ref={videoRef}
        src={presignedVideoUrl}
        ...
      />
      {/* Controls directly in JSX */}
    </div>
  </div>
);
```

---

## Debugging Checklist for Future Video Issues

### 1. Check Console for Errors
```
"The play() request was interrupted because the media was removed from the document"
```
**Cause:** Component remounting issue. Check for nested function components.

### 2. Check Network Tab
- Is presigned URL being fetched? (Look for `/api/public/s3/view-url` or `/api/uploads/s3/view-url`)
- Is response 200 with valid URL?
- Does presigned URL return video content (not 403)?

### 3. Check Video Element
```javascript
// In browser console
document.querySelector('video').src  // Should have presigned URL with X-Amz-Signature
document.querySelector('video').readyState  // Should be >= 2 (HAVE_CURRENT_DATA)
```

### 4. Check for Nested Function Components
Search for patterns like:
```tsx
// ❌ BAD patterns that cause remounting
const SomeContent = () => { return <video ... /> };
function InnerComponent() { return <video ... /> }
```

Convert to:
```tsx
// ✅ GOOD - Use JSX variables
const someContentJsx = ( <video ... /> );
```

---

## Deployment Commands

```bash
# 1. Upload VideoPlayer.tsx to server
scp -i "path/to/pem" frontend/components/VideoPlayer.tsx ubuntu@13.126.210.220:/tmp/

# 2. Copy to frontend directory
ssh -i "path/to/pem" ubuntu@13.126.210.220 "sudo cp /tmp/VideoPlayer.tsx /var/www/frontend/components/"

# 3. Rebuild frontend
ssh -i "path/to/pem" ubuntu@13.126.210.220 "cd /var/www/frontend && sudo npm run build"

# 4. Restart frontend
ssh -i "path/to/pem" ubuntu@13.126.210.220 "cd /var/www/frontend && sudo pkill -f 'next-server'; sleep 2; sudo nohup npm start > /tmp/frontend.log 2>&1 &"

# 5. Verify frontend is running
ssh -i "path/to/pem" ubuntu@13.126.210.220 "ps aux | grep 'next-server'"
```

---

## Test URLs

- **Intro Video Activity:** https://prod.qsights.com/activities/take/a115e735-4a87-4c19-965d-4ae4227107f7
- **Video Question Activity:** https://prod.qsights.com/activities/take/a10e5460-cff2-4ad4-b79a-cabdc2727521

---

## Key Takeaways

1. **Never define React components as functions inside other components** - they get recreated on every render
2. **Use JSX variables instead of nested components** for complex UI that includes refs (like video players)
3. **S3 private buckets require presigned URLs** - ensure public pages have access to unauthenticated endpoint
4. **Browser autoplay policies** - always start videos muted for autoplay, or require user interaction

---

## Related Documentation

- [VIDEO_QUESTION_FIX_FEB_12_2026.md](VIDEO_QUESTION_FIX_FEB_12_2026.md) - Video question type implementation
- [PRODUCTION_DEPLOYMENT_VIDEO_FIX_FEB_12_2026.md](PRODUCTION_DEPLOYMENT_VIDEO_FIX_FEB_12_2026.md) - Previous video deployment

---

**Resolution confirmed:** February 15, 2026 at 15:21 UTC
