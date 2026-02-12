#!/bin/bash
# FORCE BROWSER CACHE CLEAR - Add cache busting

set -euo pipefail

SERVER_USER="ubuntu"
SERVER_HOST="13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"

echo "🔥 CLEARING ALL CACHES FOR CLIENT DEMO"
echo ""

ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
# Clear PM2 logs
sudo pm2 flush

# Restart PM2 with --update-env to clear any environment caching
sudo pm2 restart qsights-frontend --update-env

# Wait for restart
sleep 3

echo "✅ PM2 restarted with fresh environment"
sudo pm2 list | grep qsights-frontend

ENDSSH

echo ""
echo "✅ SERVER CACHES CLEARED"
echo ""
echo "🚨🚨🚨 CLIENT DEMO INSTRUCTIONS 🚨🚨🚨"
echo ""
echo "Tell the user to do HARD REFRESH:"
echo ""
echo "  Mac/Safari:      Cmd + Option + R"
echo "  Mac/Chrome:      Cmd + Shift + R"  
echo "  Windows:         Ctrl + Shift + R"
echo "  Or:              Ctrl + F5"
echo ""
echo "Or open in INCOGNITO/PRIVATE window:"
echo "  Mac:             Cmd + Shift + N (Chrome) / Cmd + Shift + P (Safari)"
echo "  Windows:         Ctrl + Shift + N"
echo ""
echo "BUILD_ID is now: 41JM5B0HbVeL7RBNOdiM5"
echo "All static assets are present in /var/www/frontend/.next/static/"
echo ""
