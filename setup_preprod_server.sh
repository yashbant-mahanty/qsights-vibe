#!/bin/bash

###############################################################################
# QSights Pre-Prod Server Complete Setup Script
# Purpose: Configure preprod server to work like production
# Server: 3.110.94.207 (i-0b62d4d1009b83e2a)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
SERVER_IP="3.110.94.207"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_USER="ubuntu"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       QSights Pre-Prod Server Complete Setup                ║${NC}"
echo -e "${BLUE}║       Server: $SERVER_IP                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify SSH access (primary connectivity check)
echo -e "${YELLOW}[1/10] Verifying SSH Access...${NC}"
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "echo 'SSH OK'" &> /dev/null; then
    echo -e "${RED}✗ Cannot connect via SSH${NC}"
    echo "  • Verify PEM key permissions: chmod 400 $PEM_KEY"
    echo "  • Check security group allows SSH from your IP"
    echo "  • If instance is stopped, run: ./check_and_start_preprod.sh"
    exit 1
fi
echo -e "${GREEN}✓ SSH access verified${NC}"
echo ""

# Check current setup
echo -e "${YELLOW}[2/10] Checking Current Server Setup...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo 'Checking directories...'
    ls -la /var/www/ 2>/dev/null || echo 'No /var/www directory'
    echo ''
    echo 'Checking PM2 processes...'
    pm2 list 2>/dev/null || echo 'PM2 not found or no processes'
    echo ''
    echo 'Checking Nginx...'
    sudo systemctl status nginx --no-pager -l | head -5 || echo 'Nginx not running'
"
echo -e "${GREEN}✓ Current setup checked${NC}"
echo ""

# Create directory structure
echo -e "${YELLOW}[4/10] Creating Directory Structure...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo 'Creating directories...'
    sudo mkdir -p /var/www/QSightsOrg2.0/backend
    sudo mkdir -p /var/www/frontend
    sudo mkdir -p /home/ubuntu/backups/preprod
    sudo mkdir -p /var/log/qsights/preprod
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Set ownership
    sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0
    sudo chown -R ubuntu:ubuntu /var/www/frontend
    sudo chown -R ubuntu:ubuntu /home/ubuntu/backups
    sudo chown -R ubuntu:ubuntu /var/log/qsights
    
    echo 'Setting permissions...'
    chmod 755 /var/www/QSightsOrg2.0
    chmod 755 /var/www/frontend
    
    echo 'Directory structure created:'
    ls -la /var/www/
"
echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Create nginx configuration for preprod
echo -e "${YELLOW}[5/10] Creating Nginx Configuration...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
sudo tee /etc/nginx/sites-available/preprod.qsights.com > /dev/null << 'EOF'
# QSights Pre-Production Server Configuration
# Domain: preprod.qsights.com
# IP: 3.110.94.207

server {
    listen 80;
    server_name preprod.qsights.com 3.110.94.207;

    root /var/www/QSightsOrg2.0/backend/public;
    index index.php;

    location /_next/static {
        alias /var/www/frontend/.next/static;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /sanctum {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /storage {
        alias /var/www/QSightsOrg2.0/backend/storage/app/public;
        add_header Access-Control-Allow-Origin *;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_param HTTP_AUTHORIZATION $http_authorization;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    client_max_body_size 200M;
}
EOF

echo 'Nginx configuration created'
ENDSSH
echo -e "${GREEN}✓ Nginx configuration created${NC}"
echo ""

# Enable nginx site
echo -e "${YELLOW}[6/10] Enabling Nginx Site...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    # Remove default site if exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Enable preprod site
    sudo ln -sf /etc/nginx/sites-available/preprod.qsights.com /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    echo 'Testing Nginx configuration...'
    sudo nginx -t
"
echo -e "${GREEN}✓ Nginx site enabled${NC}"
echo ""

# Install/Update required packages
echo -e "${YELLOW}[7/12] Checking Required Packages...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo apt-get update -y >/dev/null 2>&1 || true

    echo 'Checking Node.js...'
    node --version || echo 'Node.js not found'
    
    echo 'Checking npm...'
    npm --version || echo 'npm not found'
    
    echo 'Checking PM2...'
    pm2 --version || {
        echo 'Installing PM2...'
        sudo npm install -g pm2
    }
    
    echo 'Checking PHP...'
    php --version | head -1 || echo 'PHP not found'
    
    echo 'Checking Composer...'
    composer --version | head -1 || echo 'Composer not found'

    echo 'Checking cron service...'
    sudo systemctl is-active cron >/dev/null 2>&1 || sudo systemctl enable --now cron >/dev/null 2>&1 || true
"
echo -e "${GREEN}✓ Package check complete${NC}"
echo ""

# Setup PM2 ecosystem (frontend + queue worker)
echo -e "${YELLOW}[8/12] Creating PM2 Ecosystem Configuration...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
cat > /home/ubuntu/ecosystem.preprod.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'qsights-frontend-preprod',
      cwd: '/var/www/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://preprod.qsights.com/api',
        NEXT_PUBLIC_APP_URL: 'https://preprod.qsights.com'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/qsights/preprod/frontend-error.log',
      out_file: '/var/log/qsights/preprod/frontend-out.log',
      merge_logs: true,
      time: true
        },
        {
            name: 'qsights-queue-preprod',
            cwd: '/var/www/QSightsOrg2.0/backend',
            script: 'php',
            args: 'artisan queue:work --sleep=3 --tries=3',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            error_file: '/var/log/qsights/preprod/queue-error.log',
            out_file: '/var/log/qsights/preprod/queue-out.log',
            merge_logs: true,
            time: true
    }
  ]
};
EOF

echo 'PM2 ecosystem configuration created'
"
echo -e "${GREEN}✓ PM2 ecosystem configuration created${NC}"
echo ""

# Setup Laravel scheduler cron
echo -e "${YELLOW}[9/12] Setting up Scheduler (cron)...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
        sudo mkdir -p /var/log/qsights/preprod
        sudo chown -R ubuntu:ubuntu /var/log/qsights/preprod

        # Ensure scheduler cron exists (root cron is simplest for permission consistency)
        sudo crontab -l 2>/dev/null | grep -q 'php artisan schedule:run' && echo 'Cron already configured' || {
                (sudo crontab -l 2>/dev/null; echo '* * * * * cd /var/www/QSightsOrg2.0/backend && php artisan schedule:run >> /var/log/qsights/preprod/scheduler.log 2>&1') | sudo crontab -
                echo 'Cron configured for scheduler'
        }
"
echo -e "${GREEN}✓ Scheduler setup complete${NC}"
echo ""

# Backup retention / cleanup policy
echo -e "${YELLOW}[10/12] Setting up Backup Retention...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
        sudo tee /usr/local/bin/qsights_preprod_backup_cleanup.sh > /dev/null << 'EOS'
#!/bin/bash
set -e

BACKUP_DIR="/home/ubuntu/backups/preprod"
LOG_FILE="/var/log/qsights/preprod/backup_cleanup.log"

mkdir -p "$(dirname "$LOG_FILE")"

{
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] cleanup start"
    cd "$BACKUP_DIR" 2>/dev/null || { echo "backup dir missing: $BACKUP_DIR"; exit 0; }

    # Keep newest 2 tar.gz files per prefix (backend_/frontend_/db_)
    for prefix in backend_ frontend_ db_; do
        ls -1t "${prefix}"*.tar.gz 2>/dev/null | tail -n +3 | while read f; do
            echo "Deleting $f"
            rm -f -- "$f"
        done
    done

    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] cleanup end"
} >> "$LOG_FILE" 2>&1
EOS

        sudo chmod +x /usr/local/bin/qsights_preprod_backup_cleanup.sh

        # Daily cleanup at 03:10 UTC
        sudo crontab -l 2>/dev/null | grep -q 'qsights_preprod_backup_cleanup.sh' && echo 'Backup cleanup cron already configured' || {
                (sudo crontab -l 2>/dev/null; echo '10 3 * * * /usr/local/bin/qsights_preprod_backup_cleanup.sh') | sudo crontab -
                echo 'Backup cleanup cron configured'
        }
"
echo -e "${GREEN}✓ Backup retention configured${NC}"
echo ""

# Restart services
echo -e "${YELLOW}[11/12] Restarting Services...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo 'Restarting Nginx...'
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo 'Nginx status:'
    sudo systemctl status nginx --no-pager | head -10
    
    echo ''
    echo 'Note: PM2 processes (frontend/queue) can be started after deploying code:'
    echo '  pm2 start /home/ubuntu/ecosystem.preprod.config.js'
    echo '  pm2 save'
"
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Final verification
echo -e "${YELLOW}[12/12] Final Verification...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo '=== Directory Structure ==='
    ls -la /var/www/ 2>/dev/null || true
    echo ''

    echo '=== Nginx Status ==='
    sudo systemctl is-active nginx || true
    echo ''

    echo '=== PHP-FPM Sockets ==='
    ls -la /var/run/php/php*-fpm.sock 2>/dev/null || true
    echo ''

    echo '=== Listening Ports ==='
    sudo ss -tlnp | grep -E ':(80|443|3000)' || echo 'No services listening yet'
    echo ''

    echo '=== Cron (scheduler) ==='
    sudo crontab -l 2>/dev/null | grep 'schedule:run' || echo 'Cron not configured'
    echo ''

    echo '=== Disk Space ==='
    df -h / | tail -1
    echo ''

    echo '=== Memory ==='
    free -h | grep Mem || true
"
echo -e "${GREEN}✓ Verification complete${NC}"
echo ""

# Summary
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Pre-Prod Server Setup Complete!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Server Configuration:${NC}"
echo "  ✓ Directory structure created"
echo "  ✓ Nginx configured and running"
echo "  ✓ PM2 ecosystem file created"
echo "  ✓ Logs directory created"
echo "  ✓ Backup directory created"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Deploy backend:  ./deploy_backend_preprod.sh"
echo "  2. Deploy frontend: ./deploy_frontend_preprod.sh"
echo "  3. Test the site:   http://$SERVER_IP"
echo "  4. (Optional) Setup SSL for https://preprod.qsights.com"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  SSH:        ssh -i $PEM_KEY ubuntu@$SERVER_IP"
echo "  PM2 logs:   ssh and run: pm2 logs"
echo "  Nginx logs: ssh and run: sudo tail -f /var/log/nginx/error.log"
echo ""
