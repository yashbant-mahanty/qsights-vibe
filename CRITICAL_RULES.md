# 🚨 CRITICAL DEVELOPMENT & DEPLOYMENT RULES

**⚠️ MANDATORY: Read this document before ANY development or deployment**

**Last Updated**: 18 February 2026

---

## 📋 TABLE OF CONTENTS

1. [Role-Based Access Rules](#1-role-based-access-rules)
2. [Deployment Checklist](#2-deployment-checklist)
3. [Server & Path Configuration](#3-server--path-configuration)
4. [Pre-Deployment Validation](#4-pre-deployment-validation)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Backup Procedures](#6-backup-procedures)
7. [Common Issues to Avoid](#7-common-issues-to-avoid)
8. [Quick Reference Commands](#8-quick-reference-commands)

---

## 1. ROLE-BASED ACCESS RULES

### 1.1 Program-Based Filtering (Default Users)
**Applies to:** `program-admin`, `program-manager`, `program-moderator`

| Resource | Filter Applied |
|----------|----------------|
| Organizations | Filter by `program_id` |
| Events | Filter by `program_id` |
| Questionnaires | Filter by `program_id` |
| Reports | Filter by `program_id` |
| Evaluation Departments | Filter by `program_id` |
| Evaluation Roles | Filter by `program_id` |
| Evaluation Staff | Filter by `program_id` |
| Evaluation Mappings | Filter by `program_id` |

**Code Rule**: Always use `user.program_id` for filtering when role is NOT `super-admin`

### 1.2 Super-Admin Access
**Role:** `super-admin`

**Super-admin sees EVERYTHING without any filters:**
- ✅ All Organizations
- ✅ All Group Heads
- ✅ All Programs (active AND expired via `all_statuses=true`)
- ✅ All Events
- ✅ All Questionnaires
- ✅ All Reports
- ✅ All Evaluation Departments, Roles, Staff, Mappings

**Code Rule**: When `user.role === 'super-admin'`, do NOT apply `program_id` filter

### 1.3 System Role (Service-Based)
**Role:** `system`

- System role sees tabs/pages based on **services assigned**
- Access controlled by database `role` table settings
- Feature visibility defined per-service

### 1.4 Role-Based Feature Display
- Page and feature visibility controlled by `role` table in database
- Check `role.permissions` or `role.features` for access control
- Do NOT hardcode page access - always check database

---

## 2. DEPLOYMENT CHECKLIST

### ✅ BEFORE Deployment

- [ ] Read this CRITICAL_RULES.md document
- [ ] Read /docs/DEPLOYMENT_GUIDE.md if exists
- [ ] Verify `.env` files do NOT contain `localhost:8000`
- [ ] Test changes locally first
- [ ] Ensure no hardcoded values that should come from DB
- [ ] Verify fix doesn't break existing working features

### ✅ DURING Deployment

- [ ] Use correct server paths (see Section 3)
- [ ] Copy files to `/tmp` first, then move with sudo
- [ ] Build on server, NOT delete `.next` folder
- [ ] Use `pm2 restart` (NOT stop/start)

### ✅ AFTER Deployment

- [ ] Check for 404 errors in browser console
- [ ] Verify HTTP 200 from production URL
- [ ] Test the specific feature changed
- [ ] Test 2-3 other existing features to ensure nothing broke
- [ ] Take backups (local, production, git)

---

## 3. SERVER & PATH CONFIGURATION

### 3.1 Connection Details

```bash
# PEM File Location
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"

# Server Address
SERVER="ubuntu@13.126.210.220"

# SSH Command
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Alternative via AWS SSM
aws ssm start-session --target i-0de19fdf0bd6568b5 --document-name AWS-StartPortForwardingSession --parameters "localPortNumber=3399,portNumber=22" --region ap-south-1
```

### 3.2 Production Paths (MEMORIZE THESE!)

| Component | Production Path | Local Path |
|-----------|-----------------|------------|
| **Frontend** | `/var/www/frontend` | `/Users/yash/Documents/Projects/QSightsOrg2.0/frontend` |
| **Backend** | `/var/www/QSightsOrg2.0/backend` | `/Users/yash/Documents/Projects/QSightsOrg2.0/backend` |

### 3.3 ⚠️ COMMON PATH MISTAKES TO AVOID

```bash
# ❌ WRONG PATHS
/var/www/QSightsOrg2.0/frontend  # Frontend is NOT here!
/var/www/backend                  # Backend is NOT here!

# ✅ CORRECT PATHS
/var/www/frontend                 # Frontend IS here
/var/www/QSightsOrg2.0/backend    # Backend IS here
```

---

## 4. PRE-DEPLOYMENT VALIDATION

### 4.1 Environment File Check

```bash
# Check production .env does NOT have localhost
ssh -i $PEM $SERVER "grep -i 'localhost' /var/www/frontend/.env.local"
# Should return nothing or only comments

ssh -i $PEM $SERVER "grep -i 'localhost:8000' /var/www/QSightsOrg2.0/backend/.env"
# Should return nothing
```

### 4.2 Feature Impact Check

Before ANY fix:
1. List all features that use the file being modified
2. Test those features AFTER deployment
3. If fix breaks other features, ROLLBACK immediately

### 4.3 Console Error Check

After deployment, open browser console (F12) and check for:
- ❌ `Failed to load resource: 404 (Not Found)` 
- ❌ `ChunkLoadError`
- ❌ `TypeError: Cannot read property`

If ANY of these appear, there's a deployment issue!

---

## 5. POST-DEPLOYMENT VERIFICATION

### 5.1 Immediate Checks

```bash
# Check HTTP status
curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com
# Must return: 200

# Check PM2 status
ssh -i $PEM $SERVER "pm2 status"
# Must show: online

# Check for JS errors in build
ssh -i $PEM $SERVER "ls -la /var/www/frontend/.next/static/chunks/ | head -10"
```

### 5.2 Browser Checks

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Open DevTools → Network tab → Check for 404s
3. Open DevTools → Console → Check for errors

### 5.3 Feature Testing

Test AT MINIMUM:
1. The feature you just fixed
2. Login/logout
3. Main dashboard loads
4. One related feature to the fix

---

## 6. BACKUP PROCEDURES

### 6.1 When to Backup
- ✅ AFTER each successful fix/update
- ✅ BEFORE major deployments
- ✅ Daily at end of work

### 6.2 Local Backup

```bash
# Create timestamped backup
cd /Users/yash/Documents/Projects
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp -r QSightsOrg2.0 "backups/QSightsOrg2.0_local_$TIMESTAMP"
echo "Local backup created: backups/QSightsOrg2.0_local_$TIMESTAMP"
```

### 6.3 Production Backup

```bash
# Backup production frontend
ssh -i $PEM $SERVER "cd /var/www && sudo tar -czf /tmp/frontend_backup_$(date +%Y%m%d_%H%M%S).tar.gz frontend"

# Backup production backend
ssh -i $PEM $SERVER "cd /var/www && sudo tar -czf /tmp/backend_backup_$(date +%Y%m%d_%H%M%S).tar.gz QSightsOrg2.0/backend"

# Download backups to local
scp -i $PEM $SERVER:/tmp/*_backup_*.tar.gz /Users/yash/Documents/Projects/backups/
```

### 6.4 Git Backup

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Stage all changes
git add -A

# Commit with timestamp
git commit -m "Backup $(date +%Y-%m-%d_%H:%M:%S) - [Brief description of changes]"

# Push to remote
git push origin main
```

---

## 7. COMMON ISSUES TO AVOID

### 7.1 Cache/Stale Reference Issues

**Problem**: Browser requests old build artifacts that don't exist

**Solution**:
```bash
# Clear nginx cache (if configured)
ssh -i $PEM $SERVER "sudo rm -rf /var/cache/nginx/*"

# Restart nginx
ssh -i $PEM $SERVER "sudo systemctl restart nginx"

# Hard refresh in browser
Ctrl+Shift+R
```

### 7.2 Port Conflict (EADDRINUSE)

**Problem**: Port 3000 already in use

**Solution**:
```bash
ssh -i $PEM $SERVER "sudo fuser -k 3000/tcp && sleep 2 && cd /var/www/frontend && pm2 restart qsights-frontend"
```

### 7.3 PM2 Process Issues

```bash
# Check what's running
ssh -i $PEM $SERVER "pm2 list"

# Restart gracefully
ssh -i $PEM $SERVER "pm2 restart qsights-frontend"

# If still issues, recreate
ssh -i $PEM $SERVER "pm2 delete qsights-frontend && cd /var/www/frontend && pm2 start npm --name qsights-frontend -- start && pm2 save"
```

### 7.4 Permission Issues

```bash
# Fix frontend permissions
ssh -i $PEM $SERVER "sudo chown -R www-data:www-data /var/www/frontend"

# Fix backend permissions
ssh -i $PEM $SERVER "sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend"
```

### 7.5 Duplicate Top Banner / Double Layout Issue

**Problem**: Page shows duplicate headers, banners, or navigation elements

**Root Cause**: In Next.js App Router, if a `layout.tsx` exists in a folder AND the `page.tsx` also wraps content with `RoleBasedLayout` (or similar layout component), the layout renders TWICE causing duplicate UI elements.

**Example of the bug** (18 Feb 2026 - Questionnaires page):
```
/var/www/frontend/app/questionnaires/layout.tsx  ← Wraps with RoleBasedLayout
/var/www/frontend/app/questionnaires/page.tsx    ← ALSO wraps with RoleBasedLayout
= DOUBLE HEADER/BANNER!
```

**Diagnosis**:
```bash
# Check if layout.tsx exists in the folder
ssh -i $PEM $SERVER "find /var/www/frontend/app -name 'layout.tsx' -type f"

# Check if page.tsx also uses RoleBasedLayout
ssh -i $PEM $SERVER "grep -c 'RoleBasedLayout' /var/www/frontend/app/FOLDER/page.tsx"
```

**Solution**: Remove the duplicate `layout.tsx` OR remove `RoleBasedLayout` from `page.tsx` (choose ONE approach, not both):
```bash
# Option 1: Remove layout.tsx (if page.tsx already has RoleBasedLayout)
ssh -i $PEM $SERVER "rm /var/www/frontend/app/FOLDER/layout.tsx"

# Then rebuild and restart
ssh -i $PEM $SERVER "cd /var/www/frontend && npm run build && pm2 restart qsights-frontend"
```

**Prevention Rule**: 
- ⚠️ NEVER create both `layout.tsx` with RoleBasedLayout AND use RoleBasedLayout inside `page.tsx`
- Choose ONE: Either wrap in layout.tsx OR wrap in page.tsx
- Check other pages for consistent pattern before adding new layouts

### 7.6 Adding New Question Types (MANDATORY CHECKLIST)

**Problem**: When adding a new question type (e.g., `percentage_allocation`, `video`, `sct_likert`), saving the questionnaire fails with:
```
422 Unprocessable Content
"The selected sections.0.questions.N.type is invalid."
```

**Root Cause**: The **backend** has a whitelist of allowed question types in validation rules. The frontend was updated but backend validation was NOT updated.

**Files that need changes when adding a NEW question type:**

| Layer | File | What to Add |
|-------|------|-------------|
| **Frontend** | `app/questionnaires/[id]/page.tsx` | Question type in `questionTypes` array, `addQuestion` function, `renderQuestionPreview` switch, builder UI rendering |
| **Frontend** | `app/questionnaires/create/page.tsx` | Same as above + `typeMapping` object |
| **Frontend** | `app/activities/take/[id]/page.tsx` | Participant-facing rendering case, validation in `validateCurrentAnswers` |
| **Backend** | `QuestionnaireController.php` (lines ~116, ~307) | Add type to `'in:...'` validation rule |

**Backend Validation Fix Command:**
```bash
# Check current allowed types (NOTE: Production backend is at /var/www/QSightsOrg2.0/backend NOT /var/www/qsights-backend!)
ssh -i $PEM $SERVER "grep -n 'sections.\*.\questions.\*.type' /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/QuestionnaireController.php | head -2"

# Add new type (replace NEW_TYPE with actual type name)
ssh -i $PEM $SERVER "sudo sed -i 's/video\x27/video,NEW_TYPE\x27/g' /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/QuestionnaireController.php"

# Restart PHP-FPM
ssh -i $PEM $SERVER "sudo systemctl restart php8.4-fpm"
```

**Current Allowed Types** (as of 18 Feb 2026):
- text, textarea, number, email, phone, url
- radio, checkbox, select, multiselect
- rating, scale, date, time, datetime, file
- yesno, matrix, information, slider_scale, dial_gauge
- likert_visual, nps, star_rating
- **mcq, multi, video, sct_likert, information_block, percentage_allocation**

**Prevention Rule**:
- ⚠️ ALWAYS update backend validation when adding new question types to frontend
- ⚠️ Test questionnaire SAVE after adding new type, not just the UI
- ⚠️ Check both lines 109 AND 249 in QuestionnaireController.php

---

## 8. QUICK REFERENCE COMMANDS

### 8.1 Safe Frontend Deployment

```bash
# One-liner for safe frontend file deployment
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend && \
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  app/YOUR_PATH/YOUR_FILE.tsx \
  ubuntu@13.126.210.220:/tmp/file.tsx && \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo mv /tmp/file.tsx /var/www/frontend/app/YOUR_PATH/YOUR_FILE.tsx && \
   sudo chown www-data:www-data /var/www/frontend/app/YOUR_PATH/YOUR_FILE.tsx && \
   cd /var/www/frontend && sudo -u www-data npm run build && \
   pm2 restart qsights-frontend && echo DONE"
```

### 8.2 Safe Backend Deployment

```bash
# One-liner for safe backend file deployment
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend && \
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  app/Http/Controllers/Api/YOUR_FILE.php \
  ubuntu@13.126.210.220:/tmp/file.php && \
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "sudo mv /tmp/file.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/YOUR_FILE.php && \
   sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/YOUR_FILE.php && \
   sudo systemctl restart php8.4-fpm && echo DONE"
```

### 8.3 Quick Status Check

```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
  "pm2 status && curl -s -o /dev/null -w 'HTTP Status: %{http_code}\n' https://prod.qsights.com"
```

---

## 🔴 ABSOLUTE DON'Ts

1. ❌ NEVER delete `.next` folder before build
2. ❌ NEVER use `localhost:8000` in production .env
3. ❌ NEVER deploy without testing locally first
4. ❌ NEVER skip the backup after successful deployment
5. ❌ NEVER assume a fix won't affect other features
6. ❌ NEVER use wrong paths (see Section 3.3)
7. ❌ NEVER hardcode values that should come from database

---

## 🟢 ABSOLUTE DOs

1. ✅ ALWAYS read this document before new development session
2. ✅ ALWAYS check browser console for 404 errors after deployment
3. ✅ ALWAYS test the feature AND related features after fix
4. ✅ ALWAYS take backups after successful updates
5. ✅ ALWAYS use correct production paths
6. ✅ ALWAYS verify PM2 is online after restart
7. ✅ ALWAYS apply program_id filter for non-super-admin users

---

**Document Location**: `/Users/yash/Documents/Projects/QSightsOrg2.0/CRITICAL_RULES.md`

**⚠️ This document should be read at the START of every development session!**
