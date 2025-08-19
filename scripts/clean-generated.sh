#!/bin/bash

# Script to clean up generated TypeScript files

set -e

echo "🧹 Cleaning up generated TypeScript files..."

# Remove generated files from source directories (but keep dist folders)
find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.vscode/*" -not -name "*.config.js" -not -name ".eslintrc.js" -delete
find . -name "*.d.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.vscode/*" -delete
find . -name "*.js.map" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.vscode/*" -delete

echo "✅ Cleanup completed!"
echo "📋 Source directories are now clean of generated files"
echo "🔧 Generated files are properly contained in dist/ directories"
