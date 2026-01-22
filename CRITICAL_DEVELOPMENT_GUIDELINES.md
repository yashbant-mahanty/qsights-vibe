# CRITICAL DEVELOPMENT GUIDELINES

## ⚠️ ABSOLUTE RULES - NO EXCEPTIONS

### 1. NO HARDCODING IN THE APP

**NEVER hardcode values that should come from:**
- Database settings
- User preferences
- Configuration files
- API responses

**Examples of violations:**
```javascript
// ❌ WRONG - Hardcoded instruction text
<div>Drag the pointer to select</div>

// ✅ CORRECT - Use settings from database
<div>{instructionText}</div>
```

```javascript
// ❌ WRONG - Hardcoded colors
const colors = ['#1e3a5f', '#2563eb'];

// ✅ CORRECT - Use settings from database
const colors = settings.colorStops.map(s => s.color);
```

```javascript
// ❌ WRONG - Hardcoded positioning
style={{ top: '110px' }}  // Changed without considering all use cases

// ✅ CORRECT - Use consistent values that work for all scenarios
// Test with MULTIPLE existing surveys before changing any positioning
```

---

### 2. CHECKPOINT BEFORE DEPLOYMENT

Before deploying ANY change, verify:

- [ ] **Compare with working surveys** - Test with existing production data
- [ ] **Check database values** - Don't override database settings with code defaults
- [ ] **No empty string overwrites** - Never set `instructionText = ''` or `labels = []` without user intent
- [ ] **Build AND source sync** - Ensure both `.next/` build AND source files are deployed

---

### 3. DATABASE UPDATE SCRIPTS

When running database update scripts:

- [ ] **Backup first** - Always backup before bulk updates
- [ ] **Verify values** - Don't set important fields to empty/null accidentally
- [ ] **Test on one record** - Test on single record before bulk update
- [ ] **Log changes** - Print before/after values for verification

---

### 4. PRODUCTION DEPLOYMENT CHECKLIST

```bash
# 1. Build locally
npm run build

# 2. Sync BOTH build and source files
rsync -avz --delete .next/ ubuntu@server:/var/www/frontend/.next/
rsync -avz components/ ubuntu@server:/var/www/frontend/components/

# 3. Restart PM2
pm2 restart qsights-frontend

# 4. VERIFY deployment
ssh ubuntu@server "grep -n 'KEY_VALUE' /var/www/frontend/components/FILE.tsx"
```

---

### 5. ISSUES FIXED ON 21 JAN 2026

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Arc cut off at top | Changed `top: 70px` to `110px` without testing | Reverted to `70px` |
| Instruction text missing | DB script set `instructionText = ''` | Restored via `fix_instruction_text.php` |
| Changes not deployed | Only `.next/` synced, not source files | Now sync both |

---

## Files Reference

- **DialGauge.tsx**: `/frontend/components/questions/DialGauge.tsx`
- **Default Settings**: `/frontend/components/questions/index.ts`
- **Value Utils**: `/frontend/lib/valueDisplayUtils.ts`

---

## Contact

If unsure about a change, **ASK FIRST** before modifying production code.

**Last Updated**: 21 January 2026
