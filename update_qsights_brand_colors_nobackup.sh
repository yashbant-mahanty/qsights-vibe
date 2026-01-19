#!/bin/bash

# QSights Global Brand Color Update Script (No Backup)
# Date: 2026-01-19
# Purpose: Replace all purple/indigo theme colors with official QSights brand colors

set -e

echo "======================================"
echo "QSights Brand Color Update"
echo "======================================"
echo ""
echo "Updating colors (skipping backup due to node_modules size)"
echo ""

cd frontend

echo "Updating color references..."
echo ""

# Purple gradients → Cyan (primary actions)
echo "1/10: Replacing purple gradients with cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/from-purple-600 via-blue-600 to-indigo-600/bg-qsights-cyan/g' \
  -e 's/from-blue-600 via-indigo-600 to-purple-600/bg-qsights-cyan/g' \
  -e 's/from-indigo-600 via-purple-600/bg-qsights-cyan/g' \
  -e 's/hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700/hover:bg-qsights-cyan\/90/g' \
  -e 's/hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700/hover:bg-qsights-cyan\/90/g' \
  -e 's/from-indigo-600 to-purple-600/bg-qsights-cyan/g' \
  -e 's/hover:from-indigo-700 hover:to-purple-700/hover:bg-qsights-cyan\/90/g' \
  {} \;

# Purple buttons → Cyan
echo "2/10: Replacing purple buttons with cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/bg-purple-600/bg-qsights-cyan/g' \
  -e 's/hover:bg-purple-700/hover:bg-qsights-cyan\/90/g' \
  -e 's/text-purple-600/text-qsights-cyan/g' \
  -e 's/border-purple-600/border-qsights-cyan/g' \
  {} \;

# Indigo buttons → Cyan
echo "3/10: Replacing indigo buttons with cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/bg-indigo-600/bg-qsights-cyan/g' \
  -e 's/hover:bg-indigo-700/hover:bg-qsights-cyan\/90/g' \
  -e 's/text-indigo-600/text-qsights-cyan/g' \
  -e 's/border-indigo-600/border-qsights-cyan/g' \
  {} \;

# Purple backgrounds → Light cyan
echo "4/10: Replacing purple backgrounds with light cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/from-purple-50 to-pink-50/from-qsights-light to-cyan-50/g' \
  -e 's/bg-purple-100/bg-cyan-50/g' \
  -e 's/bg-purple-50/bg-qsights-light/g' \
  {} \;

# Indigo backgrounds → Light cyan
echo "5/10: Replacing indigo backgrounds with light cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/from-blue-50 to-indigo-50/from-qsights-light to-cyan-50/g' \
  -e 's/from-indigo-50 to-purple-50/from-qsights-light to-cyan-50/g' \
  -e 's/bg-indigo-100/bg-cyan-50/g' \
  -e 's/bg-indigo-50/bg-qsights-light/g' \
  -e 's/border-indigo-200/border-cyan-200/g' \
  {} \;

# Purple text gradients → Cyan
echo "6/10: Replacing purple text gradients..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/from-blue-600 to-purple-600/from-qsights-cyan to-qsights-navy/g' \
  -e 's/from-purple-500 to-purple-600/from-qsights-cyan to-qsights-cyan/g' \
  -e 's/from-indigo-500 to-indigo-600/from-qsights-cyan to-qsights-cyan/g' \
  {} \;

# Background page gradients → Subtle cyan tint
echo "7/10: Replacing page background gradients..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/from-blue-600 via-indigo-600 to-purple-700/from-qsights-cyan via-cyan-500 to-qsights-navy/g' \
  -e 's/from-indigo-50 via-white to-blue-50/from-cyan-50 via-white to-blue-50/g' \
  {} \;

# Progress bars → Cyan
echo "8/10: Replacing progress bar colors..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/from-blue-500 via-indigo-500 to-purple-500/from-qsights-cyan via-cyan-500 to-qsights-cyan/g' \
  -e 's/from-cyan-400 via-blue-400 to-purple-500/from-qsights-cyan via-cyan-400 to-cyan-500/g' \
  {} \;

# Focus rings → Cyan
echo "9/10: Replacing focus rings..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/focus:ring-purple-500/focus:ring-qsights-cyan/g' \
  -e 's/focus:ring-indigo-500/focus:ring-qsights-cyan/g' \
  -e 's/ring-purple-500/ring-qsights-cyan/g' \
  -e 's/ring-indigo-500/ring-qsights-cyan/g' \
  {} \;

# Shadow colors → Cyan
echo "10/10: Replacing shadow colors..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" -exec sed -i '' \
  -e 's/shadow-purple-500/shadow-cyan-500/g' \
  -e 's/shadow-indigo-500/shadow-cyan-500/g' \
  {} \;

cd ..

echo ""
echo "✅ Color update complete!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test locally: cd frontend && npm run dev"
echo "  3. Build: cd frontend && npm run build"
echo "  4. Deploy to production"
echo ""
echo "======================================"
