# QSights 2.0 — Pre-Prod Setup & Pre-Prod → Prod Workflow

## Goal
- Pre-Prod mirrors Production behavior.
- Every change goes **Local → Pre-Prod → Production**.
- Production deploy scripts are gated and will refuse direct/unstable releases.

## Environments
- **Pre-Prod**: 3.110.94.207
- **Prod**: https://prod.qsights.com/ (13.126.210.220)

## 1) Pre-Prod server setup (infrastructure)
Run once from repo root:

- `./setup_preprod_server.sh`

What it does:
- Creates directory layout under `/var/www` and `/home/ubuntu/backups/preprod`
- Installs/ensures base packages (nginx, cron service running, PM2)
- Creates nginx site for `preprod.qsights.com` using the **same routing model as production**:
  - Laravel served via PHP-FPM (root: `/var/www/QSightsOrg2.0/backend/public`)
  - Next.js served via proxy on port `3000`
  - `/storage` served from Laravel public storage
- Creates PM2 ecosystem config at `/home/ubuntu/ecosystem.preprod.config.js` for:
  - `qsights-frontend-preprod`
  - `qsights-queue-preprod`
- Ensures Laravel scheduler cron is configured (runs every minute)

## 2) Environment variables (secure handling)

Do **not** commit real credentials.

Templates:
- `env/local.env.example`
- `env/preprod.env.example`
- `env/prod.env.example`

Server files:
- Pre-Prod backend: `/var/www/QSightsOrg2.0/backend/.env`
- Prod backend: `/var/www/QSightsOrg2.0/backend/.env`

Recommended approach:
- Keep local secret files outside git (ignored): `.env.local`, `.env.preprod`, `.env.production`
- Copy the right `.env` to the right server (manually or via secure SCP)

## 3) Deployment workflow (enforced)

### Step A — Deploy to Pre-Prod
- Backend: `./deploy_backend_preprod.sh`
- Frontend: `./deploy_frontend_preprod.sh`

These scripts also write deployment state to:
- `/home/ubuntu/deployments/preprod/last_deployed_commit`
- `/home/ubuntu/deployments/preprod/last_frontend_build_id`

### Step B — Regression verification on Pre-Prod
Run:
- `./scripts/verify_preprod.sh`

Covers:
- SSH reachability
- nginx/php-fpm status
- PM2 processes present
- scheduler cron present
- basic HTTP smoke checks

### Step C — Approval step (required)
Run:
- `./scripts/approve_prod_release.sh`

This creates:
- `release/PROD_APPROVAL.txt`

### Step D — Deploy to Production
- Backend: `./deploy_backend_prod.sh`
- Frontend: `./deploy_frontend_prod.sh`

**Hard gate rules in prod deploy scripts:**
- Current commit must match `last_deployed_commit` on Pre-Prod
- `release/PROD_APPROVAL.txt` must exist and contain the current commit

## 4) Backups & storage

### Pre-Prod backups
- Stored at: `/home/ubuntu/backups/preprod`
- Logs: `/var/log/qsights/preprod`

Policy recommendation:
- Keep last 2 backups per type (backend/frontend/db) OR switch to age-based retention (e.g., 14–30 days).

### Upload large local backups to Pre-Prod
Use SCP to upload into `/home/ubuntu/backups/preprod`.
Example:
- `scp -i QSights-Mumbai-12Aug2019.pem /path/to/backup.tar.gz ubuntu@3.110.94.207:/home/ubuntu/backups/preprod/`

## 5) Rollback

Production rollback scripts exist:
- `./rollback_backend_prod.sh`
- `./rollback_frontend_prod.sh`

Pre-Prod rollback can reuse the same pattern:
- Restore from `/home/ubuntu/backups/preprod/backend_*.tar.gz` or `frontend_*.tar.gz`

## 6) Troubleshooting quick checks
On Pre-Prod:
- `sudo systemctl status nginx --no-pager`
- `sudo systemctl status php8.1-fpm --no-pager` (or php8.4-fpm)
- `pm2 list`
- `sudo crontab -l | grep schedule:run`
- `tail -f /var/log/nginx/error.log`
- `tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`
