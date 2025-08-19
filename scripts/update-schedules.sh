#!/bin/bash

# Script to update schedules in Parameter Store

set -e

PARAMETER_NAME="/ec2-start-stop/schedules"
SCHEDULES_FILE="${1:-example-schedules.json}"

if [ ! -f "$SCHEDULES_FILE" ]; then
    echo "❌ Schedules file '$SCHEDULES_FILE' not found"
    echo "Usage: $0 [schedules-file.json]"
    exit 1
fi

echo "📝 Updating schedules from $SCHEDULES_FILE..."

# Validate JSON
if ! jq empty "$SCHEDULES_FILE" 2>/dev/null; then
    echo "❌ Invalid JSON in $SCHEDULES_FILE"
    exit 1
fi

# Update parameter
aws ssm put-parameter \
    --name "$PARAMETER_NAME" \
    --value "file://$SCHEDULES_FILE" \
    --overwrite \
    --description "EC2 start/stop schedules configuration"

echo "✅ Schedules updated successfully!"
echo "📋 Current configuration:"
aws ssm get-parameter --name "$PARAMETER_NAME" --query "Parameter.Value" --output text | jq .
