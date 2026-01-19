# Slider Scale Image Display - Complete Testing Guide

## Date: 17 January 2026

## Changes Made

### 1. Updated Type Definitions
**File:** `frontend/components/questions/index.ts`
- Added `useCustomImages?: boolean` to `SliderScaleSettings`
- Added `customImages` object with:
  - `thumbUrl?: string` - Custom thumb/handle image
  - `trackUrl?: string` - Background image displayed above slider
  - `backgroundUrl?: string` - Alternative field for background image

### 2. Updated SliderScale Component
**File:** `frontend/components/questions/SliderScale.tsx`
- Component now checks for image URL: `customImages?.backgroundUrl || customImages?.trackUrl`
- When image URL exists, it displays above the slider
- Image styling: `max-h-48` (max height 192px), full width, object-contain
- Image only shows for horizontal orientation

### 3. Fixed Tick Marks Display
- Limited maximum ticks to 11 to prevent overlap
- When more than 11 ticks would be shown, evenly distributes them
- Removes duplicates and ensures min/max values are included

## How It Works

### Component Logic
```typescript
const backgroundImageUrl = customImages?.backgroundUrl || customImages?.trackUrl || '';
const hasBackgroundImage = !!backgroundImageUrl;

// Image displays when:
// 1. backgroundImageUrl has a value
// 2. Orientation is horizontal (not vertical)
```

### Expected Settings Structure
```json
{
  "min": 0,
  "max": 100,
  "step": 6,
  "orientation": "horizontal",
  "showValue": true,
  "showTicks": true,
  "useCustomImages": true,
  "customImages": {
    "trackUrl": "https://bq-common.s3.ap-south-1.amazonaws.com/logos/Medinscribe_Logo_R.png"
  }
}
```

## Testing Steps

### Step 1: Edit Questionnaire
1. Navigate to Questionnaires → Select questionnaire (ID: 13)
2. Find the slider_scale question
3. Check "Use Custom Images" checkbox
4. In "Track Background" section:
   - Either upload an image (will upload to S3)
   - Or paste image URL directly
5. **IMPORTANT:** Click "Update Questionnaire" button at top/bottom
6. Wait for success notification

### Step 2: Verify Settings Saved
1. Refresh the questionnaire edit page
2. Check if image still appears in Track Background field
3. If image disappeared, settings weren't saved - repeat Step 1

### Step 3: Test Participant View
1. Open participant/preview link
2. **Do a hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Or open in **Incognito/Private window**
4. Image should display above the slider

### Step 4: Verify API Response
1. Open browser DevTools (F12)
2. Go to Network tab
3. Reload participant page
4. Find the questionnaire API request
5. Check Response → sections[0] → questions → find slider_scale
6. Verify `settings.customImages.trackUrl` contains the image URL

## Troubleshooting

### Image Not Displaying

#### Issue 1: Settings Not Saved
**Symptom:** Image shows in editor but not on participant page
**Solution:**
- Make sure you clicked "Update Questionnaire" button
- Check for any error messages after clicking save
- Verify image still appears after refreshing editor page

#### Issue 2: Browser Cache
**Symptom:** Old version of page showing
**Solution:**
- Hard refresh: Cmd+Shift+R or Ctrl+Shift+R
- Or use Incognito/Private window
- Or clear browser cache completely

#### Issue 3: Frontend Not Rebuilt
**Symptom:** Code changes not reflecting
**Solution:**
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
rm -rf .next
npm run build
```

#### Issue 4: Image URL Invalid
**Symptom:** Broken image icon shows
**Solution:**
- Test image URL in browser address bar
- Ensure URL is publicly accessible
- Check CORS settings if using external domain

## Test Image URLs

### Working Test URLs:
1. `https://bq-common.s3.ap-south-1.amazonaws.com/logos/Medinscribe_Logo_R.png`
2. Any publicly accessible image URL
3. S3 uploaded images from the S3ImageUpload component

## Expected Visual Result

When working correctly, participant page should show:
```
┌─────────────────────────────┐
│   [Background Image Here]   │  ← Image from trackUrl
│      (bottles, logo, etc)   │
└─────────────────────────────┘

LABEL START   ←──────────→   LABEL END

━━━━━━━━━━━●━━━━━━━━━━━━━━━━  ← Slider
0    6   12  18  ...   96  100   ← Ticks (max 11)

          Current Value: 60
```

## Files Modified

1. `/frontend/components/questions/index.ts` - Type definitions
2. `/frontend/components/questions/SliderScale.tsx` - Component logic
3. `/frontend/app/activities/take/[id]/page.tsx` - Removed debug logs

## Build Status

✓ Frontend built successfully
✓ TypeScript compilation passed
✓ No console errors
✓ Component ready for production

## Final Verification Checklist

- [x] SliderScaleSettings interface includes customImages
- [x] SliderScale component checks for trackUrl/backgroundUrl
- [x] Image renders above slider when URL exists
- [x] Tick marks limited to prevent overlap
- [x] Frontend built and deployed
- [ ] Settings saved to database (user action required)
- [ ] Image displays on participant page (requires saved settings)

## Notes

- The component prioritizes `backgroundUrl` over `trackUrl` if both exist
- Images only display in horizontal orientation
- Maximum image height is capped at 192px (12rem)
- Image maintains aspect ratio (object-contain)
- No image shown for vertical sliders

---

**Status:** Implementation Complete
**Action Required:** User must save questionnaire with image URL for it to display on participant page
