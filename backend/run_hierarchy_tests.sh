#!/bin/bash

# Hierarchy System Test Suite Runner
# Phase 7 - Testing & Validation

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     QSights Hierarchy System - Test Suite Runner            ║"
echo "║     Phase 7: Testing & Validation                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_path=$2
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $suite_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Run PHPUnit with the specific test
    output=$(php artisan test --filter="$test_path" 2>&1)
    exit_code=$?
    
    # Extract test counts
    if echo "$output" | grep -q "Tests:"; then
        tests_line=$(echo "$output" | grep "Tests:")
        passed=$(echo "$tests_line" | grep -o '[0-9]* passed' | grep -o '[0-9]*')
        failed=$(echo "$tests_line" | grep -o '[0-9]* failed' | grep -o '[0-9]*')
        
        if [ -z "$passed" ]; then passed=0; fi
        if [ -z "$failed" ]; then failed=0; fi
        
        TOTAL_TESTS=$((TOTAL_TESTS + passed + failed))
        PASSED_TESTS=$((PASSED_TESTS + passed))
        FAILED_TESTS=$((FAILED_TESTS + failed))
        
        if [ $exit_code -eq 0 ]; then
            echo -e "${GREEN}✓ $suite_name: PASSED${NC}"
            echo -e "  Tests: $passed passed"
        else
            echo -e "${RED}✗ $suite_name: FAILED${NC}"
            echo -e "  Tests: $passed passed, $failed failed"
            echo "$output" | tail -20
        fi
    else
        echo -e "${RED}✗ $suite_name: ERROR${NC}"
        echo "$output" | tail -10
    fi
    
    echo ""
}

# Change to backend directory
cd "$(dirname "$0")"

echo -e "${BLUE}Setting up test environment...${NC}"
echo ""

# Clear caches
php artisan config:clear > /dev/null 2>&1
php artisan cache:clear > /dev/null 2>&1

echo -e "${GREEN}✓ Test environment ready${NC}"
echo ""
echo ""

# Run Unit Tests
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}           UNIT TESTS - Middleware                     ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

run_test_suite "LogManagerActions Middleware" "LogManagerActionsTest"
run_test_suite "RateLimitNotifications Middleware" "RateLimitNotificationsTest"
run_test_suite "ValidateDataScope Middleware" "ValidateDataScopeTest"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}           UNIT TESTS - Services                       ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

run_test_suite "HierarchyService Security Methods" "HierarchyServiceSecurityTest"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}           FEATURE TESTS - API Endpoints               ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

run_test_suite "Hierarchy API Endpoints" "HierarchyApiTest"

# Summary
echo ""
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Tests:   ${BLUE}$TOTAL_TESTS${NC}"
echo -e "  Passed:        ${GREEN}$PASSED_TESTS${NC}"
echo -e "  Failed:        ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ✓ ALL TESTS PASSED SUCCESSFULLY!                   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          ✗ SOME TESTS FAILED                                 ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
