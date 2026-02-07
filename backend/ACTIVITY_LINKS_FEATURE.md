# Activity Links Feature - Complete Documentation

## 📋 Overview

This feature replaces the "Preview" button in the Activities table with an "Activity Links" button that provides three types of shareable links:

1. **Registration Link** - For participants to register with custom fields
2. **Direct Link** - Direct access to activity (requires login)
3. **Anonymous Link** - Guest access without registration

---

## 🎯 What Was Changed

### Backend Changes

#### 1. New API Endpoint
**File:** `/app/Http/Controllers/Api/ActivityController.php`

**New Method Added:**
```php
public function getActivityLinks($id)
{
    $activity = Activity::findOrFail($id);
    
    $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
    
    return response()->json([
        'links' => [
            'registration' => [
                'url' => "{$frontendUrl}/public/activities/{$activity->id}/register",
                'label' => 'Registration Link',
                'description' => 'For participants to register with custom fields'
            ],
            'direct' => [
                'url' => "{$frontendUrl}/activities/take/{$activity->id}",
                'label' => 'Direct Link',
                'description' => 'Direct access to activity (requires login)'
            ],
            'anonymous' => [
                'url' => "{$frontendUrl}/public/activities/{$activity->id}",
                'label' => 'Anonymous Link',
                'description' => 'Guest access without registration'
            ]
        ],
        'activity' => [
            'id' => $activity->id,
            'name' => $activity->name,
            'allow_guests' => $activity->allow_guests
        ]
    ]);
}
```

#### 2. New API Route
**File:** `/routes/api.php`

**Route Added:**
```php
Route::get('/activities/{id}/links', [ActivityController::class, 'getActivityLinks']);
```

**Full Endpoint:**
```
GET /api/activities/{activityId}/links
```

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "links": {
    "registration": {
      "url": "http://localhost:3000/public/activities/abc-123/register",
      "label": "Registration Link",
      "description": "For participants to register with custom fields"
    },
    "direct": {
      "url": "http://localhost:3000/activities/take/abc-123",
      "label": "Direct Link",
      "description": "Direct access to activity (requires login)"
    },
    "anonymous": {
      "url": "http://localhost:3000/public/activities/abc-123",
      "label": "Anonymous Link",
      "description": "Guest access without registration"
    }
  },
  "activity": {
    "id": "abc-123",
    "name": "Customer Satisfaction Survey",
    "allow_guests": true
  }
}
```

---

### Frontend Changes

#### 3. New React Component
**File:** `/FRONTEND_COMPONENTS/ActivityLinksMenu.jsx`

**Features:**
- Click to open dropdown menu
- Three link types with icons
- One-click copy to clipboard
- Visual feedback when copied (checkmark)
- Responsive design
- Error handling
- Loading states

**Component Props:**
```jsx
<ActivityLinksMenu 
  activityId="uuid"           // Required: Activity UUID
  authToken="bearer_token"    // Required: Auth token
  apiUrl="http://..."         // Optional: API base URL
/>
```

---

## 🚀 Integration Steps

### Step 1: Configure Environment Variable

Add to `.env` file:
```env
FRONTEND_URL=http://localhost:3000
```

**For Production:**
```env
FRONTEND_URL=https://yourdomain.com
```

### Step 2: Install Frontend Component

Copy the component file:
```bash
cp FRONTEND_COMPONENTS/ActivityLinksMenu.jsx /path/to/frontend/src/components/activities/
```

### Step 3: Replace Preview Button in Activities Table

**Before (Old Preview Button):**
```jsx
<button onClick={() => handlePreview(activity.id)}>
  <Eye className="w-4 h-4" />
  Preview
</button>
```

**After (New Links Button):**
```jsx
import ActivityLinksMenu from '@/components/activities/ActivityLinksMenu';

// In your activities table, replace the preview button with:
<ActivityLinksMenu 
  activityId={activity.id}
  authToken={getAuthToken()} // Your auth token function
  apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}
/>
```

### Step 4: Example Integration in Activities Page

**File:** `app/activities/page.tsx` or your activities list component

```jsx
'use client';

import { useState, useEffect } from 'react';
import ActivityLinksMenu from '@/components/activities/ActivityLinksMenu';
import { Edit, Trash, BarChart } from 'lucide-react';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  
  const getAuthToken = () => {
    // Your token retrieval logic
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('backendToken='))
      ?.split('=')[1];
    return token;
  };

  return (
    <div className="activities-table">
      <table>
        <thead>
          <tr>
            <th>Activity Name</th>
            <th>Status</th>
            <th>Participants</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map(activity => (
            <tr key={activity.id}>
              <td>{activity.name}</td>
              <td>{activity.status}</td>
              <td>{activity.participants_count}</td>
              <td>
                <div className="flex gap-2">
                  {/* NEW: Activity Links Button */}
                  <ActivityLinksMenu 
                    activityId={activity.id}
                    authToken={getAuthToken()}
                  />
                  
                  {/* Existing action buttons */}
                  <button onClick={() => handleEdit(activity.id)}>
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleViewResults(activity.id)}>
                    <BarChart className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(activity.id)}>
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🎨 UI/UX Details

### Button Appearance
- **Icon:** Link2 icon from Lucide React
- **Text:** "Links"
- **Style:** Gray outline button with hover effect
- **Loading State:** Shows "Loading..." text

### Dropdown Menu
- **Position:** Absolute, right-aligned below button
- **Width:** 320px (80 rem)
- **Shadow:** Large shadow with border
- **Backdrop:** Click outside to close

### Each Link Item Shows:
1. **Icon** (left side)
   - Registration: UserPlus icon
   - Direct: LogIn icon
   - Anonymous: Users icon

2. **Content** (middle)
   - Bold label
   - Description text
   - URL in monospace font

3. **Copy Button** (right side)
   - Copy icon (default)
   - Check icon (after copying, 2 seconds)

---

## 🔗 Link Types Explained

### 1. Registration Link
**URL Pattern:** `/public/activities/{id}/register`

**Purpose:** Allows participants to register with custom form fields defined in the activity.

**Use Case:** 
- Send in invitation emails
- Share on social media
- Embed in website

**User Experience:**
1. User clicks link
2. Sees registration form with custom fields
3. Fills out form (name, email, + custom fields)
4. Gets registered as participant
5. Can start activity

---

### 2. Direct Link
**URL Pattern:** `/activities/take/{id}`

**Purpose:** Direct access for already logged-in users.

**Use Case:**
- Share with team members
- Use in internal communications
- Quick access for authenticated users

**User Experience:**
1. User clicks link
2. If not logged in → redirected to login
3. After login → taken directly to activity
4. Can start responding immediately

---

### 3. Anonymous Link
**URL Pattern:** `/public/activities/{id}`

**Purpose:** Guest access without registration (if `allow_guests` is enabled).

**Use Case:**
- Public surveys
- Feedback forms
- Anonymous responses

**User Experience:**
1. User clicks link
2. No login or registration required
3. Can start activity immediately
4. Response recorded as guest

**Note:** This link only works if `activity.allow_guests = true`

---

## 🧪 Testing Guide

### Test Backend Endpoint

```bash
# Get activity links
curl -X GET "http://localhost:8000/api/activities/{activityId}/links" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "links": {
    "registration": { ... },
    "direct": { ... },
    "anonymous": { ... }
  },
  "activity": { ... }
}
```

### Test Frontend Component

1. **Open Activities Page**
   - Navigate to activities list
   - Look for "Links" button in Actions column

2. **Click Links Button**
   - Should open dropdown menu
   - Should show 3 link types
   - Each with icon, label, description, URL

3. **Test Copy Functionality**
   - Click copy icon on any link
   - Icon should change to checkmark
   - After 2 seconds, icon reverts to copy
   - Paste in notepad to verify URL copied

4. **Test Each Link Type**
   - Copy Registration Link → Open in new tab → Should see registration form
   - Copy Direct Link → Open in new tab → Should redirect to login or activity
   - Copy Anonymous Link → Open in new tab → Should access activity directly

5. **Test Close Behavior**
   - Click outside dropdown → Should close
   - Click Links button again → Should reopen without re-fetching

---

## 🛠️ Customization Options

### Change Link URLs

Edit the backend method to customize URL patterns:

```php
public function getActivityLinks($id)
{
    // ...
    'registration' => [
        'url' => "{$frontendUrl}/custom/path/{$activity->id}",
        // ...
    ],
    // ...
}
```

### Add More Link Types

```php
'custom_link' => [
    'url' => "{$frontendUrl}/custom/{$activity->id}",
    'label' => 'Custom Link',
    'description' => 'Your custom link description'
]
```

### Customize Button Style

```jsx
<button
  onClick={fetchLinks}
  className="your-custom-classes"
>
  <YourIcon />
  Your Text
</button>
```

### Change Dropdown Position

```jsx
// Change from right-aligned to left-aligned
<div className="absolute left-0 z-50 ...">
```

---

## 📱 Mobile Responsiveness

The component is responsive:
- Dropdown width: 320px (fits mobile screens)
- URLs truncate with ellipsis if too long
- Touch-friendly button sizes (44px min height)
- Backdrop closes dropdown on mobile

---

## ⚠️ Important Notes

### Security
- All endpoints require authentication
- Links are public but activity access may be restricted
- Anonymous links only work if `allow_guests = true`

### Performance
- Links are fetched only once (cached in state)
- Subsequent opens don't re-fetch
- Minimal API calls

### Error Handling
- Network errors show error message below button
- Invalid activity ID returns 404
- Missing token returns 401

---

## 🐛 Troubleshooting

### Links Button Not Showing
**Issue:** Component not rendering

**Solution:**
- Check import path is correct
- Verify activityId and authToken are passed
- Check console for errors

### API Returns 404
**Issue:** Activity not found

**Solution:**
- Verify activity ID is correct UUID
- Check activity exists in database
- Ensure not soft-deleted

### Copy Not Working
**Issue:** Clipboard API fails

**Solution:**
- Use HTTPS (clipboard API requires secure context)
- For localhost, HTTP is allowed
- Check browser permissions

### Links Show Wrong URL
**Issue:** FRONTEND_URL not set

**Solution:**
- Add `FRONTEND_URL` to `.env`
- Restart Laravel server
- Clear config cache: `php artisan config:clear`

---

## 📚 Dependencies

### Frontend
- React 18+
- Lucide React (for icons)
- Tailwind CSS (for styling)

**Install Icons:**
```bash
npm install lucide-react
```

### Backend
- Laravel 11+
- Sanctum authentication
- Activity model with UUID

---

## 🎉 Summary

This feature provides a user-friendly way to share activity links:

✅ **Backend:** New API endpoint to generate three types of links
✅ **Frontend:** Beautiful dropdown menu component
✅ **UX:** One-click copy with visual feedback
✅ **Flexible:** Works with registration, direct, and anonymous access
✅ **Secure:** Authenticated endpoint, public links as needed
✅ **Responsive:** Works on mobile and desktop

**Replace Preview → Use Links! 🔗**
