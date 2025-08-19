#!/bin/bash

# Deployment script for EC2 Start/Stop automation

set -e

echo "🚀 Deploying EC2 Start/Stop automation..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or credentials not valid"
    echo "Please run 'aws configure' first"
    exit 1
fi

# Check if CDK is bootstrapped
echo "📋 Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1; then
    echo "🔧 CDK not bootstrapped. Running bootstrap..."
    pnpm run bootstrap
else
    echo "✅ CDK already bootstrapped"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build Lambda function
echo "🔨 Building Lambda function..."
cd lambda
pnpm install
pnpm run build
cd ..

# Build CDK project
echo "🔨 Building CDK project..."
pnpm run build

# Run tests
echo "🧪 Running tests..."
pnpm test

# Deploy the stack
echo "🚀 Deploying stack..."
pnpm run deploy

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Tag your EC2 instances with 'start-stop-schedule' tag"
echo "2. Update schedules in Parameter Store if needed:"
echo "   aws ssm put-parameter --name '/ec2-start-stop/schedules' --value file://example-schedules.json --overwrite"
echo "3. Monitor CloudWatch Logs for execution details"
