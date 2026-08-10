#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack.js';
import { DataStack } from '../lib/data-stack.js';

/**
 * The CDK app.
 *
 * Environment-agnostic on purpose: no `env`, and no context lookups anywhere in the tree. That is
 * what lets `cdk synth` produce reviewable CloudFormation with no AWS credentials present, which is
 * the whole shape of this phase — everything up to the moment someone types `cdk deploy` is built and
 * checked locally.
 *
 * Nothing here references any resource belonging to the archive App Runner deployment, and the
 * intended target is a separate AWS account, so the live service is out of reach by construction
 * rather than by care.
 */
const app = new App();

const prefix = app.node.tryGetContext('prefix') ?? 'GtQuestionPlatform';

const data = new DataStack(app, `${prefix}Data`, {
  description: 'GT question platform: tables, snapshot bucket, keys and queues.',
});

new ApiStack(app, `${prefix}Api`, {
  description: 'GT question platform: HTTP API, authorizer and the five functions.',
  data,
});

Tags.of(app).add('project', 'gt-question-platform');
Tags.of(app).add('managed-by', 'cdk');
Tags.of(app).add('repo', 'aai-gt-selection');
