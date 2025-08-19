import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class Ec2StartStopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameter Store parameter for schedules configuration
    const schedulesParameter = new ssm.StringParameter(this, 'Ec2SchedulesParameter', {
      parameterName: '/ec2-start-stop/schedules',
      description: 'EC2 start/stop schedules configuration',
      stringValue: JSON.stringify({
        schedules: [
          {
            name: 'my-dev-servers',
            enabled: true,
            timezone: 'Europe/Berlin',
            mo: '07:00;22:00',
            tu: '09:00;15:00',
            we: '07:00;09:30',
            th: 'never;10:00',
            fr: '07:00;never',
            sa: '12:30;16:00',
            su: 'never;06:00',
            default: '07:00;22:00'
          }
        ],
        maintainers: ['john.doe@example.com', 'jane.smith@example.com']
      }, null, 2),
      tier: ssm.ParameterTier.STANDARD,
    });

    // IAM role for the Lambda function
    const lambdaRole = new iam.Role(this, 'Ec2StartStopLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        Ec2StartStopPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:DescribeInstances',
                'ec2:StartInstances',
                'ec2:StopInstances',
                'ec2:DescribeInstanceStatus',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter'],
              resources: [schedulesParameter.parameterArn],
            }),
          ],
        }),
      },
    });

    // Lambda function for EC2 start/stop logic
    const ec2StartStopFunction = new lambda.Function(this, 'Ec2StartStopFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      role: lambdaRole,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.minutes(5),
      environment: {
        SCHEDULES_PARAMETER_NAME: schedulesParameter.parameterName,
      },
      description: 'Automatically starts and stops EC2 instances based on schedules',
      logRetention: logs.RetentionDays.TWO_MONTHS,
    });

    // EventBridge rule to trigger the Lambda every 15 minutes
    const scheduleRule = new events.Rule(this, 'Ec2StartStopScheduleRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      description: 'Triggers EC2 start/stop function every 15 minutes',
    });

    // Add the Lambda function as a target for the EventBridge rule
    scheduleRule.addTarget(new targets.LambdaFunction(ec2StartStopFunction));

    // Output the parameter name for reference
    new cdk.CfnOutput(this, 'SchedulesParameterName', {
      value: schedulesParameter.parameterName,
      description: 'Parameter Store parameter name for schedules configuration',
    });

    // Output the Lambda function name
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: ec2StartStopFunction.functionName,
      description: 'Name of the EC2 start/stop Lambda function',
    });
  }
}
