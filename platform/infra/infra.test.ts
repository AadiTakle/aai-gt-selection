import { describe, expect, it } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { bankRoutes } from '@gt/qbank/wire';
import { MAIN_TABLE_INDEXES } from '@platform/store';
import { Stack } from 'aws-cdk-lib';
import { ApiStack } from './lib/api-stack.js';
import { DataStack } from './lib/data-stack.js';
import { REQUIRED_TAG_KEYS, tagPlatform } from './lib/tags.js';

/**
 * Assertions against the synthesised template.
 *
 * No credentials are needed and none are used: the stacks are environment-agnostic and perform no
 * context lookups, which is the property that lets this whole phase be verified without an AWS
 * account.
 *
 * The load-bearing test is the IAM boundary. Everything else here is a guardrail; that one is the
 * design.
 */

// Region-explicit, account-agnostic: the same shape `bin/platform.ts` builds, and the reason no
// credentials are needed to run this.
const env = { region: 'us-east-2' };
const app = new App();
const data = new DataStack(app, 'TestData', { env });
const api = new ApiStack(app, 'TestApi', { env, data });
const dataTemplate = Template.fromStack(data);
const apiTemplate = Template.fromStack(api);

/** Every policy statement attached to a role, flattened to strings for substring matching. */
function statementsForRole(roleLogicalIdFragment: string): string[] {
  const policies = apiTemplate.findResources('AWS::IAM::Policy');
  const out: string[] = [];
  for (const policy of Object.values(policies)) {
    const roles = (policy.Properties?.Roles ?? []) as unknown[];
    const mentionsRole = JSON.stringify(roles).includes(roleLogicalIdFragment);
    if (!mentionsRole) continue;
    out.push(JSON.stringify(policy.Properties?.PolicyDocument ?? {}));
  }
  return out;
}

function roleLogicalId(functionLogicalIdFragment: string): string {
  const roles = apiTemplate.findResources('AWS::IAM::Role');
  const match = Object.keys(roles).find((id) => id.startsWith(functionLogicalIdFragment));
  if (!match) throw new Error(`no role found for ${functionLogicalIdFragment}`);
  return match;
}

describe('the answer-key boundary', () => {
  /**
   * The single most important assertion in this repository's infrastructure.
   *
   * In the local prototype the process that serves an item is the process that holds its answer key,
   * and `toServed()` strips it on the way out. That is one careless refactor away from a leak. Here the
   * serving function's role has no statement naming the answer-key table at all, so the leak is not
   * prevented by code review — it is unavailable.
   */
  it('grants the serve function nothing on the answer-key table', () => {
    const answerKeyLogicalId = Object.keys(
      dataTemplate.findResources('AWS::DynamoDB::GlobalTable', {}),
    ).find((id) => id.startsWith('AnswerKeyTable'));
    expect(answerKeyLogicalId).toBeDefined();

    const serveRole = roleLogicalId('ServeFnServiceRole');
    const documents = statementsForRole(serveRole);
    expect(documents.length).toBeGreaterThan(0);

    for (const document of documents) {
      expect(document).not.toContain('AnswerKeyTable');
      expect(document).not.toContain('PersonaTable');
    }
  });

  it('grants the score function read access to it, because marking needs the key', () => {
    const scoreRole = roleLogicalId('ScoreFnServiceRole');
    const documents = statementsForRole(scoreRole).join('|');
    expect(documents).toContain('AnswerKeyTable');
  });

  it('grants the catalog function no write access anywhere', () => {
    const catalogRole = roleLogicalId('CatalogFnServiceRole');
    const documents = statementsForRole(catalogRole).join('|');
    expect(documents).not.toContain('dynamodb:PutItem');
    expect(documents).not.toContain('dynamodb:UpdateItem');
    expect(documents).not.toContain('AnswerKeyTable');
  });

  it('grants only score and rescore access to the persona key', () => {
    for (const [fragment, expected] of [
      ['ScoreFnServiceRole', true],
      ['ServeFnServiceRole', false],
      ['CatalogFnServiceRole', false],
    ] as const) {
      const documents = statementsForRole(roleLogicalId(fragment)).join('|');
      expect(documents.includes('PersonaKey')).toBe(expected);
    }
  });
});

describe('tables', () => {
  it('creates three of them, all on-demand billing', () => {
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    expect(Object.keys(tables)).toHaveLength(3);
    for (const table of Object.values(tables)) {
      expect(table.Properties?.BillingMode).toBe('PAY_PER_REQUEST');
    }
  });

  it('declares all six indexes from spec section 6.3 on the main table', () => {
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    const main = Object.entries(tables).find(([id]) => id.startsWith('PlatformTable'))?.[1];
    expect(main).toBeDefined();

    const declared = (
      (main?.Properties?.GlobalSecondaryIndexes ?? []) as { IndexName: string }[]
    ).map((ix) => ix.IndexName);
    expect(declared.sort()).toEqual(MAIN_TABLE_INDEXES.map((ix) => ix.name).sort());
  });

  it('turns point-in-time recovery on for every table', () => {
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    for (const table of Object.values(tables)) {
      const replicas = (table.Properties?.Replicas ?? []) as {
        PointInTimeRecoverySpecification?: { PointInTimeRecoveryEnabled?: boolean };
      }[];
      expect(replicas.length).toBeGreaterThan(0);
      for (const replica of replicas) {
        expect(replica.PointInTimeRecoverySpecification?.PointInTimeRecoveryEnabled).toBe(true);
      }
    }
  });

  it('retains every table on stack deletion, because sessions are the only record of a decision', () => {
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    for (const table of Object.values(tables)) {
      expect(table.DeletionPolicy).toBe('Retain');
      expect(table.UpdateReplacePolicy).toBe('Retain');
    }
  });

  it('encrypts the persona table with a customer-managed key', () => {
    dataTemplate.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    const persona = Object.entries(tables).find(([id]) => id.startsWith('PersonaTable'))?.[1];
    const replicas = (persona?.Properties?.Replicas ?? []) as {
      SSESpecification?: { KMSMasterKeyId?: unknown };
    }[];
    expect(replicas[0]?.SSESpecification?.KMSMasterKeyId).toBeDefined();
  });

  it('gives the main table a stream, which the outbox is published from', () => {
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    const main = Object.entries(tables).find(([id]) => id.startsWith('PlatformTable'))?.[1];
    expect(main?.Properties?.StreamSpecification?.StreamViewType).toBe('NEW_AND_OLD_IMAGES');
  });

  it('configures time to live on the main and persona tables', () => {
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    for (const prefix of ['PlatformTable', 'PersonaTable']) {
      const table = Object.entries(tables).find(([id]) => id.startsWith(prefix))?.[1];
      expect(table?.Properties?.TimeToLiveSpecification?.Enabled).toBe(true);
      expect(table?.Properties?.TimeToLiveSpecification?.AttributeName).toBe('ttl');
    }
  });
});

describe('the snapshot bucket', () => {
  it('blocks all public access and requires TLS', () => {
    dataTemplate.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    const policies = dataTemplate.findResources('AWS::S3::BucketPolicy');
    expect(JSON.stringify(policies)).toContain('aws:SecureTransport');
  });

  it('is versioned, so a bad publish can be read back', () => {
    dataTemplate.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });
});

describe('queues', () => {
  it('gives both work queues a dead letter queue', () => {
    const queues = dataTemplate.findResources('AWS::SQS::Queue');
    const withDlq = Object.values(queues).filter((q) => q.Properties?.RedrivePolicy);
    expect(withDlq).toHaveLength(2);
  });

  it('gives the rescore queue a visibility timeout longer than the worker can run', () => {
    const queues = dataTemplate.findResources('AWS::SQS::Queue');
    const rescore = Object.entries(queues).find(([id]) => id.startsWith('RescoreQueue'))?.[1];
    // The worker times out at five minutes; anything shorter here delivers the same batch twice
    // while the first attempt is still running.
    expect(rescore?.Properties?.VisibilityTimeout).toBeGreaterThan(300);
  });
});

describe('functions', () => {
  it('caps concurrency on every one of them', () => {
    const functions = apiTemplate.findResources('AWS::Lambda::Function');
    const platformFunctions = Object.entries(functions).filter(([id]) => id.endsWith('Fn') || /Fn[0-9A-F]{8}$/.test(id));
    expect(platformFunctions.length).toBeGreaterThanOrEqual(6);
    for (const [id, fn] of platformFunctions) {
      expect(
        fn.Properties?.ReservedConcurrentExecutions,
        `${id} has no reserved concurrency`,
      ).toBeGreaterThan(0);
    }
  });

  it('runs them all on a supported Node runtime', () => {
    const functions = apiTemplate.findResources('AWS::Lambda::Function');
    for (const [id, fn] of Object.entries(functions)) {
      if (!(id.endsWith('Fn') || /Fn[0-9A-F]{8}$/.test(id))) continue;
      // Node 20 was deprecated on 2026-04-30 and creation is disabled from 2027-02-01.
      expect(fn.Properties?.Runtime).toBe('nodejs24.x');
    }
  });
});

describe('routing', () => {
  it('protects every admin route with IAM rather than an app key', () => {
    const routes = apiTemplate.findResources('AWS::ApiGatewayV2::Route');
    const admin = Object.values(routes).filter((r) =>
      String(r.Properties?.RouteKey ?? '').includes('/v1/admin/'),
    );
    expect(admin.length).toBe(4);
    for (const route of admin) {
      // An app key ships inside a Roblox place or a web bundle. A route that can publish a catalog
      // cannot accept a credential with that property.
      expect(route.Properties?.AuthorizationType).toBe('AWS_IAM');
    }
  });

  it('protects every non-admin route with the app-key authorizer', () => {
    const routes = apiTemplate.findResources('AWS::ApiGatewayV2::Route');
    const app = Object.values(routes).filter(
      (r) => !String(r.Properties?.RouteKey ?? '').includes('/v1/admin/'),
    );
    expect(app.length).toBeGreaterThan(0);
    for (const route of app) {
      expect(route.Properties?.AuthorizationType).toBe('CUSTOM');
      expect(route.Properties?.AuthorizerId).toBeDefined();
    }
  });

  it('declares the routes the apps actually call', () => {
    const routes = apiTemplate.findResources('AWS::ApiGatewayV2::Route');
    const keys = Object.values(routes).map((r) => String(r.Properties?.RouteKey));
    for (const expected of [
      'GET /api/bank',
      'POST /api/bank/sessions',
      'GET /api/bank/sessions/{sessionId}/next',
      'POST /api/bank/sessions/{sessionId}/answer',
      'GET /v1/sessions/{sessionId}/sheet',
      'GET /v1/catalog/types',
      'POST /v1/admin/catalog/publish',
    ]) {
      expect(keys).toContain(expected);
    }
  });

  /**
   * The stack spells its paths out as literals, because API Gateway needs `{param}` where the contract's
   * route builders produce a concrete URL. This is what keeps the two from drifting: a rename in
   * `bankRoutes` fails here rather than at runtime.
   */
  it('agrees with the contract about where the bank routes live', () => {
    const routes = apiTemplate.findResources('AWS::ApiGatewayV2::Route');
    const keys = new Set(Object.values(routes).map((r) => String(r.Properties?.RouteKey)));

    const templated = (built: string) => built.replace(/\/sessions\/[^/]+/, '/sessions/{sessionId}');
    expect(keys).toContain(`GET ${bankRoutes.catalogue()}`);
    expect(keys).toContain(`POST ${bankRoutes.createSession()}`);
    expect(keys).toContain(`GET ${templated(bankRoutes.next('x'))}`);
    expect(keys).toContain(`POST ${templated(bankRoutes.answer('x'))}`);
  });

  it('does not expose the operator debug route to an app key', () => {
    const routes = apiTemplate.findResources('AWS::ApiGatewayV2::Route');
    const keys = Object.values(routes).map((r) => String(r.Properties?.RouteKey));
    // The contract's fifth route reports the posterior mean. It is deliberately not served here at all
    // rather than served behind the app-key authorizer.
    expect(keys.some((key) => key.includes('/debug'))).toBe(false);
  });
});

describe('the stacks synthesise without credentials', () => {
  it('leaves the account a token, so nothing here is bound to one', () => {
    expect(data.account).toContain('${Token');
  });

  it('pins the region, because a CMK-encrypted global table cannot render without one', () => {
    expect(data.region).toBe('us-east-2');
  });

  it('defaults away from us-east-1, where the archive deployment lives', () => {
    expect(data.region).not.toBe('us-east-1');
  });

  it('tags every resource type, so spend in a shared account is attributable', () => {
    // A global table carries its tags on the replica rather than at the top level, which is why this
    // asserts both shapes instead of one.
    const tables = dataTemplate.findResources('AWS::DynamoDB::GlobalTable');
    for (const table of Object.values(tables)) {
      const replicaTags = JSON.stringify(table.Properties?.Replicas?.[0]?.Tags ?? []);
      expect(replicaTags).toContain('gt-question-platform');
    }

    for (const type of ['AWS::S3::Bucket', 'AWS::SQS::Queue']) {
      const resources = dataTemplate.findResources(type);
      expect(Object.keys(resources).length).toBeGreaterThan(0);
      for (const resource of Object.values(resources)) {
        expect(JSON.stringify(resource.Properties?.Tags ?? [])).toContain('gt-question-platform');
      }
    }
  });

  it('tags the api stack too, since tagging lives in the stacks and not the entry point', () => {
    const functions = apiTemplate.findResources('AWS::Lambda::Function');
    const tagged = Object.values(functions).filter((fn) =>
      JSON.stringify(fn.Properties?.Tags ?? []).includes('gt-question-platform'),
    );
    expect(tagged.length).toBeGreaterThanOrEqual(6);
  });
});

describe('SEC-05 required tags', () => {
  /**
   * The four keys, on every taggable resource in both stacks.
   *
   * Asserted because getting this wrong is silent and expensive: tag keys are case-sensitive, so the previous
   * lowercase `project` satisfied nothing, and the policy's remedy for an untagged resource is to delete it.
   * The keys come from the module rather than being retyped here, so the test cannot drift from what is applied.
   */
  it('applies Project, Environment, ManagedBy and Owner to every tagged resource', () => {
    for (const template of [dataTemplate, apiTemplate]) {
      const all = template.toJSON() as {
        Resources?: Record<string, { Properties?: { Tags?: { Key?: string }[] } }>;
      };
      const tagged = Object.entries(all.Resources ?? {}).filter(([, r]) =>
        Array.isArray(r.Properties?.Tags),
      );
      expect(tagged.length).toBeGreaterThan(0);
      for (const [name, resource] of tagged) {
        const keys = (resource.Properties?.Tags ?? []).map((t) => t.Key);
        for (const key of REQUIRED_TAG_KEYS) {
          expect(keys, `${name} is missing the ${key} tag`).toContain(key);
        }
      }
    }
  });

  it('refuses an environment the policy does not allow', () => {
    // A typo here would otherwise deploy and then fail a compliance scan days later.
    expect(() => tagPlatform(new Stack(new App(), 'T'), { environment: 'prod' })).toThrow(/must be one of/);
  });

  it('refuses an empty owner', () => {
    expect(() => tagPlatform(new Stack(new App(), 'T2'), { owner: '  ' })).toThrow(/unowned/);
  });
});
