import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { Ec2StartStopStack } from '../lib/ec2-start-stop-stack';

describe('Ec2StartStopStack', () => {
  it('should create required resources', () => {
    const app = new cdk.App();
    const stack = new Ec2StartStopStack(app, 'TestStack');

    const template = Template.fromStack(stack);

    // Verify Lambda function is created
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Handler: 'index.handler',
    });

    // Verify EventBridge rule is created
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(0,15,30,45 * * * ? *)',
    });

    // Verify Parameter Store parameters are created
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/ec2-start-stop/schedules',
      Type: 'String',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/ec2-start-stop/documentation',
      Type: 'String',
    });

    // Verify IAM role has correct permissions
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    });
  });

  it('should have correct IAM permissions', () => {
    const app = new cdk.App();
    const stack = new Ec2StartStopStack(app, 'TestStack');

    const template = Template.fromStack(stack);

    // Check for Lambda execution role with proper permissions
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    });

    // Find the Lambda functions (main + log retention)
    const lambdaResources = template.findResources('AWS::Lambda::Function');
    expect(Object.keys(lambdaResources).length).toBeGreaterThanOrEqual(1);

    // Check that our main Lambda function exists with correct properties
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Handler: 'index.handler',
    });
  });
});
