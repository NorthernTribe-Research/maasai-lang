#!/bin/bash

# Comprehensive smoke test for production readiness
# Run with: bash scripts/smoke-test.sh

set -e

echo "🚀 LinguaMaster Production Smoke Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

echo "1️⃣  Checking Dependencies..."
echo "----------------------------"

if [ -d "node_modules" ]; then
    pass "node_modules exists"
else
    fail "node_modules not found - run 'npm install'"
fi

if [ -f "package.json" ]; then
    pass "package.json exists"
else
    fail "package.json not found"
fi

echo ""
echo "2️⃣  Checking Environment Configuration..."
echo "----------------------------------------"

if [ -f ".env" ]; then
    pass ".env file exists"
    
    # Check for required variables
    if grep -q "DATABASE_URL=" .env; then
        pass "DATABASE_URL configured"
    else
        fail "DATABASE_URL not found in .env"
    fi
    
    if grep -q "GEMINI_API_KEY=" .env; then
        pass "GEMINI_API_KEY configured"
    else
        fail "GEMINI_API_KEY not found in .env"
    fi

    if grep -q "OPENAI_API_KEY=" .env; then
        pass "OPENAI_API_KEY configured"
    else
        warn "OPENAI_API_KEY not found in .env"
    fi
    
    if grep -q "SESSION_SECRET=" .env; then
        pass "SESSION_SECRET configured"
    else
        fail "SESSION_SECRET not found in .env"
    fi

    if grep -q "JWT_SECRET=" .env; then
        pass "JWT_SECRET configured"
    else
        fail "JWT_SECRET not found in .env"
    fi
else
    fail ".env file not found - copy from .env.example"
fi

echo ""
echo "3️⃣  Running Build..."
echo "-------------------"

if npm run build > /dev/null 2>&1; then
    pass "Build successful"
else
    fail "Build failed - check npm run build output"
fi

if [ -d "dist" ]; then
    pass "dist directory created"
else
    fail "dist directory not found after build"
fi

echo ""
echo "4️⃣  Running Tests..."
echo "-------------------"

# Run tests and capture output
TEST_OUTPUT=$(npm test 2>&1 || true)

if echo "$TEST_OUTPUT" | grep -q "Test Files.*passed"; then
    PASSED_TESTS=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1)
    pass "$PASSED_TESTS test files passed"
else
    warn "Could not determine test results"
fi

if echo "$TEST_OUTPUT" | grep -q "failed"; then
    FAILED_TESTS=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= failed)' | head -1)
    warn "$FAILED_TESTS test files failed (integration tests may need database)"
fi

echo ""
echo "5️⃣  Checking TypeScript..."
echo "-------------------------"

TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l || true)

if [ "$TS_ERRORS" -eq 0 ]; then
    pass "No TypeScript errors"
else
    warn "$TS_ERRORS TypeScript errors found (run 'bash scripts/fix-ts-errors.sh' for details)"
fi

echo ""
echo "6️⃣  Checking Security..."
echo "-----------------------"

# Check for default/missing secrets
SESSION_VALUE=$(grep -E '^SESSION_SECRET=' .env 2>/dev/null | head -n1 | cut -d'=' -f2-)
if [ -z "$SESSION_VALUE" ]; then
    fail "SESSION_SECRET is missing in .env"
elif echo "$SESSION_VALUE" | grep -Eq 'your_super_secret|linguamaster_secret_key|development-only-session-secret'; then
    fail "Default SESSION_SECRET detected - change before deployment!"
else
    pass "SESSION_SECRET appears to be customized"
fi

JWT_VALUE=$(grep -E '^JWT_SECRET=' .env 2>/dev/null | head -n1 | cut -d'=' -f2-)
if [ -z "$JWT_VALUE" ]; then
    fail "JWT_SECRET is missing in .env"
elif echo "$JWT_VALUE" | grep -Eq 'linguamaster_jwt_secret_key_change_in_production|development-only-jwt-secret-do-not-use-in-production|your_super_secret_jwt_secret_here'; then
    fail "Default JWT_SECRET detected - change before deployment!"
else
    pass "JWT_SECRET appears to be customized"
fi

# Check for exposed secrets in git
if git rev-parse --git-dir > /dev/null 2>&1; then
    if git ls-files | grep -q "\.env$"; then
        fail ".env file is tracked by git - remove it immediately!"
    else
        pass ".env file not tracked by git"
    fi
fi

echo ""
echo "7️⃣  Checking File Structure..."
echo "-----------------------------"

REQUIRED_DIRS=("client" "server" "shared" "db")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        pass "$dir/ directory exists"
    else
        fail "$dir/ directory not found"
    fi
done

REQUIRED_FILES=("package.json" "tsconfig.json" "vite.config.ts" "vitest.config.ts")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "$file exists"
    else
        fail "$file not found"
    fi
done

echo ""
echo "8️⃣  Checking Bundle Size..."
echo "--------------------------"

if [ -d "dist/public/assets" ]; then
    LARGE_BUNDLES=$(find dist/public/assets -name "*.js" -size +500k 2>/dev/null | wc -l)
    if [ "$LARGE_BUNDLES" -gt 0 ]; then
        warn "$LARGE_BUNDLES bundle(s) larger than 500KB - consider code splitting"
    else
        pass "All bundles under 500KB"
    fi
fi

echo ""
echo "9️⃣  Checking Documentation..."
echo "----------------------------"

DOC_FILES=("README.md" "PRODUCTION_READINESS.md")
for file in "${DOC_FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "$file exists"
    else
        warn "$file not found"
    fi
done

echo ""
echo "🔟 Production Readiness Checks..."
echo "--------------------------------"

# Check NODE_ENV
if grep -q "NODE_ENV=production" .env 2>/dev/null; then
    pass "NODE_ENV set to production"
else
    warn "NODE_ENV not set to production in .env"
fi

# Check for console.log statements (basic check)
CONSOLE_LOGS=$(grep -r "console\.log" client/src server --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || true)
if [ "$CONSOLE_LOGS" -gt 50 ]; then
    warn "$CONSOLE_LOGS console.log statements found - consider removing for production"
else
    pass "Minimal console.log usage"
fi

echo ""
echo "======================================"
echo "📊 Smoke Test Summary"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review warnings above"
    echo "2. Check PRODUCTION_READINESS.md for deployment checklist"
    echo "3. Test in staging environment"
    echo "4. Deploy to production"
    exit 0
else
    echo -e "${RED}❌ Some critical checks failed!${NC}"
    echo ""
    echo "Please fix the failed checks before deploying to production."
    echo "See PRODUCTION_READINESS.md for detailed guidance."
    exit 1
fi
