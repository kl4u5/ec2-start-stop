import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
import { DEFAULTS, ENV_VARS } from '../lambda/src/constants';
import { DEFAULT_SCHEDULES_CONFIG } from '../lambda/src/default-config';

export class Ec2StartStopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameter Store parameter for schedules configuration
    const schedulesParameter = new ssm.StringParameter(this, 'Ec2SchedulesParameter', {
      parameterName: DEFAULTS.SCHEDULES_PARAMETER_NAME,
      description: 'EC2 start/stop schedules configuration',
      stringValue: JSON.stringify(DEFAULT_SCHEDULES_CONFIG, null, 2),
      tier: ssm.ParameterTier.STANDARD,
    });

    // IAM role for the Lambda function
    const lambdaRole = new iam.Role(this, 'Ec2StartStopLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
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
    const ec2StartStopFunction = new nodejs.NodejsFunction(this, 'Ec2StartStopFunction', {
      functionName: 'ec2-start-stop-function',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      role: lambdaRole,
      entry: path.join(__dirname, '../lambda/src/index.ts'),
      timeout: cdk.Duration.minutes(5),
      environment: {
        [ENV_VARS.SCHEDULES_PARAMETER_NAME]: schedulesParameter.parameterName,
      },
      description: 'Automatically starts and stops EC2 instances based on schedules',
      logRetention: logs.RetentionDays.TWO_MONTHS,
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'es2022',
        format: nodejs.OutputFormat.CJS,
        externalModules: ['@aws-sdk/*'], // AWS SDK is provided by Lambda runtime
      },
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
