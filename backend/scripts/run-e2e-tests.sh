#!/bin/bash

# End-to-End Testing Script for VLO System
# Runs load testing, security testing, and acceptance testing

set -e

echo "=========================================="
echo "VLO End-to-End Testing Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
LOAD_TEST_RESULT=0
SECURITY_TEST_RESULT=0
ACCEPTANCE_TEST_RESULT=0

# Function to print section header
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2 PASSED${NC}"
    else
        echo -e "${RED}✗ $2 FAILED${NC}"
    fi
}

# Run Load Testing
print_header "1. Load Testing"
echo "Testing concurrent session handling, latency, and auto-scaling..."
cd packages/serverless
npm test -- load-test.ts || LOAD_TEST_RESULT=$?
cd ../..
print_result $LOAD_TEST_RESULT "Load Testing"

# Run Security Testing
print_header "2. Security Testing"
echo "Testing API security, replay attacks, synthetic detection, and session hijacking..."
cd packages/serverless
npm test -- security-test.ts || SECURITY_TEST_RESULT=$?
cd ../..
print_result $SECURITY_TEST_RESULT "Security Testing"

# Run Acceptance Testing
print_header "3. Acceptance Testing"
echo "Testing browser compatibility, microphone quality, accents/languages, and false rates..."
cd packages/client
npm test -- acceptance-test.ts || ACCEPTANCE_TEST_RESULT=$?
cd ../..
print_result $ACCEPTANCE_TEST_RESULT "Acceptance Testing"

# Summary
print_header "Test Summary"
print_result $LOAD_TEST_RESULT "Load Testing"
print_result $SECURITY_TEST_RESULT "Security Testing"
print_result $ACCEPTANCE_TEST_RESULT "Acceptance Testing"

# Overall result
TOTAL_FAILURES=$((LOAD_TEST_RESULT + SECURITY_TEST_RESULT + ACCEPTANCE_TEST_RESULT))

if [ $TOTAL_FAILURES -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "All E2E Tests PASSED ✓"
    echo -e "==========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}=========================================="
    echo "Some E2E Tests FAILED ✗"
    echo -e "==========================================${NC}"
    exit 1
fi
