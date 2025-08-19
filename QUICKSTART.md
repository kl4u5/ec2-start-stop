# Quick Start Guide

## Prerequisites

Make sure you have:
- **Node.js 22+** installed
- **PNPM 9+** package manager (`npm install -g pnpm`)
- **AWS CLI** configured (`aws configure`)
- **CDK CLI** installed (`npm install -g aws-cdk`)

## 1. Install Dependencies

```bash
# Install all dependencies (project + lambda)
pnpm install
```

## 2. Bootstrap CDK (if not done before)

```bash
pnpm run bootstrap
```

## 3. Deploy the Stack

```bash
# Build and deploy everything
pnpm run deploy
```

## 4. Tag Your EC2 Instances

Tag your EC2 instances with the schedule name:

```bash
# Tag for business hours (default schedule)
aws ec2 create-tags --resources i-1234567890abcdef0 --tags Key=start-stop-schedule,Value=sps-tid-server

# Or use AWS Console to add tag:
# Key: start-stop-schedule
# Value: sps-tid-server
```

## 5. Verify Deployment

```bash
# Check stack outputs
aws cloudformation describe-stacks --stack-name Ec2StartStopStack --query "Stacks[0].Outputs"

# View current schedule configuration
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text | jq .
```

## 6. Test the Function (Optional)

```bash
# Get the function name from stack outputs
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name Ec2StartStopStack \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" \
  --output text)

# Invoke the function manually
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{}' \
  response.json

# Check the response
cat response.json

# View recent logs
aws logs tail /aws/lambda/$FUNCTION_NAME --since 10m
```

## 7. Update Schedules (Optional)

Create your own schedule configuration:

```bash
# Create custom schedules file
cat > my-schedules.json << 'EOF'
{
  "description": "My custom EC2 schedules",
  "schedules": [
    {
      "name": "business-hours",
      "enabled": true,
      "timezone": "Europe/Berlin",
      "default": "08:00;18:00"
    },
    {
      "name": "dev-servers",
      "enabled": true,
      "timezone": "UTC",
      "mo": "09:00;17:00",
      "tu": "09:00;17:00",
      "we": "09:00;17:00",
      "th": "09:00;17:00",
      "fr": "09:00;17:00",
      "sa": "never;never",
      "su": "never;never"
    }
  ],
  "maintainers": ["devops@company.com"]
}
EOF

# Update Parameter Store
aws ssm put-parameter \
  --name "/ec2-start-stop/schedules" \
  --value file://my-schedules.json \
  --overwrite
```

## Monitoring

The function runs automatically every 15 minutes via EventBridge. Monitor execution:

```bash
# View recent function executions
aws logs tail /aws/lambda/$FUNCTION_NAME --follow

# Check EventBridge rule
aws events list-rules --name-prefix "Ec2StartStopScheduleRule"
```

## Example Usage

Based on the default configuration, instances tagged with:

| Tag Value | Schedule | Behavior |
|-----------|----------|----------|
| `sps-tid-server` | Europe/Berlin, 06:00-22:00 daily | Runs 16 hours/day |
| `dev-servers` | Europe/Berlin, 07:00-22:00 weekdays only | Weekends off |
| `production-servers` | UTC, 06:00-23:00 with weekend hours | Different weekend schedule |
| `test-environment` | America/New_York, 09:00-17:00 weekdays | Currently disabled |

## Next Steps

- **Customize schedules** in Parameter Store to match your needs
- **Monitor CloudWatch Logs** to verify correct operation  
- **Add more instances** by tagging them with appropriate schedule names
- **Set up CloudWatch Alarms** for Lambda function errors (optional)

## Quick Commands Reference

```bash
# View all managed instances
aws ec2 describe-instances --filters "Name=tag-key,Values=start-stop-schedule" --query "Reservations[].Instances[].[InstanceId,State.Name,Tags[?Key=='start-stop-schedule'].Value|[0]]" --output table

# Update a single schedule without affecting others
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text | jq . > current-schedules.json
# Edit current-schedules.json, then:
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value file://current-schedules.json --overwrite

# Remove the stack completely
pnpm run destroy
```

🎉 **You're all set!** Your EC2 instances will now start and stop automatically according to their schedules.
