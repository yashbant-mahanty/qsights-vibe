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

### 4. PRODUCTION DEPLOYMENT CHECKLIST (ZERO DOWNTIME)

**⚠️ CRITICAL: LIVE EVENTS ARE RUNNING - NO APP BREAKS ALLOWED**

**Server Details:**
- PEM: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- Server: `ubuntu@13.126.210.220`
- Frontend Path: `/var/www/frontend`
- Backend Path: `/var/www/QSightsOrg2.0/backend`

**STEP-BY-STEP SAFE DEPLOYMENT:**

```bash
# ============================================
# STEP 1: COPY FILES TO /tmp FIRST (NOT DIRECTLY TO APP)
# ============================================
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"

# Copy frontend files to /tmp
scp -i "$PEM" "frontend/app/path/to/file.tsx" $SERVER:/tmp/filename.tsx

# ============================================
# STEP 2: MOVE FILES WITH SUDO (preserves permissions)
# ============================================
ssh -i "$PEM" $SERVER 'sudo cp /tmp/filename.tsx "/var/www/frontend/app/path/to/file.tsx"'

# ============================================
# STEP 3: BUILD ON SERVER (NOT delete .next first!)
# ============================================
ssh -i "$PEM" $SERVER 'cd /var/www/frontend && sudo npm run build 2>&1 | tail -20'

# ============================================
# STEP 4: RESTART PM2 (GRACEFUL - NO KILL)
# ============================================
ssh -i "$PEM" $SERVER 'sudo pm2 restart qsights-frontend && sleep 3 && sudo pm2 status'

# ============================================
# STEP 5: VERIFY DEPLOYMENT
# ============================================
ssh -i "$PEM" $SERVER 'curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com'
# Must return 200

ssh -i "$PEM" $SERVER 'sudo pm2 status'
# Must show "online" status

# ============================================
# STEP 6: SAVE PM2 STATE
# ============================================
ssh -i "$PEM" $SERVER 'sudo pm2 save'
```

**❌ NEVER DO THESE:**
- `rm -rf .next` before build (causes downtime)
- `pm2 stop` + long operations + `pm2 start` (causes downtime)
- `pm2 delete` unless absolutely necessary
- `fuser -k 3000/tcp` unless PM2 is stuck

**✅ IF PORT 3000 CONFLICT OCCURS:**
```bash
# Only if PM2 restart fails with EADDRINUSE
ssh -i "$PEM" $SERVER 'sudo fuser -k 3000/tcp && sleep 2'
ssh -i "$PEM" $SERVER 'cd /var/www/frontend && sudo pm2 start npm --name qsights-frontend -- start'
ssh -i "$PEM" $SERVER 'sudo pm2 save'
```

**✅ VERIFY AFTER EVERY DEPLOYMENT:**
1. HTTP 200 from `https://prod.qsights.com`
2. PM2 status is "online"
3. Test the specific feature changed
4. Hard refresh browser (Ctrl+Shift+R)

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

---

## 🚨 LESSONS LEARNED - 30 JAN 2026

**Issue**: Deployment caused ~5 min downtime due to:
1. Deleting `.next` folder before rebuild (site goes down immediately)
2. Multiple PM2 restarts causing port conflicts
3. Old Next.js process holding port 3000

**Root Cause**: Not following zero-downtime deployment process

**Prevention**:
- NEVER delete `.next` folder - just rebuild over it
- Use `pm2 restart` not `pm2 stop/start` or `pm2 delete`
- If port conflict, use `fuser -k 3000/tcp` then immediately start PM2
- Always verify HTTP 200 and PM2 "online" status after deployment

---

**Last Updated**: 30 January 2026
