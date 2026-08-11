import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import {
  HttpIamAuthorizer,
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { join } from 'node:path';
import type { Construct } from 'constructs';
import type { DataStack } from './data-stack.js';
import { tagPlatform } from './tags.js';

export interface ApiStackProps extends StackProps {
  readonly data: DataStack;
}

const HERE = join(import.meta.dirname, '..', '..');

/**
 * The request path, and the permission boundaries that make it safe.
 *
 * Five functions split by what they are allowed to touch rather than by what is convenient to
 * deploy together. The split that matters: `serve` is granted nothing on the answer-key table, so an
 * answer key cannot leave through the serving path even if the serving code is wrong. In the local
 * prototype the same process holds the key and strips it before responding, which is one careless
 * refactor away from a leak. A missing IAM statement is not.
 */
export class ApiStack extends Stack {
  readonly api: HttpApi;
  readonly serveFn: NodejsFunction;
  readonly scoreFn: NodejsFunction;
  readonly catalogFn: NodejsFunction;
  readonly adminFn: NodejsFunction;
  readonly rescoreFn: NodejsFunction;
  readonly authorizerFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    tagPlatform(this);
    const { data } = props;

    const commonEnv = {
      GT_TABLE_NAME: data.mainTable.tableName,
      GT_ANSWER_KEY_TABLE_NAME: data.answerKeyTable.tableName,
      GT_PERSONA_TABLE_NAME: data.personaTable.tableName,
      GT_SNAPSHOT_BUCKET: data.snapshotBucket.bucketName,
      GT_TOKEN_SECRET_ARN: data.tokenSecret.secretArn,
      NODE_OPTIONS: '--enable-source-maps',
    };

    const fn = (name: string, entry: string, overrides: Partial<FnOptions> = {}): NodejsFunction =>
      new NodejsFunction(this, name, {
        entry: join(HERE, entry),
        handler: 'handler',
        runtime: Runtime.NODEJS_24_X,
        memorySize: overrides.memorySize ?? 512,
        timeout: overrides.timeout ?? Duration.seconds(15),
        // Every function is capped. An unbounded concurrency on a public screener endpoint turns a
        // traffic spike into an unbounded bill.
        reservedConcurrentExecutions: overrides.reservedConcurrentExecutions ?? 20,
        // An explicit log group rather than `logRetention`, which is deprecated and which provisions a
        // custom resource to set retention after the fact. Retained on stack deletion because the logs
        // are the only account of what a function did.
        logGroup: new LogGroup(this, `${name}Logs`, {
          retention: RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.RETAIN,
        }),
        tracing: Tracing.ACTIVE,
        environment: { ...commonEnv, ...(overrides.environment ?? {}) },
        bundling: {
          format: OutputFormat.ESM,
          target: 'node24',
          sourceMap: true,
          minify: false,
          // The workspace tsconfig carries the path aliases that resolve @platform/* and @gt/*, so
          // the bundle contains the same engine source the tests exercise rather than a copy.
          tsconfig: join(HERE, 'tsconfig.json'),
          // ESM output plus a CommonJS dependency graph needs this shim for `require` and
          // `__dirname` inside bundled dependencies.
          banner:
            "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);",
        },
        depsLockFilePath: join(HERE, 'package-lock.json'),
        projectRoot: HERE,
      });

    this.authorizerFn = fn('AuthorizerFn', 'functions/authorizer/src/handler.ts', {
      timeout: Duration.seconds(5),
      memorySize: 256,
    });
    this.catalogFn = fn('CatalogFn', 'functions/catalog/src/handler.ts');
    // Serving holds the whole selection index in memory, so it is the one function that benefits
    // from more than the default allocation.
    this.serveFn = fn('ServeFn', 'functions/serve/src/handler.ts', { memorySize: 1024 });
    this.scoreFn = fn('ScoreFn', 'functions/score/src/handler.ts', { memorySize: 768 });
    this.adminFn = fn('AdminFn', 'functions/admin/src/handler.ts', {
      // Publishing compiles 53 banks and writes several thousand rows.
      timeout: Duration.minutes(10),
      memorySize: 2048,
      reservedConcurrentExecutions: 2,
      environment: { GT_RESCORE_QUEUE_URL: data.rescoreQueue.queueUrl },
    });
    this.rescoreFn = fn('RescoreWorkerFn', 'functions/rescore-worker/src/handler.ts', {
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: { GT_RESCORE_QUEUE_URL: data.rescoreQueue.queueUrl },
    });

    // --- Permissions. Each grant below is deliberate; read the absences as carefully as the grants.

    data.mainTable.grantReadData(this.authorizerFn);
    data.tokenSecret.grantRead(this.authorizerFn);

    data.mainTable.grantReadData(this.catalogFn);

    data.mainTable.grantReadWriteData(this.serveFn);
    data.snapshotBucket.grantRead(this.serveFn);
    data.tokenSecret.grantRead(this.serveFn);
    // No grant on data.answerKeyTable, and no grant on data.personaTable. This is the boundary the
    // infrastructure test asserts.

    data.mainTable.grantReadWriteData(this.scoreFn);
    data.answerKeyTable.grantReadData(this.scoreFn);
    data.personaTable.grantReadWriteData(this.scoreFn);
    data.personaKey.grantEncryptDecrypt(this.scoreFn);
    data.snapshotBucket.grantRead(this.scoreFn);
    data.tokenSecret.grantRead(this.scoreFn);

    data.mainTable.grantReadWriteData(this.adminFn);
    data.answerKeyTable.grantReadWriteData(this.adminFn);
    data.snapshotBucket.grantReadWrite(this.adminFn);
    data.rescoreQueue.grantSendMessages(this.adminFn);
    data.tokenSecret.grantRead(this.adminFn);

    data.mainTable.grantReadWriteData(this.rescoreFn);
    data.answerKeyTable.grantReadData(this.rescoreFn);
    data.rescoreQueue.grantConsumeMessages(this.rescoreFn);

    this.rescoreFn.addEventSource(
      new SqsEventSource(data.rescoreQueue, { batchSize: 10, reportBatchItemFailures: true }),
    );

    // --- Routing

    const authorizer = new HttpLambdaAuthorizer('AppKeyAuthorizer', this.authorizerFn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      identitySource: ['$request.header.x-api-key'],
      // Caching an authorizer result keyed on the API key keeps a busy session from re-reading the
      // key row on every question.
      resultsCacheTtl: Duration.minutes(5),
    });

    this.api = new HttpApi(this, 'PlatformApi', {
      description: 'GT question platform: catalog, serving and scoring.',
      defaultAuthorizer: authorizer,
    });

    const route = (path: string, method: HttpMethod, target: NodejsFunction, name: string): void => {
      this.api.addRoutes({
        path,
        methods: [method],
        integration: new HttpLambdaIntegration(name, target),
      });
    };

    route('/v1/catalog/types', HttpMethod.GET, this.catalogFn, 'CatalogTypes');
    route('/v1/catalog/types/{typeCode}', HttpMethod.GET, this.catalogFn, 'CatalogType');
    route('/v1/catalog/app', HttpMethod.GET, this.catalogFn, 'CatalogApp');

    /**
     * The bank contract, as `@gt/qbank`'s `bankRoutes` declares it.
     *
     * Paths are spelled out here rather than built from `bankRoutes`, because CDK needs literals with
     * API Gateway's `{param}` syntax and the route builders produce concrete URLs. `infra.test.ts`
     * asserts the two agree, so a contract change fails the build rather than the game.
     */
    route('/api/bank', HttpMethod.GET, this.catalogFn, 'BankCatalogue');
    route('/api/bank/sessions', HttpMethod.POST, this.serveFn, 'CreateSession');
    route('/api/bank/sessions/{sessionId}/next', HttpMethod.GET, this.serveFn, 'NextItem');
    route('/api/bank/sessions/{sessionId}/answer', HttpMethod.POST, this.scoreFn, 'AnswerItem');

    // Outside the bank contract, which has no notion of either.
    route('/v1/sessions/{sessionId}/abandon', HttpMethod.POST, this.scoreFn, 'AbandonSession');
    route('/v1/sessions/{sessionId}/sheet', HttpMethod.GET, this.scoreFn, 'ReadSheet');

    /**
     * Admin routes take IAM SigV4 rather than an app key.
     *
     * An app key is embedded in a Roblox place or a web bundle and must be assumed to be public. The
     * routes that publish a catalog or approve a question type cannot accept a credential with that
     * property, so the app-key authorizer is replaced here rather than extended. There is
     * deliberately no api-key path to admin at all.
     */
    const adminAuthorizer = new HttpIamAuthorizer();
    const adminRoutes: readonly [string, HttpMethod, string][] = [
      ['/v1/admin/catalog/publish', HttpMethod.POST, 'AdminPublish'],
      ['/v1/admin/apps', HttpMethod.POST, 'AdminCreateApp'],
      ['/v1/admin/apps/{appId}/types/{typeCode}', HttpMethod.PUT, 'AdminApproveType'],
      ['/v1/admin/items/{itemId}/revise', HttpMethod.POST, 'AdminReviseItem'],
    ];
    for (const [path, method, name] of adminRoutes) {
      this.api.addRoutes({
        path,
        methods: [method],
        integration: new HttpLambdaIntegration(name, this.adminFn),
        authorizer: adminAuthorizer,
      });
    }
  }
}

interface FnOptions {
  readonly memorySize: number;
  readonly timeout: Duration;
  readonly reservedConcurrentExecutions: number;
  readonly environment: Record<string, string>;
}
