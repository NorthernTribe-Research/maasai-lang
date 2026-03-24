#!/bin/bash

# Script to help identify and categorize TypeScript errors
# Run with: bash scripts/fix-ts-errors.sh

echo "🔍 Running TypeScript compiler to find errors..."
echo ""

# Run tsc and capture output
npx tsc --noEmit 2>&1 | tee ts-errors.log

# Count errors
ERROR_COUNT=$(grep "error TS" ts-errors.log | wc -l)

echo ""
echo "📊 Summary:"
echo "Total errors found: $ERROR_COUNT"
echo ""

# Categorize errors
echo "📋 Error Categories:"
echo ""

echo "Type conversion errors (TS2352):"
grep "error TS2352" ts-errors.log | wc -l

echo "Type assignment errors (TS2322):"
grep "error TS2322" ts-errors.log | wc -l

echo "Property missing errors (TS2339):"
grep "error TS2339" ts-errors.log | wc -l

echo "Implicit any errors (TS7006):"
grep "error TS7006" ts-errors.log | wc -l

echo ""
echo "💡 Recommendations:"
echo "1. Fix type conversion errors by adding proper type assertions"
echo "2. Fix property missing errors by checking API response types"
echo "3. Add explicit types to fix implicit any errors"
echo "4. Consider using 'strict: false' in tsconfig.json for faster deployment (not recommended for production)"
echo ""
echo "Full error log saved to: ts-errors.log"
