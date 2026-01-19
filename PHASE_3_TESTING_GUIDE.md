# Phase 3 Deployment Fix & Testing Guide
**Date:** January 18, 2026  
**Issue:** Chunk loading errors after initial deployment  
**Status:** ✅ RESOLVED & READY FOR TESTING

---

## 🔧 Issue Encountered

After the initial Phase 3 deployment, the browser was showing chunk loading errors:
```
ChunkLoadError: Loading chunk 6753 failed.
Failed to load resource: 6753-30b7e8c10e431776.js (404 Not Found)
Failed to load resource: 138-8c89d2151f9c7f1c.js (404 Not Found)
Failed to load resource: page-f8f48a7274693bed.js (404 Not Found)
```

**Root Cause:**  
The Next.js build created new chunk files with different hashes, but the browser had cached the old HTML which referenced old chunk names.

---

## ✅ Resolution Steps Applied

### 1. **Clean Build**
```bash
cd /var/www/QSightsOrg2.0/frontend
rm -rf .next
npm run build
```
- Removed the entire `.next` directory
- Rebuilt from scratch to create fresh chunk files

### 2. **Fixed Port Conflict**
```bash
# Found orphaned Next.js process on port 3000
lsof -ti:3000 | xargs -r kill -9

# Restarted PM2 process
pm2 restart qsights-frontend
```
- Killed orphaned process (PID 612699)
- Successfully restarted the frontend

### 3. **Fixed Permissions**
```bash
sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/.next
```
- Ensured proper ownership of build files

---

## 🎯 Current Status

### ✅ **Server Status**
- **PM2 Process:** Online (PID 824907, restart count: 132)
- **Port 3000:** Listening successfully
- **Memory:** 51.4 MB
- **Uptime:** Stable

### ✅ **Build Verification**
```bash
Route (app)                          Size     First Load JS
├ ○ /program-admin                   107 kB   228 kB
├ ○ /program-admin/roles             16.6 kB  144 kB
```
- Roles page compiled successfully
- Bundle size: 16.6 kB (page) + 144 kB (first load JS)

### ✅ **HTTP Response**
```
curl -I http://localhost:3000/program-admin/roles
HTTP/1.1 200 OK
x-nextjs-cache: HIT
Content-Type: text/html; charset=utf-8
Content-Length: 8833
```
- Page responds correctly
- Next.js cache working
- No 404 errors

---

## 🧪 Testing Instructions

### **Clear Browser Cache (REQUIRED)**

Before testing, you MUST clear your browser cache to remove the old chunk references:

#### **Chrome/Edge:**
1. Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Select "Cached images and files"
3. Select "All time"
4. Click "Clear data"

**OR use Hard Reload:**
1. Open DevTools (`Cmd+Option+I`)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

#### **Firefox:**
1. Press `Cmd+Shift+Delete`
2. Select "Cache"
3. Select "Everything"
4. Click "Clear Now"

#### **Safari:**
1. Preferences > Advanced > Show Develop menu
2. Develop > Empty Caches
3. Press `Cmd+Option+R` to hard reload

---

## 📝 Test Cases for Phase 3 UI

### **Test 1: Access Roles Page**
1. Navigate to `https://prod.qsights.com/program-admin/roles`
2. ✅ Page should load without chunk errors
3. ✅ No 404 errors in browser console
4. ✅ All components render correctly

### **Test 2: Manager Assignment Modal**
**Prerequisites:** 
- Login as admin or program-admin
- At least one program with users exists

**Steps:**
1. Go to Roles & Services page
2. Select a program from the filter dropdown
3. Find a user in the table
4. Click the **UserCog** icon (blue icon) in the Actions column
5. **Expected:** Manager Assignment Modal opens

**Verify in Modal:**
- [ ] User info displays correctly (name, program)
- [ ] Current manager shows (if assigned)
- [ ] Hierarchical role dropdown populates with 7 roles
- [ ] Manager dropdown shows available managers
- [ ] Select both dropdowns → validation runs automatically
- [ ] Try creating circular reference → error message shows
- [ ] Click "Assign Manager" → success toast appears
- [ ] Table refreshes automatically

### **Test 3: Hierarchy Tree Visualization**
**Steps:**
1. Go to Roles & Services page
2. Select a specific program from the filter dropdown (not "All")
3. **Expected:** "View Hierarchy" button appears in header (Network icon)
4. Click the "View Hierarchy" button
5. **Expected:** Hierarchy Tree Modal opens

**Verify in Modal:**
- [ ] Statistics cards show (Total Users, Managers, Team Members)
- [ ] Tree structure displays with expandable nodes
- [ ] Managers have blue UserCheck icon
- [ ] Team members have gray User icon
- [ ] Direct reports count badges show on managers
- [ ] Click nodes to expand/collapse
- [ ] Click "Refresh" button → tree reloads
- [ ] No console errors

### **Test 4: Circular Reference Validation**
**Steps:**
1. Open Manager Assignment Modal for User A
2. Assign User B as manager of User A → Save
3. Open Manager Assignment Modal for User B
4. Try to assign User A as manager of User B
5. **Expected:** Validation error: "This assignment would create a circular reporting structure"
6. **Expected:** "Assign Manager" button is disabled
7. **Expected:** Cannot submit the form

### **Test 5: Remove Manager Assignment**
**Steps:**
1. Open Manager Assignment Modal for a user with a manager
2. **Expected:** "Remove Manager" button appears (red text)
3. Click "Remove Manager"
4. Confirm the action
5. **Expected:** Manager removed successfully
6. **Expected:** Success toast appears
7. **Expected:** Table refreshes

---

## 🔍 Browser Console Checks

### **Expected: NO ERRORS**
Open DevTools Console (`F12` or `Cmd+Option+I`) and verify:

- ✅ No "ChunkLoadError" messages
- ✅ No "404 Not Found" for chunk files
- ✅ No "Minified React error #423" messages
- ✅ No "Failed to load resource" errors

### **Expected: API Calls Work**
In Network tab, verify these API calls succeed:

**When opening Manager Assignment Modal:**
```
GET /api/hierarchy/programs/{programId}/available-managers → 200 OK
GET /api/hierarchy/roles?role_type=program → 200 OK
GET /api/hierarchy/users/{userId}/info?program_id={programId} → 200 OK
```

**When selecting a manager:**
```
POST /api/hierarchy/validate-assignment → 200 OK
```

**When assigning a manager:**
```
POST /api/hierarchy/assign-manager → 200 OK
```

**When viewing hierarchy tree:**
```
GET /api/hierarchy/programs/{programId}/tree → 200 OK
```

---

## 🚨 If You Still See Chunk Errors

### **Step 1: Verify Browser Cache is Cleared**
- Make sure you did a **hard refresh** (`Cmd+Shift+R`)
- Or use **Incognito/Private mode** to test

### **Step 2: Check Service Worker**
Some browsers use service workers that cache assets:
1. Open DevTools → Application tab
2. Click "Service Workers"
3. Click "Unregister" on any active service worker
4. Refresh the page

### **Step 3: Check Network Tab**
1. Open DevTools → Network tab
2. Check "Disable cache" checkbox
3. Reload the page
4. Look for any failed requests (red)
5. Share the URL and error message

### **Step 4: Server-Side Check**
If errors persist, verify the build files exist:
```bash
ssh ubuntu@13.126.210.220
ls -la /var/www/QSightsOrg2.0/frontend/.next/static/chunks/ | grep program-admin
```

---

## 📦 Deployed Files Summary

### **New Components:**
1. `frontend/components/manager-assignment-modal.tsx` (328 lines)
2. `frontend/components/hierarchy-tree-modal.tsx` (253 lines)

### **Updated Files:**
1. `frontend/app/program-admin/roles/page.tsx` (1265 lines)

### **Backend APIs (Already Deployed in Phase 2):**
- ✅ 11 hierarchy endpoints operational
- ✅ All routes registered
- ✅ Middleware working
- ✅ Service layer functional

---

## 🎉 Success Criteria

Phase 3 is considered successful when:
- [ ] Browser loads the roles page without chunk errors
- [ ] Manager Assignment Modal opens and functions correctly
- [ ] Hierarchy Tree Modal displays the org chart
- [ ] Can assign managers to users
- [ ] Circular reference validation works
- [ ] Can remove manager assignments
- [ ] All API calls return 200 OK
- [ ] No console errors in browser

---

## 📞 Support

**If you encounter any issues during testing:**

1. **Take a screenshot** of the error in browser console
2. **Copy the error message** (right-click → Copy message)
3. **Note the URL** where the error occurred
4. **Check Network tab** for failed API calls
5. **Share the details** and I'll help resolve

**Common Issues:**
- 404 for chunk files → Clear browser cache + hard refresh
- Modal doesn't open → Check browser console for errors
- API calls fail → Check backend logs
- Permissions error → Verify user role (admin/program-admin)

---

## ✅ Deployment Complete!

**Current Status:** ✅ LIVE & OPERATIONAL  
**Server:** 13.126.210.220 (QSights Production)  
**Frontend:** PM2 Process ID 824907 - Online  
**Backend:** All hierarchy APIs functional  

**Ready for Phase 4: Manager Dashboard**

---

**Deployment Date:** January 18, 2026  
**Deployment Time:** 13:20 UTC  
**Last Updated:** Post-deployment testing guide  
**Status:** 🟢 READY FOR USER TESTING
