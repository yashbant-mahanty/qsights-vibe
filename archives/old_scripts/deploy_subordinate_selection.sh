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



# Deployment script for Subordinate Selection Enhancement
# Date: February 6, 2026
# Feature: Allow admin to select specific subordinates for evaluation

set -e  # Exit on error

echo "========================================"
echo "Deploying Subordinate Selection Feature"
echo "========================================"
echo ""

# Configuration
SERVER_USER="ubuntu"
SERVER_IP="13.126.210.220"
PEM_FILE="/Users/yash/Documents/Projects/QSightsOrg2.0/QSights-Mumbai-12Aug2019.pem"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"

echo "Step 1: Deploying Backend Changes..."
echo "-----------------------------------"

# Upload backend controller
scp -i "$PEM_FILE" \
  backend/app/Http/Controllers/Api/EvaluationTriggerController.php \
  ${SERVER_USER}@${SERVER_IP}:/tmp/

# Move to production and set permissions
ssh -i "$PEM_FILE" ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # Backend
  sudo cp /tmp/EvaluationTriggerController.php ${BACKEND_PATH}/app/Http/Controllers/Api/
  sudo chown www-data:www-data ${BACKEND_PATH}/app/Http/Controllers/Api/EvaluationTriggerController.php
  sudo chmod 644 ${BACKEND_PATH}/app/Http/Controllers/Api/EvaluationTriggerController.php
  
  echo "✅ Backend files deployed"
ENDSSH

echo ""
echo "Step 2: Building Frontend..."
echo "----------------------------"

cd frontend
npm run build

echo ""
echo "Step 3: Deploying Frontend..."
echo "----------------------------"

# Upload frontend build
scp -i "$PEM_FILE" -r .next/static ${SERVER_USER}@${SERVER_IP}:/tmp/
scp -i "$PEM_FILE" .next/BUILD_ID ${SERVER_USER}@${SERVER_IP}:/tmp/

# Move to production
ssh -i "$PEM_FILE" ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # Remove old static files
  sudo rm -rf ${FRONTEND_PATH}/.next/static/*
  
  # Copy new files
  sudo cp -r /tmp/static ${FRONTEND_PATH}/.next/
  sudo cp /tmp/BUILD_ID ${FRONTEND_PATH}/.next/
  
  # Set permissions
  sudo chown -R www-data:www-data ${FRONTEND_PATH}/.next
  sudo chmod -R 755 ${FRONTEND_PATH}/.next
  
  # Clean up temp files
  rm -rf /tmp/static
  rm /tmp/BUILD_ID
  rm /tmp/EvaluationTriggerController.php
  
  echo "✅ Frontend files deployed"
ENDSSH

echo ""
echo "Step 4: Restarting Services..."
echo "------------------------------"

ssh -i "$PEM_FILE" ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # Restart frontend
  pm2 restart qsights-frontend
  
  echo "✅ Services restarted"
ENDSSH

echo ""
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "📋 What's New:"
echo "  • Subordinate selection UI in evaluator selection"
echo "  • Admin can select/deselect specific subordinates"
echo "  • All subordinates selected by default"
echo "  • Only selected subordinates shown to evaluator"
echo ""
echo "🧪 Test the feature:"
echo "  1. Go to Evaluation System → Trigger tab"
echo "  2. Select evaluation form"
echo "  3. Filter by department and select evaluators"
echo "  4. Each evaluator shows subordinates list"
echo "  5. Select/deselect subordinates as needed"
echo "  6. Trigger evaluation"
echo ""
echo "🌐 Production URL: https://prod.qsights.com/evaluation-new"
echo ""
