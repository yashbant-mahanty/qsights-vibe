#!/bin/bash

# QSights Global Brand Color Update Script
# Date: 2026-01-19
# Purpose: Replace all purple/indigo theme colors with official QSights brand colors

set -e

echo "======================================"
echo "QSights Brand Color Update"
echo "======================================"
echo ""
echo "This script will replace all purple/indigo colors with QSights brand colors:"
echo "  - Purple/Indigo → QSights Cyan (#1BB5D3) or Navy (#2D3E7C)"
echo ""

# Define colors
QSIGHTS_CYAN="#1BB5D3"
QSIGHTS_NAVY="#2D3E7C"
QSIGHTS_DARK="#1E2A5E"
QSIGHTS_LIGHT="#E3F4F8"

# Backup before changes
BACKUP_DIR="backups/2026-01-19_BEFORE_BRAND_UPDATE"
echo "Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -R frontend "$BACKUP_DIR/"
echo "✅ Backup created"
echo ""

cd frontend

echo "Updating color references..."
echo ""

# Count files to update
TOTAL_FILES=$(find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) | wc -l | tr -d ' ')
echo "Scanning $TOTAL_FILES files..."
echo ""

# Purple gradients → Cyan (primary actions)
echo "1/10: Replacing purple gradients with cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
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
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/bg-purple-600/bg-qsights-cyan/g' \
  -e 's/hover:bg-purple-700/hover:bg-qsights-cyan\/90/g' \
  -e 's/text-purple-600/text-qsights-cyan/g' \
  -e 's/border-purple-600/border-qsights-cyan/g' \
  {} \;

# Indigo buttons → Cyan
echo "3/10: Replacing indigo buttons with cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/bg-indigo-600/bg-qsights-cyan/g' \
  -e 's/hover:bg-indigo-700/hover:bg-qsights-cyan\/90/g' \
  -e 's/text-indigo-600/text-qsights-cyan/g' \
  -e 's/border-indigo-600/border-qsights-cyan/g' \
  {} \;

# Purple backgrounds → Light cyan
echo "4/10: Replacing purple backgrounds with light cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/from-purple-50 to-pink-50/from-qsights-light to-cyan-50/g' \
  -e 's/bg-purple-100/bg-cyan-50/g' \
  -e 's/bg-purple-50/bg-qsights-light/g' \
  {} \;

# Indigo backgrounds → Light cyan
echo "5/10: Replacing indigo backgrounds with light cyan..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/from-blue-50 to-indigo-50/from-qsights-light to-cyan-50/g' \
  -e 's/from-indigo-50 to-purple-50/from-qsights-light to-cyan-50/g' \
  -e 's/bg-indigo-100/bg-cyan-50/g' \
  -e 's/bg-indigo-50/bg-qsights-light/g' \
  -e 's/border-indigo-200/border-cyan-200/g' \
  {} \;

# Purple text gradients → Cyan
echo "6/10: Replacing purple text gradients..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/from-blue-600 to-purple-600/from-qsights-cyan to-qsights-navy/g' \
  -e 's/from-purple-500 to-purple-600/from-qsights-cyan to-qsights-cyan/g' \
  -e 's/from-indigo-500 to-indigo-600/from-qsights-cyan to-qsights-cyan/g' \
  {} \;

# Background page gradients → Subtle cyan tint
echo "7/10: Replacing page background gradients..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/from-blue-600 via-indigo-600 to-purple-700/from-qsights-cyan via-cyan-500 to-qsights-navy/g' \
  -e 's/from-indigo-50 via-white to-blue-50/from-cyan-50 via-white to-blue-50/g' \
  {} \;

# Progress bars → Cyan
echo "8/10: Replacing progress bar colors..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/from-blue-500 via-indigo-500 to-purple-500/from-qsights-cyan via-cyan-500 to-qsights-cyan/g' \
  -e 's/from-cyan-400 via-blue-400 to-purple-500/from-qsights-cyan via-cyan-400 to-cyan-500/g' \
  {} \;

# Focus rings → Cyan
echo "9/10: Replacing focus rings..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/focus:ring-purple-500/focus:ring-qsights-cyan/g' \
  -e 's/focus:ring-indigo-500/focus:ring-qsights-cyan/g' \
  -e 's/ring-purple-500/ring-qsights-cyan/g' \
  -e 's/ring-indigo-500/ring-qsights-cyan/g' \
  {} \;

# Shadow colors → Cyan
echo "10/10: Replacing shadow colors..."
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/shadow-purple-500/shadow-cyan-500/g' \
  -e 's/shadow-indigo-500/shadow-cyan-500/g' \
  {} \;

cd ..

echo ""
echo "✅ Color update complete!"
echo ""
echo "Summary:"
echo "  - Purple colors → QSights Cyan"
echo "  - Indigo colors → QSights Cyan"
echo "  - Gradients simplified to brand colors"
echo ""
echo "Updated files:"
find frontend -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -newer "$BACKUP_DIR/frontend" | head -20
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test locally: npm run dev"
echo "  3. Build: npm run build"
echo "  4. Deploy to production"
echo ""
echo "Backup location: $BACKUP_DIR"
echo "To rollback: cp -R $BACKUP_DIR/frontend ."
echo ""
echo "======================================"
