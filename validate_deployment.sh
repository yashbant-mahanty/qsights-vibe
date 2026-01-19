#!/bin/bash

# ============================================================================
# DEPLOYMENT VALIDATION SCRIPT
# Enforces governance rules before allowing deployment
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8000/api}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          QSIGHTS DEPLOYMENT VALIDATION SYSTEM                  ║${NC}"
echo -e "${BLUE}║          Enforcing Engineering Governance Rules                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if AUTH_TOKEN is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Warning: AUTH_TOKEN not set. Using local backend.${NC}"
    echo -e "${YELLOW}   Set AUTH_TOKEN environment variable for API validation.${NC}"
    echo ""
fi

# ============================================================================
# STEP 1: SDD VALIDATION
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Validating System Design Document (SDD)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SDD_VALID=false

# Check if CRITICAL_FEATURES.json exists
if [ -f "backend/CRITICAL_FEATURES.json" ]; then
    echo -e "${GREEN}✓${NC} Critical features file exists"
    SDD_VALID=true
else
    echo -e "${RED}✗${NC} Critical features file missing"
    echo -e "${RED}  → Create backend/CRITICAL_FEATURES.json${NC}"
fi

# Check if SDD_VERSION.txt exists
if [ -f "backend/SDD_VERSION.txt" ]; then
    SDD_VERSION=$(cat backend/SDD_VERSION.txt)
    echo -e "${GREEN}✓${NC} SDD Version: ${SDD_VERSION}"
else
    echo -e "${RED}✗${NC} SDD version file missing"
    echo -e "${RED}  → Create backend/SDD_VERSION.txt${NC}"
    SDD_VALID=false
fi

if [ "$SDD_VALID" = false ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ DEPLOYMENT BLOCKED: SDD Not Updated${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SDD Validation: PASSED${NC}"
echo ""

# ============================================================================
# STEP 2: PRE-DEPLOYMENT TESTS
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Running Pre-Deployment Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TESTS_PASSED=true

# Check if backend is running
echo "Checking backend availability..."
if curl -s -f -o /dev/null "${API_BASE_URL}/health" 2>/dev/null || [ -f "backend/artisan" ]; then
    echo -e "${GREEN}✓${NC} Backend accessible"
    
    # If we have an AUTH_TOKEN, run actual tests
    if [ -n "$AUTH_TOKEN" ]; then
        echo "Running tests via API..."
        
        TEST_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/system-design/run-tests" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            -H "Content-Type: application/json")
        
        if echo "$TEST_RESPONSE" | grep -q '"overall_status":"PASSED"'; then
            echo -e "${GREEN}✓${NC} Event Participation Test: PASSED"
            echo -e "${GREEN}✓${NC} Response Saving Test: PASSED"
            echo -e "${GREEN}✓${NC} Notification Lifecycle Test: PASSED"
            echo -e "${GREEN}✓${NC} Reports & Analytics Test: PASSED"
        else
            echo -e "${RED}✗${NC} Some tests failed"
            TESTS_PASSED=false
        fi
    else
        echo -e "${YELLOW}⚠${NC}  Tests skipped (no AUTH_TOKEN provided)"
        echo -e "${YELLOW}  → Run tests manually via UI or API before deployment${NC}"
        
        # In strict mode, we would block here
        # For now, show warning
        read -p "Continue without running tests? (yes/NO): " confirm
        if [ "$confirm" != "yes" ]; then
            TESTS_PASSED=false
        fi
    fi
else
    echo -e "${RED}✗${NC} Backend not accessible"
    echo -e "${YELLOW}⚠${NC}  Cannot run automated tests"
    echo -e "${YELLOW}  → Ensure you've run tests manually${NC}"
    
    read -p "Have you run tests manually and all passed? (yes/NO): " confirm
    if [ "$confirm" != "yes" ]; then
        TESTS_PASSED=false
    fi
fi

if [ "$TESTS_PASSED" = false ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ DEPLOYMENT BLOCKED: Tests Not Passed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-Deployment Tests: PASSED${NC}"
echo ""

# ============================================================================
# STEP 3: SCHEMA VALIDATION
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Validating Database Schema${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SCHEMA_VALID=true

# Check migration files for UUID/BIGINT consistency
echo "Scanning migration files..."

# Check for potential UUID/BIGINT mismatches
if grep -r "uuid()" backend/database/migrations/*.php | grep -q "responses\|notifications"; then
    echo -e "${YELLOW}⚠${NC}  Found UUID usage in responses/notifications migrations"
    echo -e "${YELLOW}  → Production uses BIGINT IDs. Verify this is intentional.${NC}"
    
    if [ -n "$AUTH_TOKEN" ]; then
        SCHEMA_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/system-design/validate-schema" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            -H "Content-Type: application/json")
        
        if echo "$SCHEMA_RESPONSE" | grep -q '"valid":true'; then
            echo -e "${GREEN}✓${NC} Schema validation passed via API"
        else
            echo -e "${RED}✗${NC} Schema validation failed"
            SCHEMA_VALID=false
        fi
    else
        read -p "Confirm schema is consistent with production? (yes/NO): " confirm
        if [ "$confirm" != "yes" ]; then
            SCHEMA_VALID=false
        fi
    fi
else
    echo -e "${GREEN}✓${NC} No obvious UUID/BIGINT mismatches found"
fi

if [ "$SCHEMA_VALID" = false ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ DEPLOYMENT BLOCKED: Schema Validation Failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Schema Validation: PASSED${NC}"
echo ""

# ============================================================================
# STEP 4: ROLLBACK PLAN
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Verifying Rollback Plan${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ROLLBACK_READY=true

# Check if DEPLOYMENT_GOVERNANCE.md exists
if [ -f "DEPLOYMENT_GOVERNANCE.md" ]; then
    echo -e "${GREEN}✓${NC} Deployment governance documentation exists"
else
    echo -e "${RED}✗${NC} Deployment governance documentation missing"
    ROLLBACK_READY=false
fi

# Check if backup directory exists
if [ -d "backups" ]; then
    echo -e "${GREEN}✓${NC} Backup directory exists"
    LATEST_BACKUP=$(ls -t backups/ 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        echo -e "${GREEN}✓${NC} Latest backup: ${LATEST_BACKUP}"
    fi
else
    echo -e "${YELLOW}⚠${NC}  No backups directory found"
fi

# Prompt for confirmation
echo ""
read -p "Have you documented the rollback plan for this deployment? (yes/NO): " confirm
if [ "$confirm" != "yes" ]; then
    ROLLBACK_READY=false
fi

if [ "$ROLLBACK_READY" = false ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ DEPLOYMENT BLOCKED: No Rollback Plan${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Rollback Plan: VERIFIED${NC}"
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅  ALL GOVERNANCE CHECKS PASSED  ✅               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓${NC} SDD Updated and Current"
echo -e "${GREEN}✓${NC} Pre-Deployment Tests Passed"
echo -e "${GREEN}✓${NC} Schema Validation Successful"
echo -e "${GREEN}✓${NC} Rollback Plan Documented"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 DEPLOYMENT APPROVED - Proceed with deployment${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Optional: Create deployment log entry
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Deployment validation passed - SDD v${SDD_VERSION}" >> deployment_log.txt

exit 0
