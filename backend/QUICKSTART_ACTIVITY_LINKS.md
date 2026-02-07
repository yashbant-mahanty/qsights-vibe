# 🚀 Quick Start Guide - Activity Links Feature

## What's New?

In the Activities table, the **Preview** button has been replaced with a **Links** button that provides three types of shareable links:

1. **Registration Link** - For participants to register
2. **Direct Link** - Direct access (requires login)  
3. **Anonymous Link** - Guest access without registration

---

## 📦 Files Added/Modified

### Backend
- ✅ `/app/Http/Controllers/Api/ActivityController.php` - Added `getActivityLinks()` method
- ✅ `/routes/api.php` - Added `GET /api/activities/{id}/links` route

### Frontend Component
- ✅ `/FRONTEND_COMPONENTS/ActivityLinksMenu.jsx` - New React component

### Documentation
- ✅ `/ACTIVITY_LINKS_FEATURE.md` - Complete feature documentation
- ✅ `/test_activity_links.sh` - Test script

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Configure Backend

Add to `.env`:
```env
FRONTEND_URL=http://localhost:3000
```

Restart Laravel:
```bash
php artisan config:clear
php artisan serve
```

### Step 2: Copy Frontend Component

```bash
# Copy the component to your frontend project
cp FRONTEND_COMPONENTS/ActivityLinksMenu.jsx /path/to/Qsights2.0/src/components/activities/
```

### Step 3: Replace Preview Button

In your activities page component, replace the preview button:

**Old:**
```jsx
<button onClick={() => handlePreview(activity.id)}>
  <Eye className="w-4 h-4" />
  Preview
</button>
```

**New:**
```jsx
import ActivityLinksMenu from '@/components/activities/ActivityLinksMenu';

<ActivityLinksMenu 
  activityId={activity.id}
  authToken={getAuthToken()}
/>
```

---

## 🧪 Test It

### Backend Test
```bash
./test_activity_links.sh
```

**Or manually:**
```bash
curl -X GET "http://localhost:8000/api/activities/{id}/links" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Test
1. Open activities page
2. Click "Links" button
3. See 3 link types with copy buttons
4. Click copy icon to copy URL
5. Paste URL in browser to test

---

## 🎯 Expected API Response

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

## 📸 Visual Reference

**Button in Actions Column:**
```
┌─────────────────────────────────────────┐
│ Actions                                 │
├─────────────────────────────────────────┤
│  [Links ⚡]  [Edit]  [Results]  [Delete]│
└─────────────────────────────────────────┘
```

**Dropdown Menu When Clicked:**
```
┌────────────────────────────────────────────┐
│ Activity Links                             │
│ Copy and share these links                 │
├────────────────────────────────────────────┤
│ 👤 Registration Link               [📋]   │
│    For participants to register            │
│    http://localhost:3000/public/...        │
├────────────────────────────────────────────┤
│ 🔐 Direct Link                     [📋]   │
│    Direct access (requires login)          │
│    http://localhost:3000/activities/...    │
├────────────────────────────────────────────┤
│ 👥 Anonymous Link                  [📋]   │
│    Guest access without registration       │
│    http://localhost:3000/public/...        │
├────────────────────────────────────────────┤
│ 💡 Share these links with participants     │
└────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Backend Issues

**Problem:** Route not found
```bash
# Clear route cache
php artisan route:clear
php artisan route:list | grep links
```

**Problem:** Links show wrong URL
```bash
# Check .env has FRONTEND_URL set
cat .env | grep FRONTEND_URL

# Clear config cache
php artisan config:clear
```

### Frontend Issues

**Problem:** Component not rendering
- Check import path
- Verify activityId is passed
- Check authToken is valid
- Look for console errors (F12)

**Problem:** API returns 401
- Token expired or invalid
- Check token retrieval function
- Verify user is logged in

---

## 📚 Link Types Explained

### 1. Registration Link
**Use:** Send to new participants
**Flow:** Click → Register with form → Access activity
**Example:** Email invitations, social media posts

### 2. Direct Link  
**Use:** Share with logged-in users
**Flow:** Click → Login (if needed) → Access activity
**Example:** Internal team communications

### 3. Anonymous Link
**Use:** Public surveys (if allow_guests = true)
**Flow:** Click → Instant access (no login)
**Example:** Public feedback forms, anonymous surveys

---

## ✅ Checklist

Before going live, verify:

- [ ] `.env` has `FRONTEND_URL` set
- [ ] Backend route responds with 200
- [ ] Frontend component shows 3 links
- [ ] Copy to clipboard works
- [ ] Registration link opens registration form
- [ ] Direct link redirects to activity
- [ ] Anonymous link works (if guests enabled)

---

## 📞 Need Help?

1. **Check documentation:** `ACTIVITY_LINKS_FEATURE.md`
2. **Run test script:** `./test_activity_links.sh`
3. **Check Laravel logs:** `tail -f storage/logs/laravel.log`
4. **Check browser console:** F12 → Console tab

---

## 🎉 You're Done!

The feature is now ready to use. Users can:
- ✅ Click "Links" button in activities table
- ✅ See 3 types of shareable links
- ✅ Copy any link with one click
- ✅ Share with participants

**Happy sharing! 🔗**
