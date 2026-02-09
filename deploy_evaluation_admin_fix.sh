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



# Deploy Evaluation Admin Navigation Fix
# This fixes the issue where evaluation-admin role was not showing any tabs except Dashboard

echo "🚀 Deploying Evaluation Admin Navigation Fix..."
echo "================================================"
echo ""

# Step 1: Build frontend locally (already done)
echo "✅ Frontend build completed locally"
echo ""

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
cd frontend
tar -czf ../frontend-deploy.tar.gz .next/
cd ..
echo "✅ Package created"
echo ""

# Step 3: Upload to server
echo "📤 Uploading to production server..."
echo "Please run these commands manually (SSH key required):"
echo ""
echo "scp frontend-deploy.tar.gz ubuntu@13.126.210.220:/tmp/"
echo "ssh ubuntu@13.126.210.220 'cd /var/www/frontend && sudo rm -rf .next && sudo tar -xzf /tmp/frontend-deploy.tar.gz && sudo chown -R www-data:www-data .next && sudo systemctl restart frontend && rm /tmp/frontend-deploy.tar.gz'"
echo ""
echo "OR use File Transfer to upload frontend-deploy.tar.gz to server /tmp/"
echo ""

echo "🎯 Fix Details:"
echo "==============="
echo "1. Added 'evaluation-admin' to roles allowed to see Evaluation tab"
echo "2. Fixed service ID checks from wrong IDs to correct ones:"
echo "   - programs-view → list_programs"
echo "   - participants-view → list_participants"  
echo "   - questionnaires-view → category_list"
echo "   - activities-view → list_activity"
echo "   - reports-view → view_report"
echo "   - evaluation-view/evaluation-manage → list_evaluation/add_evaluation"
echo ""
echo "3. Credentials for testing:"
echo "   Email: bq-evaluation.evaladmin@qsights.com"
echo "   Password: dMoaQpf6iHpq"
echo ""
echo "After deployment, user should see ALL tabs:"
echo "- Dashboard"
echo "- Organizations (view only)"
echo "- Programs (view only)"
echo "- Questionnaires (full access)"
echo "- Events (full access)"
echo "- Evaluation (full access)"
echo "- Reports & Analytics (view/export)"
echo ""
