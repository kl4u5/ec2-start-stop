#!/bin/bash

# Script to validate schedule configuration files

set -e

SCHEDULES_FILE="${1:-example-schedules.json}"

if [ ! -f "$SCHEDULES_FILE" ]; then
    echo "❌ Schedules file '$SCHEDULES_FILE' not found"
    echo "Usage: $0 [schedules-file.json]"
    exit 1
fi

echo "🔍 Validating schedules file: $SCHEDULES_FILE"

# Check if the file is valid JSON
if ! jq empty "$SCHEDULES_FILE" 2>/dev/null; then
    echo "❌ Invalid JSON in $SCHEDULES_FILE"
    exit 1
fi

# Validate structure
if ! jq -e '.schedules | type == "array"' "$SCHEDULES_FILE" >/dev/null; then
    echo "❌ Missing or invalid 'schedules' array"
    exit 1
fi

if ! jq -e '.maintainers | type == "array"' "$SCHEDULES_FILE" >/dev/null; then
    echo "❌ Missing or invalid 'maintainers' array"
    exit 1
fi

# Validate each schedule
echo "📋 Validating schedules:"
jq -r '.schedules[] | "- \(.name) (\(.timezone)) - Enabled: \(.enabled)"' "$SCHEDULES_FILE"

# Check for required fields in each schedule
VALIDATION_ERRORS=0

while IFS= read -r schedule; do
    name=$(echo "$schedule" | jq -r '.name // empty')
    enabled=$(echo "$schedule" | jq -r '.enabled // empty')
    timezone=$(echo "$schedule" | jq -r '.timezone // empty')
    
    if [ -z "$name" ]; then
        echo "❌ Schedule missing 'name' field"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    if [ -z "$enabled" ]; then
        echo "❌ Schedule '$name' missing 'enabled' field"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    if [ -z "$timezone" ]; then
        echo "❌ Schedule '$name' missing 'timezone' field"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Validate time formats
    for day in mo tu we th fr sa su default; do
        time_value=$(echo "$schedule" | jq -r ".$day // empty")
        if [ -n "$time_value" ]; then
            if ! echo "$time_value" | grep -E '^(never|[0-2]?[0-9]:[0-5][0-9]);(never|[0-2]?[0-9]:[0-5][0-9])$' >/dev/null; then
                echo "❌ Schedule '$name' has invalid time format for '$day': $time_value"
                echo "   Expected format: 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never'"
                VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
            fi
        fi
    done
    
done < <(jq -c '.schedules[]' "$SCHEDULES_FILE")

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo "✅ All validations passed!"
    echo ""
    echo "📊 Summary:"
    echo "- Total schedules: $(jq '.schedules | length' "$SCHEDULES_FILE")"
    echo "- Enabled schedules: $(jq '[.schedules[] | select(.enabled == true)] | length' "$SCHEDULES_FILE")"
    echo "- Disabled schedules: $(jq '[.schedules[] | select(.enabled == false)] | length' "$SCHEDULES_FILE")"
    echo "- Maintainers: $(jq '.maintainers | length' "$SCHEDULES_FILE")"
else
    echo "❌ Found $VALIDATION_ERRORS validation error(s)"
    exit 1
fi
