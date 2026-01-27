#!/bin/bash

# EVALUATION FEATURE DEPLOYMENT TO PRODUCTION
# Date: January 25, 2026
# Deploys new evaluation model and frontend components

set -e

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"

echo "🚀 DEPLOYING EVALUATION FEATURE TO PRODUCTION"
echo "=============================================="
echo ""

# Backend Deployment
echo "📦 Step 1: Deploying Backend Model..."
echo "-------------------------------------------"

# Deploy EvaluationDepartment Model to temp first, then move with sudo
echo "  → Copying EvaluationDepartment.php to temp..."
scp -i "$PEM_FILE" backend/app/Models/EvaluationDepartment.php "$SERVER:/tmp/"

echo "  → Moving to final location with sudo..."
ssh -i "$PEM_FILE" "$SERVER" "sudo mv /tmp/EvaluationDepartment.php $BACKEND_PATH/app/Models/ && sudo chown www-data:www-data $BACKEND_PATH/app/Models/EvaluationDepartment.php"

echo "  ✅ Backend model deployed"
echo ""

# Frontend Deployment
echo "📦 Step 2: Deploying Frontend Components..."
echo "-------------------------------------------"

# Create evaluation directory if it doesn't exist
echo "  → Creating components/evaluation directory..."
ssh -i "$PEM_FILE" "$SERVER" "sudo mkdir -p $FRONTEND_PATH/src/components/evaluation && sudo chown -R ubuntu:ubuntu $FRONTEND_PATH/src/components/evaluation"

# Deploy all evaluation components to temp first
echo "  → Uploading components to temp..."
scp -i "$PEM_FILE" frontend/src/components/evaluation/*.jsx "$SERVER:/tmp/"
scp -i "$PEM_FILE" frontend/src/components/evaluation/index.js "$SERVER:/tmp/"

echo "  → Moving components to final location..."
ssh -i "$PEM_FILE" "$SERVER" "sudo mv /tmp/EvaluationDashboard.jsx /tmp/DepartmentManager.jsx /tmp/RoleManager.jsx /tmp/StaffManager.jsx /tmp/HierarchyMapper.jsx /tmp/EvaluationTrigger.jsx /tmp/TakeEvaluation.jsx /tmp/index.js $FRONTEND_PATH/src/components/evaluation/ && sudo chown -R www-data:www-data $FRONTEND_PATH/src/components/evaluation/"

echo "  ✅ Frontend components deployed"
echo ""

# Cache Clear
echo "🔄 Step 3: Clearing Laravel Caches..."
echo "-------------------------------------------"
ssh -i "$PEM_FILE" "$SERVER" "cd $BACKEND_PATH && php artisan config:clear && php artisan route:clear && php artisan cache:clear && php artisan view:clear"

echo "  ✅ Caches cleared"
echo ""

# Restart Services
echo "🔄 Step 4: Restarting Services..."
echo "-------------------------------------------"

# Restart PM2 for frontend (Next.js)
echo "  → Restarting frontend (PM2)..."
ssh -i "$PEM_FILE" "$SERVER" "pm2 restart qsights-frontend || pm2 restart all"

echo "  ✅ Services restarted"
echo ""

# Verify Deployment
echo "✅ DEPLOYMENT COMPLETE"
echo "====================="
echo ""
echo "Deployed Files:"
echo "  Backend:"
echo "    - app/Models/EvaluationDepartment.php"
echo ""
echo "  Frontend:"
echo "    - src/components/evaluation/EvaluationDashboard.jsx"
echo "    - src/components/evaluation/DepartmentManager.jsx"
echo "    - src/components/evaluation/RoleManager.jsx"
echo "    - src/components/evaluation/StaffManager.jsx"
echo "    - src/components/evaluation/HierarchyMapper.jsx"
echo "    - src/components/evaluation/EvaluationTrigger.jsx"
echo "    - src/components/evaluation/TakeEvaluation.jsx"
echo "    - src/components/evaluation/index.js"
echo ""
echo "📍 Evaluation Feature Status:"
echo "  - Main Page: https://prod.qsights.com/evaluation-new"
echo "  - My Evaluations: https://prod.qsights.com/evaluation/my-evaluations"
echo "  - Take Evaluation: https://prod.qsights.com/evaluation/take/{token}"
echo ""
echo "🧪 Next Steps:"
echo "  1. Test the evaluation system at /evaluation-new"
echo "  2. Verify department, role, staff management"
echo "  3. Test hierarchy mapping (parent-child UI)"
echo "  4. Trigger test evaluation"
echo "  5. Complete evaluation form via token link"
echo ""
echo "⚠️  Note: Existing /evaluation-new page remains functional"
echo "   New modular components are available for integration"
echo ""
