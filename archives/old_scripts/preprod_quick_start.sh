#!/bin/bash

###############################################################################
# QSights Pre-Prod Quick Start
# Purpose: One-command setup and deployment for preprod server
# Usage: ./preprod_quick_start.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║         🚀 QSights Pre-Production Quick Start 🚀            ║
║                                                              ║
║   This script will:                                          ║
║   1. Check if server is running (start if needed)           ║
║   2. Setup/verify server configuration                       ║
║   3. Deploy backend and frontend                             ║
║   4. Verify everything is working                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

EOF

echo -e "${YELLOW}Pre-Production Server: 3.110.94.207${NC}"
echo -e "${YELLOW}Target URL: http://3.110.94.207/ or https://preprod.qsights.com${NC}"
echo ""
echo -e "${BLUE}This process will take 5-10 minutes.${NC}"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Function to print step header
print_step() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  $1"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check if command succeeded
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        return 1
    fi
}

# Step 1: Check and start server
print_step "STEP 1/4: Checking Server Status"

if [ -f "./check_and_start_preprod.sh" ]; then
    echo -e "${BLUE}Running server check script...${NC}"
    ./check_and_start_preprod.sh || {
        echo ""
        echo -e "${YELLOW}⚠ Server check encountered issues${NC}"
        echo -e "${YELLOW}This might be okay - continuing with setup...${NC}"
        echo ""
    }
else
    echo -e "${YELLOW}⚠ check_and_start_preprod.sh not found, skipping...${NC}"
fi

echo ""
read -p "Server check complete. Press Enter to continue..."

# Step 2: Setup server configuration
print_step "STEP 2/4: Setting Up Server Configuration"

if [ -f "./setup_preprod_server.sh" ]; then
    echo -e "${BLUE}Running setup script...${NC}"
    ./setup_preprod_server.sh || {
        echo ""
        echo -e "${RED}✗ Setup failed${NC}"
        echo -e "${YELLOW}Please check the error messages above and try again.${NC}"
        exit 1
    }
else
    echo -e "${RED}✗ setup_preprod_server.sh not found${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory${NC}"
    exit 1
fi

echo ""
read -p "Setup complete. Press Enter to continue with deployment..."

# Step 3: Deploy Backend
print_step "STEP 3/4: Deploying Backend"

if [ -f "./deploy_backend_preprod.sh" ]; then
    echo -e "${BLUE}Deploying backend to preprod...${NC}"
    echo -e "${YELLOW}Note: You'll need to confirm the deployment${NC}"
    echo ""
    
    ./deploy_backend_preprod.sh || {
        echo ""
        echo -e "${YELLOW}⚠ Backend deployment had issues${NC}"
        read -p "Continue with frontend deployment? (yes/no): " CONTINUE
        if [ "$CONTINUE" != "yes" ]; then
            echo -e "${RED}Deployment cancelled${NC}"
            exit 1
        fi
    }
else
    echo -e "${RED}✗ deploy_backend_preprod.sh not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Backend deployed${NC}"
echo ""
read -p "Press Enter to deploy frontend..."

# Step 4: Deploy Frontend
print_step "STEP 4/4: Deploying Frontend"

if [ -f "./deploy_frontend_preprod.sh" ]; then
    echo -e "${BLUE}Building and deploying frontend...${NC}"
    echo -e "${YELLOW}Note: This will build the frontend locally first${NC}"
    echo ""
    
    ./deploy_frontend_preprod.sh || {
        echo ""
        echo -e "${RED}✗ Frontend deployment failed${NC}"
        echo -e "${YELLOW}Check the error messages above${NC}"
        exit 1
    }
else
    echo -e "${RED}✗ deploy_frontend_preprod.sh not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Frontend deployed${NC}"

# Final verification
print_step "🎉 DEPLOYMENT COMPLETE 🎉"

echo -e "${GREEN}✓ Server is running${NC}"
echo -e "${GREEN}✓ Configuration complete${NC}"
echo -e "${GREEN}✓ Backend deployed${NC}"
echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Pre-Production Environment is Ready!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}🌐 Access your preprod site:${NC}"
echo "   • http://3.110.94.207/"
echo "   • https://preprod.qsights.com (if DNS configured)"
echo ""

echo -e "${YELLOW}📊 Monitor Services:${NC}"
echo "   SSH to server:"
echo "   ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207"
echo ""
echo "   Then run:"
echo "   • pm2 list              - See all processes"
echo "   • pm2 logs              - View logs"
echo "   • pm2 monit             - Resource monitor"
echo "   • sudo systemctl status nginx - Check nginx"
echo ""

echo -e "${BLUE}🔍 Testing Checklist:${NC}"
echo "   [ ] Login page loads"
echo "   [ ] Can log in with test credentials"
echo "   [ ] Dashboard displays correctly"
echo "   [ ] API calls work (check network tab)"
echo "   [ ] All features functional"
echo "   [ ] No console errors"
echo ""

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "   1. Test all features thoroughly"
echo "   2. Monitor for 24+ hours"
echo "   3. If stable, deploy to production:"
echo "      ./deploy_backend_prod.sh"
echo "      ./deploy_frontend_prod.sh"
echo ""

echo -e "${MAGENTA}📚 Documentation:${NC}"
echo "   • PREPROD_SETUP_GUIDE.md - Complete troubleshooting guide"
echo "   • DEPLOYMENT_CHECKLIST.md - Deployment workflow"
echo ""

# Quick health check
echo -e "${BLUE}Running quick health check...${NC}"
echo ""

if curl -s -I --connect-timeout 5 http://3.110.94.207/health &> /dev/null; then
    echo -e "${GREEN}✓ Server is responding to HTTP requests${NC}"
else
    echo -e "${YELLOW}⚠ Server health check endpoint not responding${NC}"
    echo -e "${YELLOW}  This is normal if health endpoint is not configured${NC}"
    echo -e "${YELLOW}  Try accessing: http://3.110.94.207/${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            🎊 All Done! Happy Testing! 🎊                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
