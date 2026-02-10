#!/bin/bash

# QSights 2.0 — Pre-Prod Verification Script
# Purpose: quick regression checklist automation for Pre-Prod.

set -euo pipefail

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="3.110.94.207"
SERVER_USER="ubuntu"
PREPROD_URL="https://preprod.qsights.com"
PREPROD_IP_URL="http://3.110.94.207"
DEPLOY_STATE_DIR="/home/ubuntu/deployments/preprod"

red() { printf "\033[0;31m%s\033[0m\n" "$1"; }
green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$1"; }

if [ ! -f "$PEM_KEY" ]; then
  red "✗ PEM key not found at $PEM_KEY"
  exit 1
fi

COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || true)
if [ -z "${COMMIT_SHA}" ]; then
  red "✗ Run from a git checkout of QSightsOrg2.0"
  exit 1
fi

yellow "== Connectivity =="
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "echo SSH_OK" >/dev/null

green "✓ SSH reachable"

yellow "== HTTP smoke checks =="
set +e
curl -fsS --connect-timeout 8 "$PREPROD_URL" >/dev/null
RC1=$?
curl -fsS --connect-timeout 8 "$PREPROD_IP_URL" >/dev/null
RC2=$?
set -e

if [ $RC1 -eq 0 ] || [ $RC2 -eq 0 ]; then
  green "✓ Pre-Prod site responds"
else
  yellow "⚠ Pre-Prod site did not respond on $PREPROD_URL or $PREPROD_IP_URL"
fi

yellow "== Server checks (nginx/php-fpm/pm2/cron) =="
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
set -e
sudo systemctl is-active nginx >/dev/null && echo 'nginx: active' || echo 'nginx: NOT active'
(sudo systemctl is-active php8.4-fpm >/dev/null && echo 'php8.4-fpm: active') || true
(sudo systemctl is-active php8.1-fpm >/dev/null && echo 'php8.1-fpm: active') || true

pm2 list 2>/dev/null | egrep 'qsights-frontend-preprod|qsights-queue-preprod' || echo 'pm2: processes not found (deploy/start pm2)'

sudo crontab -l 2>/dev/null | grep -q 'php artisan schedule:run' && echo 'cron: scheduler configured' || echo 'cron: scheduler NOT configured'

if [ -d /var/www/QSightsOrg2.0/backend ]; then
  cd /var/www/QSightsOrg2.0/backend
  if [ -f .env ]; then echo 'backend: .env present'; else echo 'backend: .env MISSING'; fi
  php artisan --version 2>/dev/null | head -1 || true
else
  echo 'backend: path missing'
fi

if [ -d /var/www/frontend ]; then
  if [ -f /var/www/frontend/package.json ]; then echo 'frontend: package.json present'; else echo 'frontend: package.json MISSING'; fi
  if [ -f /var/www/frontend/.next/BUILD_ID ]; then echo "frontend: BUILD_ID $(cat /var/www/frontend/.next/BUILD_ID)"; else echo 'frontend: BUILD_ID not found'; fi
else
  echo 'frontend: path missing'
fi

sudo mkdir -p $DEPLOY_STATE_DIR
if [ -f $DEPLOY_STATE_DIR/last_deployed_commit ]; then
  echo "preprod state: commit $(cat $DEPLOY_STATE_DIR/last_deployed_commit)"
else
  echo "preprod state: missing last_deployed_commit"
fi
" | sed 's/^/  /'

yellow "== Functional checklist (manual) =="
echo "- Auth: login + token/session"
echo "- Reports: generate + filters"
echo "- Schedulers: reminders triggered (cron present)"
echo "- Media: /storage accessible (uploads)"
echo "- Notifications: queue running + email provider configured"
echo "- Permissions: role access"

green "Done. If everything looks good, run: ./scripts/approve_prod_release.sh"
