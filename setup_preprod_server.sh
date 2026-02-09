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

# Check connectivity
echo -e "${YELLOW}[1/10] Checking Server Connectivity...${NC}"
if ! ping -c 1 -W 5 "$SERVER_IP" &> /dev/null; then
    echo -e "${RED}✗ Server is not responding${NC}"
    echo ""
    echo -e "${YELLOW}Server appears to be down. Options:${NC}"
    echo "  1. Run: ./check_and_start_preprod.sh (to start the EC2 instance)"
    echo "  2. Check AWS console to verify instance status"
    echo "  3. Verify security groups allow SSH (port 22)"
    exit 1
fi
echo -e "${GREEN}✓ Server is reachable${NC}"
echo ""

# Verify SSH access
echo -e "${YELLOW}[2/10] Verifying SSH Access...${NC}"
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "echo 'SSH OK'" &> /dev/null; then
    echo -e "${RED}✗ Cannot connect via SSH${NC}"
    echo "  • Verify PEM key permissions: chmod 400 $PEM_KEY"
    echo "  • Check security group allows SSH from your IP"
    exit 1
fi
echo -e "${GREEN}✓ SSH access verified${NC}"
echo ""

# Check current setup
echo -e "${YELLOW}[3/10] Checking Current Server Setup...${NC}"
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
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
sudo tee /etc/nginx/sites-available/preprod.qsights.com > /dev/null << 'EOF'
# QSights Pre-Production Server Configuration
# Domain: preprod.qsights.com
# IP: 3.110.94.207

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name preprod.qsights.com 3.110.94.207;
    
    # Allow direct IP access for testing
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:1199;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if (\\\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 \"healthy\n\";
        add_header Content-Type text/plain;
    }
}

# HTTPS server (if SSL is configured)
# server {
#     listen 443 ssl http2;
#     server_name preprod.qsights.com;
#     
#     ssl_certificate /etc/letsencrypt/live/preprod.qsights.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/preprod.qsights.com/privkey.pem;
#     
#     # Same location blocks as above
# }
EOF

echo 'Nginx configuration created'
"
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
echo -e "${YELLOW}[7/10] Checking Required Packages...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
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
"
echo -e "${GREEN}✓ Package check complete${NC}"
echo ""

# Setup PM2 ecosystem
echo -e "${YELLOW}[8/10] Creating PM2 Ecosystem Configuration...${NC}"
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
    }
  ]
};
EOF

echo 'PM2 ecosystem configuration created'
"
echo -e "${GREEN}✓ PM2 ecosystem configuration created${NC}"
echo ""

# Restart services
echo -e "${YELLOW}[9/10] Restarting Services...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo 'Restarting Nginx...'
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo 'Nginx status:'
    sudo systemctl status nginx --no-pager | head -10
    
    echo ''
    echo 'Note: PM2 processes need to be started after deploying code'
"
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Final verification
echo -e "${YELLOW}[10/10] Final Verification...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo '=== Directory Structure ==='
    ls -la /var/www/
    echo ''
    
    echo '=== Nginx Status ==='
    sudo systemctl is-active nginx
    echo ''
    
    echo '=== Listening Ports ==='
    sudo netstat -tlnp | grep -E ':(80|443|3000|1199)' || echo 'No services listening yet'
    echo ''
    
    echo '=== Disk Space ==='
    df -h / | tail -1
    echo ''
    
    echo '=== Memory ==='
    free -h | grep Mem
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
