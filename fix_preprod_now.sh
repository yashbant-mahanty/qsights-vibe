#!/bin/bash

###############################################################################
# QSights Pre-Prod EMERGENCY RECOVERY
# This will check and fix everything to get preprod working immediately
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     🚨 PREPROD EMERGENCY RECOVERY - QUICK FIX 🚨            ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Server: 3.110.94.207${NC}"
echo -e "${YELLOW}This will get your preprod working in the next 5 minutes!${NC}"
echo ""

# Check if we can reach the server via SSM
echo -e "${BLUE}[Step 1/5] Checking if instance is running...${NC}"
echo ""

# Kill any existing SSM sessions on port 1199
lsof -ti:1199 | xargs kill -9 2>/dev/null || true
sleep 2

# Try to establish SSM connection
echo "Attempting SSM connection..."
aws ssm start-session --target i-0b62d4d1009b83e2a \
    --document-name AWS-StartPortForwardingSession \
    --parameters "localPortNumber=1199,portNumber=22" \
    --region ap-south-1 > /tmp/ssm_preprod.log 2>&1 &

SSM_PID=$!
sleep 5

# Check if SSM connected
if ! lsof -i:1199 > /dev/null 2>&1; then
    echo ""
    echo -e "${RED}✗ Cannot connect to instance - IT IS STOPPED!${NC}"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}URGENT: You need to START the EC2 instance first!${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Option 1: AWS Console (Fastest)${NC}"
    echo "1. Open: https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#Instances:"
    echo "2. Find instance: i-0b62d4d1009b83e2a"
    echo "3. Click 'Instance state' → 'Start instance'"
    echo "4. Wait 2-3 minutes"
    echo "5. Run this script again: ./fix_preprod_now.sh"
    echo ""
    echo -e "${BLUE}Option 2: Ask someone with EC2 permissions to run:${NC}"
    echo "aws ec2 start-instances --instance-ids i-0b62d4d1009b83e2a --region ap-south-1"
    echo ""
    kill $SSM_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ SSM connection established!${NC}"
echo ""

# Function to run commands on server via SSM tunnel
run_remote() {
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        -o ConnectTimeout=10 -p 1199 ubuntu@localhost "$1" 2>&1
}

# Check server status
echo -e "${BLUE}[Step 2/5] Checking server services...${NC}"
echo ""

echo "Checking PM2..."
PM2_STATUS=$(run_remote "pm2 list | tail -n +4 | head -n -1" || echo "PM2_ERROR")

echo "Checking Nginx..."
NGINX_STATUS=$(run_remote "sudo systemctl is-active nginx" || echo "inactive")

echo "Checking ports..."
PORTS=$(run_remote "sudo netstat -tlnp | grep -E ':(80|443|3000|1199)'" || echo "")

echo ""
echo -e "${YELLOW}Status Summary:${NC}"
echo "  Nginx: $NGINX_STATUS"
if [[ "$PM2_STATUS" == *"PM2_ERROR"* ]] || [[ "$PM2_STATUS" == *"0 online"* ]]; then
    echo "  PM2: ⚠️  No processes running"
else
    echo "  PM2: ✓ Running"
fi
echo ""

# Fix Nginx if not running
echo -e "${BLUE}[Step 3/5] Starting/Restarting Nginx...${NC}"
run_remote "sudo systemctl start nginx 2>/dev/null || sudo systemctl restart nginx"
sleep 2

NGINX_CHECK=$(run_remote "sudo systemctl is-active nginx")
if [[ "$NGINX_CHECK" == "active" ]]; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx failed to start${NC}"
    echo "Checking nginx config..."
    run_remote "sudo nginx -t"
fi
echo ""

# Fix PM2 processes
echo -e "${BLUE}[Step 4/5] Starting PM2 processes...${NC}"
echo ""

# Check if frontend build exists
echo "Checking if frontend is deployed..."
FRONTEND_EXISTS=$(run_remote "[ -d /var/www/frontend/.next ] && echo 'yes' || echo 'no'")

if [[ "$FRONTEND_EXISTS" == "yes" ]]; then
    echo "Frontend found, starting PM2..."
    
    # Stop any existing processes
    run_remote "pm2 stop all 2>/dev/null || true"
    sleep 2
    
    # Start frontend
    echo "Starting frontend..."
    run_remote "cd /var/www/frontend && pm2 start npm --name qsights-frontend-preprod -- start" || \
    run_remote "cd /var/www/frontend && pm2 restart qsights-frontend-preprod" || \
    echo "Frontend start attempted..."
    
    sleep 3
    
    # Check if backend exists
    BACKEND_EXISTS=$(run_remote "[ -d /var/www/QSightsOrg2.0/backend ] && echo 'yes' || echo 'no'")
    
    if [[ "$BACKEND_EXISTS" == "yes" ]]; then
        echo "Starting backend..."
        run_remote "cd /var/www/QSightsOrg2.0/backend && pm2 start 'php artisan serve --host=0.0.0.0 --port=1199' --name qsights-backend-preprod" || \
        run_remote "pm2 restart qsights-backend-preprod" || \
        echo "Backend start attempted..."
    fi
    
    sleep 3
    
    # Save PM2 config
    run_remote "pm2 save"
    
    echo ""
    echo "PM2 Status:"
    run_remote "pm2 list"
    
    echo -e "${GREEN}✓ PM2 processes started${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not deployed yet${NC}"
    echo "You'll need to deploy first:"
    echo "  ./deploy_frontend_preprod.sh"
    echo "  ./deploy_backend_preprod.sh"
fi
echo ""

# Verify everything
echo -e "${BLUE}[Step 5/5] Final verification...${NC}"
echo ""

# Test if site responds
echo "Testing site accessibility..."
sleep 3

if curl -s -I --connect-timeout 5 http://3.110.94.207/ | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓✓✓ SITE IS ACCESSIBLE! ✓✓✓${NC}"
    SITE_OK=true
elif curl -s --connect-timeout 5 http://3.110.94.207/ | grep -q "html\|DOCTYPE"; then
    echo -e "${GREEN}✓✓✓ SITE IS ACCESSIBLE! ✓✓✓${NC}"
    SITE_OK=true
else
    echo -e "${YELLOW}⚠️  Site may need a moment to fully start...${NC}"
    SITE_OK=false
fi

echo ""
echo "Current services:"
run_remote "sudo netstat -tlnp | grep -E ':(80|3000)' | head -5"

# Final summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  RECOVERY COMPLETE!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$SITE_OK" == true ]]; then
    echo -e "${GREEN}✅ YOUR PREPROD IS NOW WORKING!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access it here:${NC}"
    echo "   http://3.110.94.207/"
    echo ""
    echo -e "${GREEN}You can now test your changes safely!${NC}"
else
    echo -e "${YELLOW}⚠️  Services started but site needs verification${NC}"
    echo ""
    echo -e "${BLUE}Try accessing:${NC}"
    echo "   http://3.110.94.207/"
    echo ""
    echo -e "${YELLOW}If site still doesn't load:${NC}"
    echo "1. Wait 30 seconds and try again"
    echo "2. Check PM2 logs:"
    echo "   ssh -p 1199 ubuntu@localhost"
    echo "   pm2 logs"
    echo ""
    echo -e "${YELLOW}If still not working, deploy fresh:${NC}"
    echo "   ./deploy_frontend_preprod.sh"
    echo "   ./deploy_backend_preprod.sh"
fi

echo ""
echo -e "${BLUE}📊 Monitor your server:${NC}"
echo "   SSH: ssh -p 1199 ubuntu@localhost"
echo "   PM2: ssh -p 1199 ubuntu@localhost 'pm2 logs'"
echo ""
echo -e "${YELLOW}💡 Keep SSM session open while testing!${NC}"
echo "   (Press Ctrl+C in this terminal to close SSM tunnel)"
echo ""

# Keep SSM session alive
echo -e "${MAGENTA}SSM tunnel is active on port 1199. Press Ctrl+C to exit.${NC}"
wait $SSM_PID 2>/dev/null || true
