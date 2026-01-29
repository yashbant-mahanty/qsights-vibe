# Issues Fixed - January 22, 2026

## Root Causes Identified

### 1. React Error #423 (Invalid Hook Call)
**Why it happened:**
- File: `frontend/app/api/theme/settings/route.ts`
- Had hardcoded `http://127.0.0.1:8000/api` instead of using environment variable
- During Next.js build, server-side routes execute and try to fetch from backend
- In production, localhost:8000 doesn't exist → connection refused
- This caused build-time errors that propagated to runtime

**The Fix:**
```typescript
// ❌ WRONG - Hardcoded localhost
const backendUrl = 'http://127.0.0.1:8000/api';

// ✅ CORRECT - Use environment variable
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
```

### 2. CSS Files 404 Error (67f5bf7ec7a4aebc.css not found)
**Why it happened:**
- HTML referenced CSS hash from an old build
- Server had different CSS files (287b981a0945805a.css, e8561a054ab5fdcc.css)
- This happens when:
  1. You rebuild locally (generates new hashes)
  2. Deploy only source files without `.next/` folder
  3. Or deploy `.next/` but HTML is cached with old hashes

**The Fix:**
- Deployed complete fresh build:
  - `.next/static/` (all CSS/JS with correct hashes)
  - `.next/server/` (server-side code)
  - `.next/BUILD_ID`, `build-manifest.json`, `prerender-manifest.json`
- Killed stale node process holding port 3000
- Restarted PM2 cleanly

---

## Critical Lessons Learned

### ALWAYS check for hardcoded URLs:
```bash
# Search entire codebase
grep -rn "localhost:8000\|127.0.0.1:8000" frontend/ --include="*.ts" --include="*.tsx"
```

### Complete deployment checklist:
1. ✅ Build locally: `npm run build`
2. ✅ Deploy source files (app/, components/, lib/)
3. ✅ Deploy `.next/static/` folder (CSS/JS)
4. ✅ Deploy `.next/server/` folder
5. ✅ Deploy `.next/BUILD_ID` and manifest files
6. ✅ Check for stale processes: `sudo ss -tlnp | grep :3000`
7. ✅ Restart PM2: `sudo pm2 restart qsights-frontend`
8. ✅ Verify logs: `sudo pm2 logs qsights-frontend --lines 20`

### Environment Variables Must Be Used:
- ❌ Never hardcode: `http://localhost:8000`
- ✅ Always use: `process.env.BACKEND_URL`
- Server .env has: `BACKEND_URL=https://prod.qsights.com`

---

## TODO - January 23, 2026

### Fix Dashboard Issues for All Roles:
1. **Admin Dashboard** - Check functionality
2. **Manager Dashboard** - Check functionality  
3. **Moderator Dashboard** - Check functionality

### Common Issues to Check:
- [ ] Hook calls outside components
- [ ] API routes with hardcoded URLs
- [ ] Missing error boundaries
- [ ] Authentication/authorization checks
- [ ] Data fetching patterns
- [ ] Layout component compatibility

### Files to Review:
- `app/admin/page.tsx`
- `app/program-manager/page.tsx`
- `app/program-moderator/page.tsx`
- `components/admin-layout.tsx`
- `components/program-manager-layout.tsx`
- `components/program-moderator-layout.tsx`

---

## Server Info
- **IP**: 13.126.210.220
- **PEM**: /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
- **Frontend Path**: /var/www/frontend
- **Backend Path**: /var/www/QSightsOrg2.0/backend
- **PM2 Process**: qsights-frontend
- **Port**: 3000 (internal), 443 (external via Nginx)
- **URL**: https://prod.qsights.com
