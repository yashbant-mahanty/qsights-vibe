#!/bin/bash

###############################################################################
# Auto-Recovery Script for Preprod Server
# This runs on server startup to automatically restore services
# Install location: /home/ubuntu/auto-recover.sh
###############################################################################

LOG_FILE="/var/log/qsights/preprod/auto-recovery.log"
mkdir -p /var/log/qsights/preprod

exec > >(tee -a "$LOG_FILE") 2>&1

echo "=================================================="
echo "Auto-Recovery Started: $(date)"
echo "=================================================="

# Wait for system to fully boot
sleep 30

echo "[1/6] Checking directory structure..."
mkdir -p /var/www/QSightsOrg2.0/backend
mkdir -p /var/www/frontend
mkdir -p /home/ubuntu/backups/preprod
mkdir -p /var/log/qsights/preprod
chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0 /var/www/frontend /var/log/qsights
echo "✓ Directories OK"

echo "[2/6] Starting Nginx..."
systemctl start nginx
systemctl enable nginx
sleep 2
if systemctl is-active --quiet nginx; then
    echo "✓ Nginx is running"
else
    echo "✗ Nginx failed, trying to fix config..."
    nginx -t
    systemctl restart nginx
fi

echo "[3/6] Checking if frontend is deployed..."
if [ -d "/var/www/frontend/.next" ]; then
    echo "Frontend found, starting PM2..."
    
    # Switch to ubuntu user for PM2
    su - ubuntu -c "
        export HOME=/home/ubuntu
        export PATH=\$PATH:/usr/local/bin:/usr/bin
        
        cd /var/www/frontend
        
        # Stop any existing processes
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        
        # Start frontend
        pm2 start npm --name qsights-frontend-preprod -- start
        
        # Start backend if exists
        if [ -d '/var/www/QSightsOrg2.0/backend' ] && [ -f '/var/www/QSightsOrg2.0/backend/artisan' ]; then
            cd /var/www/QSightsOrg2.0/backend
            pm2 start 'php artisan serve --host=0.0.0.0 --port=1199' --name qsights-backend-preprod
        fi
        
        # Save configuration
        pm2 save
        
        # Setup startup
        pm2 startup systemd -u ubuntu --hp /home/ubuntu
    "
    
    echo "✓ PM2 processes started"
else
    echo "⚠ Frontend not deployed, skipping PM2 startup"
fi

echo "[4/6] Waiting for services to stabilize..."
sleep 10

echo "[5/6] Checking service status..."
systemctl status nginx --no-pager -l | head -5
su - ubuntu -c "pm2 list" || echo "PM2 not running"

echo "[6/6] Testing endpoints..."
sleep 5
curl -I http://localhost/ 2>&1 | head -3 || echo "Frontend not responding"
curl -I http://localhost:1199/ 2>&1 | head -3 || echo "Backend not responding"

echo "=================================================="
echo "Auto-Recovery Completed: $(date)"
echo "=================================================="
echo ""
echo "Server Status:"
netstat -tlnp | grep -E ':(80|3000|1199)' || echo "Services may still be starting..."
echo ""
