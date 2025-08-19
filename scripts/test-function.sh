#!/bin/bash

# Script to test the EC2 start/stop function locally

set -e

echo "🧪 Testing EC2 Start/Stop function..."

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed"
    echo "Please install jq: https://stedolan.github.io/jq/download/"
    exit 1
fi

# Get the Lambda function name from the deployed stack
FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name Ec2StartStopStack \
    --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$FUNCTION_NAME" ]; then
    echo "❌ Stack not deployed or function name not found"
    echo "Please deploy the stack first: pnpm run deploy"
    exit 1
fi

echo "📋 Function name: $FUNCTION_NAME"

# Invoke the function
echo "🚀 Invoking function..."
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload '{}' \
    --log-type Tail \
    response.json

# Show the response
echo "📋 Response:"
cat response.json | jq .

# Clean up
rm -f response.json

echo "✅ Test completed!"
echo "📋 Check CloudWatch Logs for detailed execution information:"
echo "aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/$FUNCTION_NAME'"
