# EC2 Start/Stop Automation

This AWS CDK project automates the starting and stopping of EC2 i### Schedule
Format

- **name**: Unique identifier for the schedule (referenced by EC2 instance tags)
- **enabled**: Boolean flag to enable/disable the entire schedule
- **timezone**: IANA timezone name (e.g., "Europe/Berlin", "America/New_York",
  "UTC")
- **Weekdays**: `mo`, `tu`, `we`, `th`, `fr`, `sa`, `su` with format
  `"start_time;stop_time"`
- **default**: Fallback schedule for days not explicitly defined
- **emails**: Array of email addresses for notifications (supports inheritance)
- **phones**: Array of phone numbers for SMS notifications (supports inheritance
  and non-critical options)

### Configuration Options

- **logLevel**: Global log level for Lambda function ("DEBUG", "INFO", "WARN",
  "ERROR")
  - Changes take effect immediately without redeployment
  - Default: "INFO"sed on configurable schedules stored in AWS Parameter Store.
    Perfect for cost optimization by automatically managing development,
    testing, and non-production environments.

## 💰 **Cost Savings**

- **Automatic shutdown** of non-production instances during off-hours
- **Timezone-aware scheduling** for global teams
- **Minimal overhead**: ~0.09 DKK (~$0.01) per month to run
- **High ROI**: Save 21+ DKK monthly per t3.micro instance with 8-hour daily
  shutdown

## Features

- **🚀 Automated EC2 Management**: Start and stop instances based on flexible
  schedules
- **🌍 Timezone Support**: Full IANA timezone support with DST handling via
  Luxon
- **📅 Flexible Scheduling**: Different schedules for each day with fallback
  defaults
- **🏷️ Tag-Based Selection**: Uses `start-stop-schedule` tag for instance
  identification
- **⚙️ Parameter Store Configuration**: Centralized, easily updatable
  configuration
- **⏰ EventBridge Integration**: Reliable 15-minute interval execution
- **🎯 Range-Based Logic**: Intelligent scheduling that considers entire time
  ranges, not just exact moments
- **📧 Email Notifications**: Flexible per-schedule and inherited email
  notifications via Amazon SES
- **📱 SMS Alerts**: Cost-optimized SMS notifications via Amazon SNS with
  inheritance support and non-critical options
- **🔗 Notification Inheritance**: Sophisticated inheritance system allowing
  schedules to inherit or override master notification settings

## Architecture

```
EventBridge Rule (15 min) → Lambda Function → EC2 API
                                    ↓
                            Parameter Store ← Schedule Config
```

## Schedule Configuration

Schedules are stored in AWS Parameter Store at `/ec2-start-stop/schedules`. The
configuration supports comprehensive scheduling patterns:

```json
{
  "description": "EC2 Start/Stop Automation Configuration - defines automated start/stop schedules for EC2 instances based on tags.",
  "logLevel": "INFO",
  "masterEmails": ["devops@yourcompany.com", "ops@yourcompany.com"],
  "masterPhones": ["+45XXXXXXXX"],
  "schedules": [
    {
      "name": "business-hours",
      "enabled": true,
      "timezone": "Europe/Berlin",
      "mo": "08:00;18:00",
      "tu": "08:00;18:00",
      "we": "08:00;18:00",
      "th": "08:00;18:00",
      "fr": "08:00;18:00",
      "sa": "never;never",
      "su": "never;never",
      "default": "08:00;18:00",
      "emails": ["inherited"],
      "phones": ["inherited"]
    },
    {
      "name": "dev-servers",
      "enabled": true,
      "timezone": "UTC",
      "mo": "07:00;22:00",
      "fr": "07:00;15:00",
      "default": "never;never",
      "emails": ["dev-team@yourcompany.com"],
      "phones": ["!+45YYYYYYYY"]
    },
    {
      "name": "always-on",
      "enabled": true,
      "timezone": "UTC",
      "default": "00:00;never",
      "emails": ["inherited", "critical@yourcompany.com"],
      "phones": ["+45ZZZZZZZZ"]
    }
  ]
}
```

### Schedule Format

- **name**: Unique identifier for the schedule (referenced by EC2 instance tags)
- **enabled**: Boolean flag to enable/disable the entire schedule
- **timezone**: IANA timezone name (e.g., "Europe/Berlin", "America/New_York",
  "UTC")
- **Weekdays**: `mo`, `tu`, `we`, `th`, `fr`, `sa`, `su` with format
  `"start_time;stop_time"`
- **default**: Fallback schedule for days not explicitly defined
- **emails**: Array of email addresses for notifications (supports inheritance)
- **phones**: Array of phone numbers for SMS notifications (supports inheritance
  and non-critical options)

### Notification System

The system supports a sophisticated inheritance-based notification system:

#### Master Notifications

- **masterEmails**: Global email list inherited by schedules
- **masterPhones**: Global phone list inherited by schedules

#### Schedule-Level Notifications

- **emails**: Email notifications for this schedule
  - `["inherited"]` - Use master emails only
  - `["inherited", "extra@company.com"]` - Inherit master + add specific emails
  - `["specific@company.com"]` - Override master with specific emails
- **phones**: SMS notifications for this schedule
  - `["inherited"]` - Use master phones for critical failures only
  - `["!+45XXXXXXXX"]` - Receive all notifications (including non-critical)
  - `["+45XXXXXXXX"]` - Receive critical failures only
  - `["inherited", "!+45YYYYYYYY"]` - Inherit master + add non-critical SMS

#### SMS Cost Optimization

- **Default**: SMS sent only for critical failures (start/stop failures)
- **Non-Critical SMS**: Prefix phone numbers with `!` to receive all
  notifications
- **Automatic Deduplication**: Prevents duplicate notifications when inheriting

### Dynamic Configuration

The system supports **real-time configuration changes** without redeployment:

- **Log Level**: Change `logLevel` in Parameter Store for immediate effect
- **Notifications**: Update `masterEmails`, `masterPhones`, or per-schedule
  settings
- **Schedules**: Add, modify, or disable schedules without Lambda redeployment
- **Validation**: Configuration is validated on each Lambda execution

Example log level change:

```bash
# Enable debug logging for troubleshooting
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value '{"logLevel": "DEBUG", ...}' --overwrite

# Revert to minimal logging
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value '{"logLevel": "ERROR", ...}' --overwrite
```

### Time Format Examples

- **`"08:00;18:00"`** - Start at 8 AM, stop at 6 PM
- **`"never;22:00"`** - No start action, stop at 10 PM (always stopped)
- **`"06:00;never"`** - Start at 6 AM, no stop action (run indefinitely)
- **`"never;never"`** - No actions (effectively disabled for that day)
- **`"00:00;never"`** - Always running (24/7 service)

### Notification Configuration Examples

#### Basic Inheritance

```json
{
  "masterEmails": ["ops@company.com"],
  "masterPhones": ["+45XXXXXXXX"],
  "schedules": [
    {
      "name": "production",
      "emails": ["inherited"],
      "phones": ["inherited"]
    }
  ]
}
```

#### Mixed Inheritance and Overrides

```json
{
  "masterEmails": ["ops@company.com"],
  "masterPhones": ["+45XXXXXXXX"],
  "schedules": [
    {
      "name": "development",
      "emails": ["inherited", "dev-team@company.com"],
      "phones": ["!+45YYYYYYYY"]
    },
    {
      "name": "critical-production",
      "emails": ["ops@company.com", "management@company.com"],
      "phones": ["+45XXXXXXXX", "!+45ZZZZZZZZ"]
    }
  ]
}
```

#### No Notifications

```json
{
  "schedules": [
    {
      "name": "silent-schedule",
      "emails": [],
      "phones": []
    }
  ]
}
```

### Scheduling Logic

The system uses **time range logic** rather than exact time matching:

- **Start**: If current time is after start time AND before stop time (or stop
  is "never")
- **Stop**: If start time is "never" OR current time is after stop time
- **Evaluation**: Runs every 15 minutes, considers the entire daily time range

This approach ensures instances are properly managed regardless of when the
scheduler runs within the 15-minute window.

## EC2 Instance Configuration

Tag your EC2 instances with the schedule name:

| Key                   | Value                            |
| --------------------- | -------------------------------- |
| `start-stop-schedule` | Schedule name (case-insensitive) |

**Examples:**

```bash
# Tag for business hours schedule
aws ec2 create-tags --resources i-1234567890abcdef0 --tags Key=start-stop-schedule,Value=business-hours

# Tag for development servers
aws ec2 create-tags --resources i-0987654321fedcba0 --tags Key=start-stop-schedule,Value=dev-servers

# Tag for always-on services
aws ec2 create-tags --resources i-abcdef1234567890 --tags Key=start-stop-schedule,Value=always-on
```

## Quick Start

### Prerequisites

- **Node.js 22+** and **PNPM 9+**
- **AWS CLI** configured with appropriate credentials
- **AWS CDK CLI**: `npm install -g aws-cdk`
- **AWS Account** with permissions to create Lambda, IAM, EventBridge, and
  Parameter Store resources

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ec2-start-stop
pnpm install
```

### 2. Configure AWS Region

Set your target region in AWS CLI or CDK context:

```bash
# Option 1: Set default region
export AWS_DEFAULT_REGION=eu-central-1

# Option 2: Use AWS profile with region
aws configure set region eu-central-1 --profile your-profile

# Option 3: Update cdk.json (add env context)
```

### 3. Bootstrap CDK (First Time Only)

```bash
pnpm run bootstrap
```

### 4. Deploy

```bash
# Deploy with default profile
pnpm run deploy

# Deploy with specific profile
pnpm run deploy -- --profile your-aws-profile
```

### 5. Tag Your EC2 Instances

```bash
# Tag instances you want to manage
aws ec2 create-tags --resources i-XXXXXXXXX --tags Key=start-stop-schedule,Value=business-hours
```

### 6. Customize Schedules (Optional)

Update schedules in Parameter Store:

```bash
# Get current configuration
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text | jq .

# Update with your schedules
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value file://schedules.json --overwrite
```

## Usage

### Deployment Options

**⚠️ Important**: CDK will always update the schedules parameter during
deployment. To protect custom configurations, use the backup/restore workflow
below.

#### Standard Deployment

```bash
# Deploy to development
pnpm run deploy:dev

# Deploy to production
pnpm run deploy:prod

# Deploy to default profile
pnpm run deploy
```

#### Protected Deployment Workflow

To protect existing Parameter Store configurations from being overwritten during
deployment, use the automated backup/restore scripts:

```bash
# 1. BACKUP existing configuration before deployment
pnpm run deploy:prod:backup    # Safely backs up existing configuration

# 2. DEPLOY (this will overwrite the parameter with defaults)
pnpm run deploy:prod

# 3. RESTORE your custom configuration
pnpm run deploy:prod:restore   # Restores your custom configuration

# For development environment:
pnpm run deploy:dev:backup
pnpm run deploy:dev
pnpm run deploy:dev:restore
```

**Script Features:**

- ✅ **Smart error handling**: Gracefully handles non-existent parameters
- ✅ **Empty parameter protection**: Warns about empty configurations
- ✅ **JSON validation**: Ensures backup integrity before restore
- ✅ **Cross-platform**: Works on Windows, macOS, and Linux
- ✅ **Detailed feedback**: Clear console output with status indicators

**What happens if no parameter exists?**

- Backup script: Creates an empty backup file and notifies you
- Restore script: Skips restoration and notifies you (no changes made)

**What happens with empty parameters?**

- Backup script: Creates backup but warns about empty configuration
- Restore script: Validates content before restoration

#### Manual Parameter Management

```bash
# View current configuration
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text | jq .

# Backup manually
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text > my-backup.json

# Restore manually
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value file://my-backup.json --overwrite
```

#### Build and Review Process

```bash
# Build and review changes before deployment
pnpm run build:all
pnpm run synth    # Generate CloudFormation template
pnpm run diff     # Review changes
pnpm run deploy   # Deploy if changes look good
```

**💡 Recommended Workflow:**

1. **Always backup** before deployment: `pnpm run deploy:prod:backup`
2. **Deploy safely**: `pnpm run deploy:prod`
3. **Restore customizations**: `pnpm run deploy:prod:restore`
4. **Verify**: Check that your custom schedules are still active

### Managing Schedules

#### View Current Configuration

```bash
aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text | jq .
```

#### Update Schedules

```bash
# Create schedules.json with your configuration
cat > schedules.json << 'EOF'
{
  "description": "Production EC2 schedules",
  "logLevel": "INFO",
  "masterEmails": ["devops@company.com", "ops@company.com"],
  "masterPhones": ["+45XXXXXXXX"],
  "schedules": [
    {
      "name": "production-hours",
      "enabled": true,
      "timezone": "Europe/London",
      "default": "06:00;22:00",
      "emails": ["inherited"],
      "phones": ["inherited"]
    },
    {
      "name": "development",
      "enabled": true,
      "timezone": "Europe/London",
      "default": "08:00;18:00",
      "emails": ["inherited", "dev-team@company.com"],
      "phones": ["!+45YYYYYYYY"]
    }
  ]
}
EOF

# Apply the configuration
aws ssm put-parameter --name "/ec2-start-stop/schedules" --value file://schedules.json --overwrite
```

### Monitoring and Troubleshooting

#### Email Notifications

The system automatically sends email notifications for all EC2 instance state
changes and failures, plus SMS alerts for critical failures:

**Email Notifications (All Events):**

- **Instance Started**: Notification when an instance is successfully started
- **Instance Stopped**: Notification when an instance is successfully stopped
- **Start Failed**: Alert when instance start operation fails
- **Stop Failed**: Alert when instance stop operation fails

**SMS Notifications:**

- **Critical Failures**: Start/stop failures sent to all configured phone
  numbers
- **Non-Critical Events**: Success notifications sent only to phones with `!`
  prefix
- **Cost-Optimized**: By default, only critical failures trigger SMS

**Configuration:**

- Notifications are configured per-schedule with inheritance support in
  Parameter Store
- Master notifications can be inherited by individual schedules
- No longer uses environment variables - all configuration is in Parameter Store
- Requires proper SES and SNS permissions in the Lambda execution role

**Cost Analysis:**

- **Email**: Free (within SES free tier limits)
- **SMS**: ~€0.0395 per SMS to Denmark (~0.30 DKK)
- **Estimated SMS cost**: 2-4 failures/month = ~1-2 DKK/month (very low for
  critical alerts)
- **Non-Critical SMS**: Optional feature for those wanting all notifications

**SES Setup Requirements:**

1. **Verify the admin email address in Amazon SES**:

   ```bash
   # Verify your admin email
   aws ses verify-email-identity --email-address your-admin@email.com --profile your-profile

   # Check verification status
   aws ses get-identity-verification-attributes --identities your-admin@email.com --profile your-profile

   # List all verified identities
   aws ses list-identities --profile your-profile
   ```

   Check your email and click the verification link.

2. **Ensure SES is available in your deployment region** SES is available in:
   us-east-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-2, and others.

3. **SES Sandbox Mode is recommended for this project**:
   - **Sandbox Mode**: Only verified emails can receive notifications -
     **perfect for admin alerts**
   - **Production Mode**: Can send to any email address (usually unnecessary for
     infrastructure notifications)
   - **Recommendation**: Stay in sandbox mode unless you need to send alerts to
     multiple unverified recipients

   **Why Sandbox Mode Works Great Here:**
   - ✅ Only sends to verified admin emails (more secure)
   - ✅ Lower risk of accidental spam or misconfiguration
   - ✅ 200 emails/day limit is more than sufficient for EC2 notifications
   - ✅ No approval process needed - works immediately after email verification

   **Only request production access if you need to:**
   - Send alerts to multiple team members with unverified emails
   - Send more than 200 notifications per day (very unlikely for EC2 automation)

4. **SMS Setup (Optional - for critical failure alerts)**:

   ```bash
   # No pre-verification needed for SMS - works immediately after deployment
   # Just ensure your phone number is in international format: +45XXXXXXXX
   ```

   **SMS Configuration:**
   - Configure phone numbers in Parameter Store schedule configuration
   - Use international format (e.g., +45XXXXXXXX)
   - Prefix with `!` for non-critical notifications (e.g., !+45XXXXXXXX)
   - SMS sent for critical failures by default, non-critical optional
   - Cost: ~€0.0395 per SMS to Denmark (~0.30 DKK per SMS)

#### Check Lambda Execution

```bash
# View recent logs
aws logs tail /aws/lambda/ec2-start-stop-function --follow
```

#### Verify EC2 Instance Tags

```bash
# List instances with start-stop-schedule tag
aws ec2 describe-instances --filters "Name=tag-key,Values=start-stop-schedule" --query "Reservations[].Instances[].[InstanceId,Tags[?Key=='start-stop-schedule'].Value|[0],State.Name]" --output table
```

### Common Use Cases

#### Development Environment (9-5 weekdays only)

```json
{
  "name": "dev-environment",
  "enabled": true,
  "timezone": "America/New_York",
  "mo": "09:00;17:00",
  "tu": "09:00;17:00",
  "we": "09:00;17:00",
  "th": "09:00;17:00",
  "fr": "09:00;17:00",
  "sa": "never;never",
  "su": "never;never"
}
```

#### European Business Hours

```json
{
  "name": "eu-business",
  "enabled": true,
  "timezone": "Europe/Berlin",
  "default": "08:00;18:00"
}
```

#### Always-On Production Services

```json
{
  "name": "production-24x7",
  "enabled": true,
  "timezone": "UTC",
  "default": "00:00;never"
}
```

#### Maintenance Mode (Always Off)

```json
{
  "name": "maintenance",
  "enabled": true,
  "timezone": "UTC",
  "default": "never;never"
}
```

## Development

### Local Development Setup

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Start development with file watching
pnpm run watch
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage report
pnpm run test:coverage

# Lint code
pnpm run lint
pnpm run lint:fix
```

### Code Quality & Pre-commit Hooks

This project includes automated code quality checks that run before every
commit:

```bash
# Manual pre-commit check (recommended before committing)
pnpm run precommit

# Quick format and lint fix
pnpm run fix

# Check code quality without fixing
pnpm run check
```

**Pre-commit Hook:** Automatically runs before `git commit` and includes:

- ✅ Code formatting (Prettier)
- ✅ Lint fixes (ESLint)
- ✅ Build verification (TypeScript)
- ✅ Test execution (All 6 tests)

**Windows Users:** The pre-commit hooks work seamlessly on:

- ✅ **Git Bash** (recommended)
- ✅ **PowerShell**
- ✅ **Command Prompt**
- ✅ **VS Code integrated terminal**

If you encounter issues with the pre-commit hook, use the fallback:

```bash
# Fallback for Windows environments
pnpm run precommit:simple
```

### Build Management

```bash
# Clean all generated files
pnpm run clean

# Build everything (Lambda + CDK)
pnpm run build:all

# Build only Lambda function
pnpm run build:lambda

# Build only CDK project
pnpm run build
```

## Project Structure

```
├── bin/
│   └── ec2-start-stop.ts          # CDK app entry point
├── lib/
│   └── ec2-start-stop-stack.ts    # CDK stack definition
├── lambda/
│   ├── src/
│   │   ├── index.ts               # Lambda function handler
│   │   ├── types.ts               # TypeScript interfaces and validation
│   │   ├── constants.ts           # Application constants
│   │   └── default-config.ts      # Default schedule configuration
│   ├── dist/                      # Compiled Lambda code (generated)
│   ├── package.json               # Lambda dependencies
│   └── tsconfig.json              # Lambda TypeScript config
├── test/
│   ├── lambda.test.ts             # Lambda function tests
│   └── stack.test.ts              # CDK stack tests
├── dist/                          # Compiled CDK code (generated)
├── package.json                   # Project dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Test configuration
├── cdk.json                       # CDK configuration
└── README.md                      # This documentation
```

## Cost Analysis

### Monthly Costs (EU-Central-1)

| Service         | Usage                       | Cost (USD)  | Cost (DKK)       |
| --------------- | --------------------------- | ----------- | ---------------- |
| Lambda          | 2,880 invocations, ~3s each | $0.00       | 0.00 (free tier) |
| EventBridge     | 2,880 events                | $0.003      | 0.02             |
| Parameter Store | Standard params             | $0.00       | 0.00 (free tier) |
| CloudWatch Logs | ~3MB storage                | $0.01       | 0.07             |
| **Total**       |                             | **~$0.013** | **~0.09 DKK**    |

### ROI Calculation

**Example**: Single t3.micro instance

- **Instance cost**: €0.0116/hour = 0.08 DKK/hour
- **Savings** (8 hours off daily): 0.64 DKK/day = 19.2 DKK/month
- **Scheduler cost**: 0.09 DKK/month
- **Net savings**: 19.11 DKK/month
- **ROI**: 21,233%

The scheduler pays for itself within hours of deployment!

## Troubleshooting

### Instance Not Starting/Stopping

1. **Verify instance tags:**

   ```bash
   aws ec2 describe-instances --instance-ids i-XXXXXXXXX --query "Reservations[].Instances[].Tags"
   ```

2. **Check schedule name match:**
   - Tag value must match schedule name exactly (case-insensitive)
   - Verify schedule exists in Parameter Store configuration

3. **Validate timezone and time:**

   ```bash
   # Check current time in schedule timezone
   date -d "TZ='Europe/Berlin'"
   ```

4. **Review Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/ec2-start-stop-function --since 1h
   ```

### Common Issues

| Issue                  | Symptoms                              | Solution                                                |
| ---------------------- | ------------------------------------- | ------------------------------------------------------- |
| **Schedule not found** | "references unknown schedule" in logs | Add schedule to Parameter Store config                  |
| **Invalid timezone**   | "invalid timezone" error              | Use valid IANA timezone (e.g., "UTC", "Europe/London")  |
| **No instances found** | "No instances found with tag"         | Verify tag key is exactly `start-stop-schedule`         |
| **Permission denied**  | IAM errors in logs                    | Check Lambda execution role has EC2 and SSM permissions |
| **Schedule disabled**  | "schedule disabled" in logs           | Set `"enabled": true` in schedule config                |

### Debug Commands

```bash
# Test Lambda function manually
aws lambda invoke --function-name ec2-start-stop-function --payload '{}' output.json

# View Parameter Store configuration
aws ssm get-parameter --name "/ec2-start-stop/schedules" | jq .Parameter.Value

# List all managed instances
aws ec2 describe-instances --filters "Name=tag-key,Values=start-stop-schedule" --query "Reservations[].Instances[].[InstanceId,State.Name,Tags[?Key=='start-stop-schedule'].Value|[0]]" --output table

# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name Ec2StartStopStack
```

## Security Considerations

- **Least Privilege**: Lambda role has minimal required permissions
- **Resource Scoping**: EC2 permissions use wildcards (required for describe
  operations)
- **Parameter Store**: Schedules stored in standard parameters (consider
  SecureString for sensitive data)
- **Network**: Lambda runs in AWS VPC by default (no custom VPC required)

## FAQ

**Q: Can I use different regions?** A: Yes, deploy the stack in each region
where you have EC2 instances.

**Q: How do I handle DST changes?** A: Luxon automatically handles DST
transitions for IANA timezones.

**Q: Can I test schedules before deploying?** A: Yes, use the test suite:
`pnpm test` and review the mock scenarios.

**Q: What happens if Lambda fails?** A: EventBridge will retry on the next
15-minute interval. Check CloudWatch Logs for errors.

**Q: Can I use this with Auto Scaling Groups?** A: Individual instances in ASGs
can be managed, but consider ASG scheduling instead for better integration.

**Q: How do I backup my schedule configuration?** A: Export from Parameter
Store:
`aws ssm get-parameter --name "/ec2-start-stop/schedules" --query "Parameter.Value" --output text > backup.json`

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Add tests** for new functionality
4. **Run tests** (`pnpm test`) and **linting** (`pnpm run lint`)
5. **Commit** changes (`git commit -m 'Add amazing feature'`)
6. **Push** to branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

**Created by:** Klaus Bjorn Jensen <kl4u5.j3n53n@gmail.com> (August 19, 2025)

The MIT License allows you to use this software for any purpose, including
commercial use, modification, and distribution, at your own risk and without
warranty.

## Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: This README and inline code comments
- **Community**: Contributions welcome!
