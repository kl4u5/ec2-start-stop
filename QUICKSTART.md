# Quick Start Guide

## Prerequisites

Make sure you have:
- Node.js 22+ installed
- AWS CLI configured (`aws configure`)
- CDK CLI installed (`npm install -g aws-cdk`)

## 1. Install Dependencies

```bash
# Install main project dependencies
pnpm install

# Install Lambda dependencies
cd lambda
pnpm install
cd ..
```

## 2. Build the Project

```bash
# Build Lambda function
cd lambda && pnpm run build && cd ..

# Build CDK project
pnpm run build
```

## 3. Bootstrap CDK (if not done before)

```bash
pnpm run bootstrap
```

## 4. Deploy the Stack

```bash
pnpm run deploy
```

## 5. Tag Your EC2 Instances

Tag your EC2 instances with:
- Key: `start-stop-schedule`
- Value: `my-dev-servers` (or any schedule name from your configuration)

## 6. Update Schedule Configuration (Optional)

```bash
# Update Parameter Store with your custom schedules
aws ssm put-parameter \
  --name "/ec2-start-stop/schedules" \
  --value file://example-schedules.json \
  --overwrite
```

## 7. Test the Function

```bash
# Get the function name
aws cloudformation describe-stacks \
  --stack-name Ec2StartStopStack \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" \
  --output text

# Invoke the function manually
aws lambda invoke \
  --function-name [FUNCTION_NAME] \
  --payload '{}' \
  response.json

# Check the logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/Ec2StartStopStack"
```

## Monitoring

The function runs every 15 minutes automatically. Check CloudWatch Logs for execution details.

## Example Instance Tags

```
Key: start-stop-schedule
Value: my-dev-servers
```

The instance will be started at 07:00 and stopped at 22:00 on weekdays (Berlin time), based on the default schedule.
