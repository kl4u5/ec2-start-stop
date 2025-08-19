import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
      ScheduleExpression: 'rate(15 minutes)',
    });

    // Verify Parameter Store parameter is created
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/ec2-start-stop/schedules',
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

    // Check for EC2 permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Effect: 'Allow',
            Action: [
              'ec2:DescribeInstances',
              'ec2:StartInstances',
              'ec2:StopInstances',
              'ec2:DescribeInstanceStatus',
            ],
          }),
        ]),
      },
    });

    // Check for SSM permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Effect: 'Allow',
            Action: ['ssm:GetParameter'],
          }),
        ]),
      },
    });
  });
});
