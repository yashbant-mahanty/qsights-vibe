#!/bin/bash

###############################################################################
# ⚠️  DEPRECATION WARNING ⚠️
#
# This script uses the OLD deployment workflow.
#
# NEW MANDATORY WORKFLOW (as of Feb 7, 2026):
#   1. Deploy to Pre-Prod first: ./deploy_backend_preprod.sh
#   2. Test on Pre-Prod for 24+ hours
#   3. Then deploy to Production: ./deploy_backend_prod.sh
#
# This script is kept for reference only.
# For new deployments, use the new workflow scripts.
#
# Documentation:
#   - DEPLOYMENT_CHECKLIST.md
#   - DEPLOYMENT_WORKFLOW_GUIDE.md
#   - DEPLOYMENT_QUICK_REFERENCE.md
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "⚠️  DEPRECATION WARNING"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This script uses the OLD deployment workflow."
echo ""
echo "NEW MANDATORY WORKFLOW (as of Feb 7, 2026):"
echo "  1. Deploy to Pre-Prod: ./deploy_backend_preprod.sh or ./deploy_frontend_preprod.sh"
echo "  2. Test for 24+ hours"
echo "  3. Deploy to Production: ./deploy_backend_prod.sh or ./deploy_frontend_prod.sh"
echo ""
echo "Read: DEPLOYMENT_QUICK_REFERENCE.md for quick guide"
echo ""
read -p "Do you want to continue with this OLD script? (yes/no): " CONTINUE

if [ "$CONTINUE" != "yes" ]; then
    echo "Deployment cancelled. Please use new workflow scripts."
    exit 0
fi

echo ""
echo "Proceeding with OLD deployment script..."
echo ""
sleep 2

###############################################################################
# Original script continues below
###############################################################################


# Quick Deployment Script for Evaluation Program Linkage Fix
# Date: 2 February 2026

echo "======================================================================"
echo "Evaluation Program Linkage Bug Fix - Deployment Script"
echo "======================================================================"
echo ""

# Production server details
SERVER="ubuntu@13.126.210.220"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"

echo "Step 1: Copying SQL fix script to production server..."
scp -i $PEM_KEY backend/fix_evaluation_program_linkage.sql $SERVER:/tmp/
if [ $? -eq 0 ]; then
    echo "✅ SQL script copied successfully"
else
    echo "❌ Failed to copy SQL script"
    exit 1
fi

echo ""
echo "Step 2: Deploying backend code..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
    cd /var/www/backend
    echo "Pulling latest code from repository..."
    git pull origin main
    
    echo "Clearing Laravel caches..."
    php artisan config:clear
    php artisan cache:clear
    php artisan view:clear
    
    echo "✅ Backend code deployed"
ENDSSH

echo ""
echo "Step 3: Running database fix script..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
    echo "Executing SQL script to fix existing data..."
    sudo -u postgres psql qsights_db -f /tmp/fix_evaluation_program_linkage.sql > /tmp/fix_output.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Database fix script executed successfully"
        echo ""
        echo "Results:"
        cat /tmp/fix_output.log | grep -E "(Step [0-9]|Updated|ITES)"
    else
        echo "❌ Failed to execute database fix script"
        cat /tmp/fix_output.log
        exit 1
    fi
ENDSSH

echo ""
echo "======================================================================"
echo "✅ Deployment Complete!"
echo "======================================================================"
echo ""
echo "Next Steps:"
echo "1. Log in as super-admin"
echo "2. Go to Evaluation page"
echo "3. Select program 'QSights-Program-01' from filter"
echo "4. Verify:"
echo "   - Department 'ITES' shows"
echo "   - Roles 'AGH' and 'Manager' show"
echo "   - Staff show: Yashbant Mahanty, Ashwin TK, Jayalakshmi T"
echo "   - Hierarchy mappings show correctly"
echo ""
echo "======================================================================"
