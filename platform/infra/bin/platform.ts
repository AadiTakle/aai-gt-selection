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
 * The default is us-east-1, and it took a failed deployment to establish that it has to be.
 *
 * This said us-east-2 for a reason that sounded good and was wrong: the archive's live App Runner service runs
 * in us-east-1, so a different region seemed like a free layer of separation. It is not free and it was not
 * separation. The archive lives in the LEGACY account and this deploys to SANDBOX — two different accounts, so
 * the isolation was already total and the region bought nothing.
 *
 * What it cost: an organisation service control policy on the sandbox account
 * (`p-puijrmvl`) denies actions outside us-east-1 outright. `dynamodb:CreateTable` in us-east-2 came back as an
 * explicit SCP deny, the data stack rolled back, and no amount of IAM in this repository could have helped —
 * an SCP sits above the account. Confirmed by creating the same table by hand: denied in us-east-2, created in
 * us-east-1.
 *
 * Which is also the answer to why emulation could not have caught this. DynamoDB Local has no notion of an
 * organisation, so every local run was correct and every local run was silent about the one thing that mattered.
 *
 * Override with `-c region=...` if a future account allows more.
 */
const app = new App();

const prefix = app.node.tryGetContext('prefix') ?? 'GtQuestionPlatform';
const region = app.node.tryGetContext('region') ?? 'us-east-1';
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
