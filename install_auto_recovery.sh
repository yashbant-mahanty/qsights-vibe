#!/bin/bash

###############################################################################
# Setup Auto-Recovery on Preprod Server
# Run this ONCE on the preprod server to enable auto-recovery on boot
###############################################################################

set -e

echo "Installing auto-recovery system on preprod server..."
echo ""

# Copy the auto-recovery script to server
SCRIPT_CONTENT='#!/bin/bash

###############################################################################
# Auto-Recovery Script - Installed on Server
###############################################################################

LOG_FILE="/var/log/qsights/preprod/auto-recovery.log"
mkdir -p /var/log/qsights/preprod
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "Auto-Recovery: $(date)"
echo "=========================================="

sleep 30

echo "Starting Nginx..."
systemctl start nginx
systemctl enable nginx

echo "Checking frontend..."
if [ -d "/var/www/frontend/.next" ]; then
    su - ubuntu -c "
        cd /var/www/frontend
        pm2 stop all 2>/dev/null || true
        pm2 start npm --name qsights-frontend-preprod -- start
        
        if [ -d /var/www/QSightsOrg2.0/backend/artisan ]; then
            cd /var/www/QSightsOrg2.0/backend
            pm2 start \"php artisan serve --host=0.0.0.0 --port=1199\" --name qsights-backend-preprod
        fi
        
        pm2 save
    "
fi

echo "Recovery complete: $(date)"
'

# Create the script on server
echo "$SCRIPT_CONTENT" | sudo tee /usr/local/bin/qsights-auto-recovery.sh > /dev/null
sudo chmod +x /usr/local/bin/qsights-auto-recovery.sh

# Create systemd service
sudo tee /etc/systemd/system/qsights-auto-recovery.service > /dev/null << 'EOF'
[Unit]
Description=QSights Preprod Auto-Recovery
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/qsights-auto-recovery.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable qsights-auto-recovery.service

echo ""
echo "✓ Auto-recovery installed!"
echo ""
echo "This will now automatically:"
echo "  - Start Nginx on boot"
echo "  - Start PM2 processes on boot"
echo "  - Restore services if server restarts"
echo ""
echo "Logs: /var/log/qsights/preprod/auto-recovery.log"
echo ""
