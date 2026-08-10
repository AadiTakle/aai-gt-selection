#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack.js';
import { DataStack } from '../lib/data-stack.js';

/**
 * The CDK app.
 *
 * Account-agnostic, region-explicit, and no context lookups anywhere in the tree. That combination is
 * what lets `cdk synth` produce reviewable CloudFormation with no AWS credentials present: the account
 * stays a token, and nothing asks AWS a question at synth time.
 *
 * The region has to be concrete rather than agnostic because a DynamoDB global table encrypted with a
 * customer-managed key cannot render its replica's SSE specification without one. Making it explicit is
 * the better outcome anyway, since it turns "which region" from an unstated assumption into a value in
 * one place.
 *
 * The default is deliberately **not** us-east-1. The archive's live App Runner service runs there, and
 * a different region costs nothing while adding one more layer between this platform and a deployment
 * that is currently in use. Override with `cdk synth -c region=...`.
 */
const app = new App();

const prefix = app.node.tryGetContext('prefix') ?? 'GtQuestionPlatform';
const region = app.node.tryGetContext('region') ?? 'us-east-2';
const env = { region };

const data = new DataStack(app, `${prefix}Data`, {
  env,
  description: 'GT question platform: tables, snapshot bucket, keys and queues.',
});

new ApiStack(app, `${prefix}Api`, {
  env,
  description: 'GT question platform: HTTP API, authorizer and the five functions.',
  data,
});
