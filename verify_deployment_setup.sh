#!/bin/bash

###############################################################################
# Deployment Workflow Verification Script
# 
# Purpose: Verify all deployment workflow components are correctly set up
# Usage: ./verify_deployment_setup.sh
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Deployment Workflow Setup Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

ERRORS=0
WARNINGS=0
SUCCESS=0

# Check function
check_file() {
    FILE=$1
    DESC=$2
    REQUIRED=$3
    
    if [ -f "$FILE" ]; then
        # Check if executable (for scripts)
        if [[ "$FILE" == *.sh ]]; then
            if [ -x "$FILE" ]; then
                echo -e "${GREEN}✅ $DESC${NC}"
                echo "   File: $FILE (executable)"
                ((SUCCESS++))
            else
                echo -e "${YELLOW}⚠️  $DESC${NC}"
                echo "   File: $FILE (NOT executable)"
                echo "   Fix: chmod +x $FILE"
                ((WARNINGS++))
            fi
        else
            echo -e "${GREEN}✅ $DESC${NC}"
            echo "   File: $FILE"
            ((SUCCESS++))
        fi
    else
        if [ "$REQUIRED" == "required" ]; then
            echo -e "${RED}❌ $DESC${NC}"
            echo "   File NOT FOUND: $FILE"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  $DESC${NC}"
            echo "   File NOT FOUND: $FILE (optional)"
            ((WARNINGS++))
        fi
    fi
}

# Check PEM key
check_pem_key() {
    PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
    
    if [ -f "$PEM_KEY" ]; then
        PERMS=$(stat -f "%Lp" "$PEM_KEY")
        if [ "$PERMS" == "400" ] || [ "$PERMS" == "600" ]; then
            echo -e "${GREEN}✅ PEM Key${NC}"
            echo "   File: $PEM_KEY (permissions: $PERMS)"
            ((SUCCESS++))
        else
            echo -e "${YELLOW}⚠️  PEM Key${NC}"
            echo "   File: $PEM_KEY (permissions: $PERMS)"
            echo "   Fix: chmod 400 $PEM_KEY"
            ((WARNINGS++))
        fi
    else
        echo -e "${RED}❌ PEM Key${NC}"
        echo "   File NOT FOUND: $PEM_KEY"
        ((ERRORS++))
    fi
}

# Check network connectivity
check_connectivity() {
    SERVER=$1
    NAME=$2
    
    echo -n "Checking $NAME connectivity ($SERVER)... "
    if timeout 5 bash -c "ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$SERVER 'exit' 2>/dev/null"; then
        echo -e "${GREEN}✅ Connected${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Cannot connect${NC}"
        echo "   Note: This may be due to security groups or VPN requirement"
        echo "   Try SSM: aws ssm start-session --target <instance-id>"
        ((WARNINGS++))
    fi
}

echo -e "${BLUE}1. Checking Environment Configuration Files...${NC}"
echo ""
check_file ".env.local" "Local environment config" "required"
check_file ".env.preprod" "Pre-Prod environment config" "required"
check_file ".env.production" "Production environment config" "required"
echo ""

echo -e "${BLUE}2. Checking Pre-Production Deployment Scripts...${NC}"
echo ""
check_file "deploy_backend_preprod.sh" "Pre-Prod backend deployment script" "required"
check_file "deploy_frontend_preprod.sh" "Pre-Prod frontend deployment script" "required"
echo ""

echo -e "${BLUE}3. Checking Production Deployment Scripts...${NC}"
echo ""
check_file "deploy_backend_prod.sh" "Production backend deployment script" "required"
check_file "deploy_frontend_prod.sh" "Production frontend deployment script" "required"
echo ""

echo -e "${BLUE}4. Checking Rollback Scripts...${NC}"
echo ""
check_file "rollback_backend_prod.sh" "Backend rollback script" "required"
check_file "rollback_frontend_prod.sh" "Frontend rollback script" "required"
echo ""

echo -e "${BLUE}5. Checking Documentation Files...${NC}"
echo ""
check_file "DEPLOYMENT_CHECKLIST.md" "Deployment checklist" "required"
check_file "DEPLOYMENT_WORKFLOW_GUIDE.md" "Deployment workflow guide" "required"
check_file "DEPLOYMENT_QUICK_REFERENCE.md" "Quick reference card" "required"
check_file "DEPLOYMENT_WORKFLOW_IMPLEMENTATION_SUMMARY.md" "Implementation summary" "optional"
echo ""

echo -e "${BLUE}6. Checking Utility Scripts...${NC}"
echo ""
check_file "update_old_deployment_scripts.sh" "Old script updater" "optional"
echo ""

echo -e "${BLUE}7. Checking PEM Key...${NC}"
echo ""
check_pem_key
echo ""

echo -e "${BLUE}8. Checking Server Connectivity...${NC}"
echo ""
check_connectivity "3.110.94.207" "Pre-Prod"
check_connectivity "13.126.210.220" "Production"
echo ""

echo -e "${BLUE}9. Checking Local Project Structure...${NC}"
echo ""

if [ -d "backend" ]; then
    echo -e "${GREEN}✅ Backend directory exists${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}❌ Backend directory NOT FOUND${NC}"
    ((ERRORS++))
fi

if [ -d "frontend" ]; then
    echo -e "${GREEN}✅ Frontend directory exists${NC}"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️  Frontend directory NOT FOUND${NC}"
    echo "   Note: This may be expected if frontend is in separate location"
    ((WARNINGS++))
fi

if [ -f "backend/composer.json" ]; then
    echo -e "${GREEN}✅ Backend composer.json exists${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}❌ Backend composer.json NOT FOUND${NC}"
    ((ERRORS++))
fi

echo ""

echo -e "${BLUE}10. Checking Git Status...${NC}"
echo ""

if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Git repository initialized${NC}"
    ((SUCCESS++))
    
    # Check for uncommitted changes
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${GREEN}✅ No uncommitted changes${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
        echo "   Commit changes before deploying"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Not a Git repository${NC}"
    ((ERRORS++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Verification Results"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Success: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}   🎉 ALL CHECKS PASSED!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "✅ Your deployment workflow is fully set up and ready to use!"
        echo ""
        echo "Next steps:"
        echo "  1. Read: DEPLOYMENT_QUICK_REFERENCE.md"
        echo "  2. Test Pre-Prod deployment: ./deploy_backend_preprod.sh"
        echo "  3. Share documentation with team"
        echo ""
        exit 0
    else
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}   ⚠️  SETUP COMPLETE WITH WARNINGS${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Your deployment workflow is functional but has some warnings."
        echo "Review warnings above and fix if needed."
        echo ""
        exit 0
    fi
else
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}   ❌ SETUP INCOMPLETE${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Please fix the errors above before using the deployment workflow."
    echo ""
    echo "Common fixes:"
    echo "  • Missing files: Create them using the implementation guide"
    echo "  • Not executable: chmod +x <script>.sh"
    echo "  • PEM key not found: Check path in scripts"
    echo ""
    exit 1
fi
