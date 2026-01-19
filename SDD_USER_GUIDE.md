# System Design Document (SDD) User Guide

## Overview

The System Design Document (SDD) is an auto-maintained, versioned documentation system with built-in engineering governance. Access it at: **Settings → System Design Document**

---

## Visual Diagrams

### 1. **Client-Server Communication Diagram**
Located in the **Architecture section**, this diagram shows:
- **Client** (iOS/Android/Windows/Mac) → HTTPS Request
- **PHP REST API** (Laravel 11) → SQL Queries
- **Aurora MySQL Database** → Data Returns
- Return flow: Data → JSON Response → REST API → Client

### 2. **Entity Relationship Overview**
Located in the **Database Design section**, this diagram visualizes:
- Organization → Programs (1:N)
- Programs → Activities (1:N)
- Activities → Questionnaires (1:N)
- Questions → Responses (1:N with BIGINT IDs)
- Participants (M:N with Activities)
- Notifications (1:N with Users)
- Reports (Analytics Engine)

**Key Information Displayed:**
- Total tables: 74+ tables
- Critical schema note: Production uses BIGINT for responses/notifications

---

## Tab Explanations

### Tab 1: SDD Content
**Purpose:** Complete system documentation  
**Contains:**
- Introduction & Purpose
- System Architecture (with diagram)
- Data Security measures
- Database Design (with ER diagram)
- Server Setup & AWS infrastructure
- API endpoints
- Technology Stack
- Appendix

**Use Case:** Reference for developers, stakeholders, and auditors

---

### Tab 2: Critical Features
**Purpose:** Identify features that CANNOT break  
**Contains:**
- 10 Critical features (testing required before deployment)
- 4 Non-critical features

**Use Case:** 
- Review before making changes
- Update when adding new critical features
- Ensure all critical features have tests

---

### Tab 3: Pre-Deployment Tests ⭐

#### **What It Does**
Runs automated safety checks that validate critical functionality BEFORE deployment to production.

#### **What It Tests**
✓ Event participation workflows  
✓ Response saving & retrieval  
✓ Notification delivery lifecycle  
✓ Report generation & analytics  

#### **How to Use**
1. **Navigate:** Settings → System Design → Pre-Deployment Tests tab
2. **Click:** "Run All Tests" button (green button in top-right)
3. **Wait:** Test execution takes 30-60 seconds
4. **Review Results:**
   - ✓ **Green boxes** = Tests PASSED
   - ✗ **Red boxes** = Tests FAILED (details shown)
5. **Fix Issues:** If any test fails, fix the issue before deploying
6. **Re-run:** Click "Run All Tests" again after fixes

#### **Governance Rules**
⚠️ **MANDATORY:** All tests MUST pass before deployment  
⚠️ **BLOCKING:** Deployment scripts will FAIL if:
- Any test fails
- Tests haven't been run in last 24 hours
- Critical features are broken

#### **When to Run**
- **Always:** Before every production deployment
- **Recommended:** After any code change to critical features
- **Best Practice:** Daily during active development

#### **Example Test Results**
```
✓ Event Participation Test - PASSED
  Message: Successfully created event, registered participant, and submitted response
  
✗ Response Saving Test - FAILED  
  Message: Failed to save response with error: Database connection timeout
  Error: Connection to database timed out after 30 seconds
```

---

### Tab 4: Schema Validation ⭐

#### **What It Does**
Validates database migrations against production schema to prevent UUID ↔ BIGINT mismatches. This is a **HARD STOP** mechanism.

#### **What It Checks**
- **ID Type Consistency:** Ensures all ID columns match production (BIGINT vs UUID)
- **Critical Tables:** Focuses on responses, notifications, and related tables
- **Migration Safety:** Validates pending migrations won't break production

#### **How to Use**
1. **Navigate:** Settings → System Design → Schema Validation tab
2. **Click:** "Validate Schema" button (orange button in top-right)
3. **Wait:** Validation takes 10-20 seconds
4. **Review Results:**
   - ✓ **Green** = Schema is consistent
   - ✗ **Red** = MISMATCH DETECTED (deployment blocked)
5. **View Issues:** If validation fails, review the issues table
6. **Fix Mismatches:** Update migrations to match production schema
7. **Re-validate:** Click "Validate Schema" again after fixes

#### **Governance Rules**
⚠️ **HARD STOP:** Deployment is BLOCKED if schema validation fails  
⚠️ **CRITICAL ISSUE:** UUID vs BIGINT mismatch causes data corruption  
⚠️ **PRODUCTION SAFETY:** Always validate before running migrations

#### **When to Run**
- **Always:** Before running any database migration
- **Required:** Before every production deployment
- **Best Practice:** After creating new migrations

#### **Example Validation Results**

**✓ Validation Passed:**
```
Schema Validation: PASSED
All tables consistent with production
Checked Tables: 74
Issues Found: 0
```

**✗ Validation Failed:**
```
Schema Validation: FAILED
UUID ↔ BIGINT Mismatch Detected

Issues Found:
┌─────────────────────┬─────────────┬──────────────────────────────┬──────────┐
│ Table               │ Column      │ Issue                        │ Severity │
├─────────────────────┼─────────────┼──────────────────────────────┼──────────┤
│ qst_survey_response │ id          │ Migration uses UUID,         │ CRITICAL │
│                     │             │ Production uses BIGINT       │          │
└─────────────────────┴─────────────┴──────────────────────────────┴──────────┘

Action Required: Update migration to use BIGINT before deploying
```

#### **Common Issues & Fixes**

| Issue | Fix |
|-------|-----|
| Migration uses UUID, Production uses BIGINT | Change `$table->uuid('id')` to `$table->bigIncrements('id')` |
| New table with wrong ID type | Check production schema first, match the pattern |
| Foreign key type mismatch | Ensure foreign keys match referenced column type |

---

### Tab 5: Rollback Procedures
**Purpose:** Emergency recovery steps  
**Contains:**
- Frontend rollback steps
- Backend rollback steps
- Database rollback steps
- Emergency contacts

**Use Case:** When deployment causes issues and needs to be reverted

---

## Workflow: Safe Deployment Process

```
1. Make code changes
   ↓
2. Run Pre-Deployment Tests (Tab 3)
   ↓ (If any test fails)
   ├─→ Fix issues → Re-run tests
   ↓ (All tests pass)
3. Run Schema Validation (Tab 4)
   ↓ (If validation fails)
   ├─→ Fix schema mismatches → Re-validate
   ↓ (Validation passes)
4. Generate SDD PDF (optional, for documentation)
   ↓
5. Deploy to production
   ↓ (If deployment fails)
   ├─→ Use Rollback Procedures (Tab 5)
   ↓ (Deployment successful)
6. Monitor production
   ↓
7. Update Critical Features list (Tab 2) if needed
```

---

## Best Practices

### ✓ DO:
- Run tests before EVERY deployment
- Validate schema before running migrations
- Review all test failures carefully
- Fix issues before proceeding
- Document any schema changes
- Keep SDD PDF updated
- Review critical features quarterly

### ✗ DON'T:
- Skip tests "just this once"
- Ignore schema validation failures
- Deploy with failing tests
- Change production schema without validation
- Delete test results without reviewing
- Bypass governance rules
- Mix UUID and BIGINT in same table

---

## Troubleshooting

### Tests Won't Run
- **Check:** Backend API is accessible
- **Check:** Database connection is active
- **Try:** Refresh the page and try again

### Schema Validation Fails
- **Check:** All migrations are up to date
- **Check:** Production schema matches local
- **Fix:** Update migrations to match production

### Can't Generate PDF
- **Check:** Backend PDF library is installed
- **Check:** Storage permissions are correct
- **Try:** Clear Laravel cache: `php artisan cache:clear`

---

## Quick Reference

| Feature | Location | Action | When to Use |
|---------|----------|--------|-------------|
| **View Diagrams** | SDD Content tab | Scroll to Architecture/Database sections | Reference system design |
| **Run Tests** | Pre-Deployment Tests tab | Click "Run All Tests" | Before every deployment |
| **Validate Schema** | Schema Validation tab | Click "Validate Schema" | Before running migrations |
| **Download PDF** | Top-right button | Click "Download PDF" | For documentation/audits |
| **Check Critical Features** | Critical Features tab | Review list | Before making changes |
| **Emergency Rollback** | Rollback Procedures tab | Follow steps | When deployment fails |

---

## Support

For issues or questions:
- **Developer Team:** Review code in `/backend/app/Http/Controllers/Api/SystemDesignController.php`
- **Frontend:** `/frontend/app/settings/system-design/page.tsx`
- **Documentation:** This file and related `.md` files in project root

---

**Last Updated:** January 18, 2026  
**Version:** 2.0.0  
**Status:** ✓ Production Ready
