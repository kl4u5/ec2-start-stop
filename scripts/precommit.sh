#!/usr/bin/env bash
set -e

echo "🔍 Running pre-commit checks..."
echo ""

echo "📝 1/5 Formatting code with Prettier..."
pnpm run format > /dev/null 2>&1

echo "🔧 2/5 Fixing ESLint issues..."
pnpm run lint:fix > /dev/null 2>&1

echo "🏗️  3/5 Building all projects..."
pnpm run build:all > /dev/null 2>&1

echo "🧪 4/5 Running tests..."
pnpm run test > /dev/null 2>&1

echo "✅ 5/5 All checks passed!"
echo ""
echo "🚀 Ready to commit! All formatting, linting, building, and testing completed successfully."
echo ""
