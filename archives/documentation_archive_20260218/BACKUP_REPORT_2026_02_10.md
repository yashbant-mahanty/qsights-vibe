# Backup Report — 10 Feb 2026

## 1) Local (macOS workspace)

**Workspace:** QSightsOrg2.0

**Backup created (secrets excluded):**
- Archive: _backups/20260210_100842/QSightsOrg2.0_full_20260210_100842.tar.gz
- SHA-256: _backups/20260210_100842/SHA256SUMS.txt

**Retention applied:** keep newest 2 backup folders under `_backups/` (currently 1 exists).

**Local cleanup performed (safe/minimal):**
- Removed `.DS_Store` and `build.log`
- Removed untracked local archives:
  - frontend/auth-rootcause-fix.tar.gz
  - frontend/login-token-fix.tar.gz
  - frontend/app/activities/[id]/landing-config/page.tsx.backup_feb09

## 2) LIVE / Production server

**Host:** ubuntu@13.126.210.220

**Backup directory:** /home/ubuntu/backups/production

**Retention applied:** keep newest 2 `.tar.gz` files in the backup directory; deleted older ones.

**Remaining backups (newest first):**
- frontend_hydration_fix_20260209_220403.tar.gz
- frontend_hydration_fix_20260209_175936.tar.gz

## 3) Git repo (qsights-provibe)

**Remote:** https://github.com/yashbant-mahanty/qsights-provibe.git

**Production package branch pushed:** production-package-20260210

**Sanitization applied (do not upload secrets):**
- Removed tracked `.env.preprod` from git in this branch
- Updated `.gitignore` to exclude:
  - `_backups/`
  - `.env.*` (and `.env.preprod`)
  - `*.pem`
  - frontend/*.tar.gz (local archives)

**Note:** GitHub warned about several large tracked archives already present in the repo history (e.g., Next build tarballs). If you want, we can move those to Git LFS or remove them in a follow-up branch.
