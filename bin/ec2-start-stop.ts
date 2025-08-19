#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Ec2StartStopStack } from '../lib/ec2-start-stop-stack';

const app = new cdk.App();

new Ec2StartStopStack(app, 'Ec2StartStopStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
