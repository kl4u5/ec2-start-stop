# EC2 Start/Stop Automation

This AWS CDK project automates the starting and stopping of EC2 instances based on configurable schedules stored in AWS Parameter Store.

## Features

- **Automated EC2 Management**: Automatically start and stop EC2 instances based on schedules
- **Timezone Support**: Each schedule supports IANA timezone specifications
- **Flexible Scheduling**: Different schedules for each day of the week with fallback to default
- **Tag-Based Selection**: Uses the `start-stop-schedule` tag to identify instances
- **Parameter Store Configuration**: Centralized configuration management
- **EventBridge Integration**: Runs every 15 minutes via EventBridge cron job
- **Tolerance Window**: ±2 minutes tolerance for schedule matching

## Architecture

```
EventBridge Rule (15 min) → Lambda Function → EC2 API
                                    ↓
                            Parameter Store ← Schedule Config
```

## Schedule Configuration

Schedules are stored in AWS Parameter Store at `/ec2-start-stop/schedules` with the following format:

```json
{
  "schedules": [
    {
      "name": "my-dev-servers",
      "enabled": true,
      "timezone": "Europe/Berlin",
      "mo": "07:00;22:00",
      "tu": "09:00;15:00",
      "we": "07:00;09:30",
      "th": "never;10:00",
      "fr": "07:00;never",
      "sa": "12:30;16:00",
      "su": "never;06:00",
      "default": "07:00;22:00"
    }
  ],
  "maintainers": ["john.doe@example.com", "jane.smith@example.com"]
}
```

### Schedule Format

- **name**: Unique identifier for the schedule
- **enabled**: Boolean flag to enable/disable the schedule
- **timezone**: IANA timezone name (e.g., "Europe/Berlin", "America/New_York")
- **Weekdays**: `mo`, `tu`, `we`, `th`, `fr`, `sa`, `su` with format `"start_time;stop_time"`
- **default**: Fallback schedule for days not explicitly defined
- **Special values**:
  - `"never"` means no action for that time slot
  - Times are in 24-hour format (HH:MM)
  - Use `;` or `,` as separator between start and stop times

## EC2 Instance Configuration

Tag your EC2 instances with:
- **Key**: `start-stop-schedule`
- **Value**: Schedule name (case-insensitive, whitespace trimmed)

Example:
```
Key: start-stop-schedule
Value: my-dev-servers
```

## Prerequisites

- Node.js 22 or later
- PNPM package manager
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Installation

1. **Clone and install dependencies**:
   ```bash
   pnpm install
   ```

2. **Bootstrap CDK** (if not done before in your account/region):
   ```bash
   pnpm run bootstrap
   ```

## Usage

### Deploy the Stack

```bash
# Build and deploy
pnpm run deploy

# Or step by step
pnpm run build
pnpm run synth  # Generate CloudFormation template
pnpm run deploy
```

### Update Schedule Configuration

After deployment, you can update schedules directly in Parameter Store:

```bash
# Get current configuration
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text

# Update configuration (replace with your JSON)
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value '{"schedules":[...],"maintainers":[...]}' --overwrite
```

### Monitor Execution

Check CloudWatch Logs for the Lambda function execution:

```bash
# Get function name from stack outputs
aws cloudformation describe-stacks --stack-name Ec2StartStopStack --query "Stacks[0].Outputs"

# View logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/Ec2StartStopStack"
```

## Development

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### Linting

```bash
# Check code style
pnpm run lint

# Fix auto-fixable issues
pnpm run lint:fix
```

### Local Development

```bash
# Watch for changes and rebuild
pnpm run watch
```

## Project Structure

```
├── bin/
│   └── ec2-start-stop.ts          # CDK app entry point
├── lib/
│   └── ec2-start-stop-stack.ts    # CDK stack definition
├── lambda/
│   ├── index.ts                   # Lambda function code
│   ├── package.json               # Lambda dependencies
│   └── tsconfig.json              # Lambda TypeScript config
├── test/
│   ├── lambda.test.ts             # Lambda function tests
│   └── stack.test.ts              # Stack tests
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Test configuration
├── cdk.json                       # CDK configuration
└── README.md                      # This file
```

## IAM Permissions

The Lambda function requires the following permissions:

- **EC2**:
  - `ec2:DescribeInstances`
  - `ec2:StartInstances`
  - `ec2:StopInstances`
  - `ec2:DescribeInstanceStatus`
- **SSM**:
  - `ssm:GetParameter` (for the schedules parameter)
- **CloudWatch Logs**:
  - Basic Lambda execution role permissions

## Cost Considerations

- **Lambda**: Minimal cost - executes every 15 minutes for ~5 seconds
- **EventBridge**: ~2,900 events per month (free tier: 14M events)
- **Parameter Store**: Standard parameters are free
- **CloudWatch Logs**: Minimal log data

## Troubleshooting

### Common Issues

1. **Instances not starting/stopping**:
   - Verify the `start-stop-schedule` tag is correctly set
   - Check schedule name matches exactly (case-insensitive)
   - Verify timezone and current time calculations
   - Check CloudWatch Logs for execution details

2. **Lambda execution errors**:
   - Verify IAM permissions
   - Check Parameter Store parameter exists and is valid JSON
   - Ensure Lambda timeout is sufficient (currently 5 minutes)

3. **Schedule not found**:
   - Verify Parameter Store parameter `/ec2-start-stop/schedules` exists
   - Validate JSON format
   - Check schedule name in instance tag

### Logs Analysis

The Lambda function provides detailed logging:
- Instance discovery and filtering
- Schedule matching and timezone calculations
- Action decisions and execution results
- Error handling and debugging information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and tests
5. Submit a pull request

## License

MIT License - see package.json for details.
