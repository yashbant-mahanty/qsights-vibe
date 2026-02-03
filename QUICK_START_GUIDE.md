# Quick Start Guide - Role System Upgrade

## 🚀 Deploy in 3 Steps

### Step 1: Run Migration (5 minutes)

```bash
cd backend
php artisan migrate
```

**Expected output:**
```
Migrating: 2026_02_01_000001_add_permission_overrides_and_evaluation_admin
Migrated:  2026_02_01_000001_add_permission_overrides_and_evaluation_admin (0.42 seconds)
```

**Verify:**
```bash
php artisan tinker
>>> \App\Models\User::first()->permission_overrides
=> null  // Good! New column exists
```

---

### Step 2: Add Frontend Component (10 minutes)

**File:** `frontend/app/programs/create/page.tsx`

**1. Add interface and state at the top (after existing useState declarations):**

```typescript
// Add this interface
interface ProgramRoleOption {
  role: string;
  label: string;
  description: string;
  enabled: boolean;
  email: string;
  required: boolean;
}

// Add this state
const [roleOptions, setRoleOptions] = useState<ProgramRoleOption[]>([
  {
    role: 'program-admin',
    label: 'Program Admin',
    description: 'Full program access',
    enabled: true,
    email: '',
    required: true
  },
  {
    role: 'program-manager',
    label: 'Program Manager',
    description: 'Manage activities & participants',
    enabled: true,
    email: '',
    required: false
  },
  {
    role: 'program-moderator',
    label: 'Program Moderator',
    description: 'View-only access',
    enabled: true,
    email: '',
    required: false
  },
  {
    role: 'evaluation-admin',
    label: 'Evaluation Admin',
    description: 'Manage evaluations & questionnaires',
    enabled: true,
    email: '',
    required: false
  }
]);
```

**2. Update handleSubmit function:**

Replace the existing `generate_admin`, `generate_manager`, `generate_moderator` lines with:

```typescript
// Replace these 3 lines:
// generate_admin: true,
// generate_manager: true,
// generate_moderator: true,

// With this:
create_roles: roleOptions
  .filter(r => r.enabled)
  .map(r => ({
    role: r.role,
    email: r.email || null,
    auto_generate: !r.email
  }))
```

**3. Add Role Selection Card:**

Copy the entire Role Selection Card from `ROLE_SELECTION_COMPONENT.tsx` and paste it after the "Organization & Timeline" Card (around line 383).

---

### Step 3: Test (15 minutes)

**Test Case 1: Create Program with All Roles**
1. Go to `/programs/create`
2. Fill program details
3. All 4 roles should be checked by default
4. Click "Create Program"
5. ✅ Should see credentials modal with 4 users

**Test Case 2: Custom Email**
1. Create program
2. Enter custom email for Evaluation Admin
3. Leave others empty
4. ✅ Evaluation Admin uses custom email, others auto-generated

**Test Case 3: Selective Roles**
1. Create program
2. Uncheck "Program Moderator"
3. ✅ Only 3 users created

---

## 🎯 What Users Will See

### Program Creation Screen

```
┌─────────────────────────────────────────────┐
│ Create Program                              │
├─────────────────────────────────────────────┤
│                                             │
│ [Basic Information Card]                    │
│ [Organization & Timeline Card]              │
│                                             │
│ 👥 Create Default Roles                     │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ Program Admin (Required)              │ │
│ │    Full program access                   │ │
│ │    Email: [auto-generate]                │ │
│ │                                          │ │
│ │ ☑ Program Manager                       │ │
│ │    Manage activities & participants      │ │
│ │    Email: [manager@company.com____]      │ │
│ │                                          │ │
│ │ ☑ Program Moderator                     │ │
│ │    View-only access                      │ │
│ │    Email: [auto-generate]                │ │
│ │                                          │ │
│ │ ☑ Evaluation Admin (NEW!)               │ │
│ │    Manage evaluations & questionnaires   │ │
│ │    Email: [evaladmin@company.com____]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Cancel]                    [Create →]      │
└─────────────────────────────────────────────┘
```

### After Creation - Credentials Modal

```
┌─────────────────────────────────────────────┐
│ ✅ Program Created Successfully!            │
├─────────────────────────────────────────────┤
│                                             │
│ 🔐 User Credentials (Save these!)           │
│                                             │
│ Program Admin:                              │
│   Username: marketing-training.admin@...    │
│   Password: xK9p2mQ4n7L1                    │
│                                             │
│ Program Manager:                            │
│   Username: manager@company.com             │
│   Password: jH6t4vR2m8N5                    │
│                                             │
│ Program Moderator:                          │
│   Username: marketing-training.moderator@...│
│   Password: wP3r7yT1k9M2                    │
│                                             │
│ Evaluation Admin:                           │
│   Username: evaladmin@company.com           │
│   Password: bN5q8fG3x6K4                    │
│                                             │
│ [Download Credentials] [Copy All] [Close]   │
└─────────────────────────────────────────────┘
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Migration ran successfully
- [ ] Can create program with 4 roles
- [ ] Can provide custom emails
- [ ] Can uncheck non-required roles
- [ ] Credentials modal displays correctly
- [ ] Evaluation admin can login
- [ ] Evaluation admin sees limited access
- [ ] Program admin sees full access
- [ ] Database audit log is working

---

## 🐛 Troubleshooting

### Issue: Migration fails

**Error:** `SQLSTATE[42S21]: Column already exists`

**Solution:**
```bash
php artisan migrate:rollback --step=1
php artisan migrate
```

---

### Issue: "evaluation-admin not in enum"

**Solution:** Check migration ran. Verify with:
```sql
SHOW COLUMNS FROM users WHERE Field = 'role';
```

Should show: `'super-admin','admin','program-admin','program-manager','program-moderator','evaluation-admin','participant'`

---

### Issue: Frontend role checkbox not working

**Solution:** Ensure you:
1. Added `ProgramRoleOption` interface
2. Added `roleOptions` state
3. Updated `handleSubmit` to use `create_roles`
4. Pasted Role Selection Card component

---

### Issue: Evaluation admin has full access

**Solution:** Clear browser cache and check `frontend/lib/permissions.ts` has evaluation-admin definition.

---

## 📞 Support

If issues persist:

1. Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. Review [ROLE_SYSTEM_UPGRADE_ANALYSIS.md](ROLE_SYSTEM_UPGRADE_ANALYSIS.md)
3. Check Laravel logs: `backend/storage/logs/laravel.log`
4. Check browser console for frontend errors

---

## ✅ Success!

Once all verification steps pass, you have successfully upgraded to the Hybrid Role System with:

- ✅ Evaluation Admin role
- ✅ Flexible program role creation
- ✅ Ownership-based access control
- ✅ Permission override system
- ✅ Audit trail
- ✅ Multi-level hierarchy support

**Total Time: ~30 minutes** 🎉
