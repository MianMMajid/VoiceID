#!/bin/bash

# Smoke test script for VLO deployment
# Usage: ./smoke-test.sh <api-gateway-url>

set -e

API_URL=$1

if [ -z "$API_URL" ]; then
  echo "Usage: $0 <api-gateway-url>"
  echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/dev"
  exit 1
fi

echo "========================================="
echo "VLO Smoke Tests"
echo "========================================="
echo "API URL: $API_URL"
echo "Timestamp: $(date)"
echo "========================================="
echo ""

FAILED_TESTS=0
PASSED_TESTS=0

# Helper function to run test
run_test() {
  local test_name=$1
  local endpoint=$2
  local expected_status=$3
  local method=${4:-GET}
  
  echo -n "Testing: $test_name... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_URL$endpoint" 2>/dev/null || echo "000")
  
  if [ "$response" = "$expected_status" ]; then
    echo "✓ PASSED (HTTP $response)"
    ((PASSED_TESTS++))
  else
    echo "✗ FAILED (Expected HTTP $expected_status, got HTTP $response)"
    ((FAILED_TESTS++))
  fi
}

# Test 1: Health check (if implemented)
run_test "Health Check" "/health" "200"

# Test 2: API Gateway is accessible
run_test "API Gateway Accessibility" "/" "403"

# Test 3: CORS preflight
echo -n "Testing: CORS Preflight... "
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  "$API_URL/api/v1/sessions" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  echo "✓ PASSED (HTTP $response)"
  ((PASSED_TESTS++))
else
  echo "✗ FAILED (Expected HTTP 200, got HTTP $response)"
  ((FAILED_TESTS++))
fi

# Test 4: Create session endpoint exists
run_test "Create Session Endpoint" "/api/v1/sessions" "401" "POST"

# Test 5: Get session endpoint exists
run_test "Get Session Endpoint" "/api/v1/sessions/test-id" "401" "GET"

# Test 6: Submit audio endpoint exists
run_test "Submit Audio Endpoint" "/api/v1/sessions/test-id/audio" "401" "POST"

# Test 7: Get result endpoint exists
run_test "Get Result Endpoint" "/api/v1/sessions/test-id/result" "401" "GET"

# Summary
echo ""
echo "========================================="
echo "Smoke Test Summary"
echo "========================================="
echo "Total Tests: $((PASSED_TESTS + FAILED_TESTS))"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "========================================="
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
  echo "❌ Some tests failed"
  exit 1
else
  echo "✅ All tests passed"
  exit 0
fi
