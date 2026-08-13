import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
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
import { ROUTES } from '@platform/shared';
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

    /**
     * Allowed browser origins, from context, defaulting to none.
     *
     * A game served from its own hosting calls this API cross-origin, and without a preflight answer the
     * browser refuses before a request ever reaches the authorizer — which looks like the platform being down
     * rather than like a missing header. So CORS is not optional for a hosted surface.
     *
     * Deliberately NOT `*`. The api key is embedded in the client and identifies the app rather than a person,
     * so it is not a secret worth protecting with CORS — but a wildcard would also let any page on the internet
     * drive the scoring endpoints with a key lifted from the bundle, and there is no reason to make that easy.
     * Pass the real origins at deploy time:
     *
     *   cdk deploy -c origins=https://bramblebrook.example,https://staging.example
     *
     * `http://localhost:5230` is included by default because the dev proxy makes local play same-origin, and a
     * developer pointing a local game at a deployed stack is a normal thing to want.
     */
    const origins = String(this.node.tryGetContext('origins') ?? 'http://localhost:5230,http://127.0.0.1:5230')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    this.api = new HttpApi(this, 'PlatformApi', {
      description: 'GT question platform: catalog, serving and scoring.',
      defaultAuthorizer: authorizer,
      corsPreflight: {
        allowOrigins: origins,
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.PUT, CorsHttpMethod.OPTIONS],
        // `x-api-key` is the one that matters: it is not a CORS-safelisted header, so without it every
        // authenticated request fails preflight while unauthenticated ones appear to work.
        allowHeaders: ['content-type', 'x-api-key', 'idempotency-key'],
        maxAge: Duration.hours(1),
      },
    });

    /**
     * Routes come from the shared table, not from literals here.
     *
     * The stack and the local dev router had already drifted once — the stack still described
     * `/v1/sessions/*` after the handlers moved to the bank contract, and nothing failed until a test
     * happened to assert a path. One table, read by both.
     */
    const adminAuthorizer = new HttpIamAuthorizer();
    const target: Record<string, NodejsFunction> = {
      catalog: this.catalogFn,
      serve: this.serveFn,
      score: this.scoreFn,
      admin: this.adminFn,
    };

    for (const definition of ROUTES) {
      this.api.addRoutes({
        path: definition.path,
        methods: [HttpMethod[definition.method]],
        integration: new HttpLambdaIntegration(
          definition.id,
          target[definition.fn] as NodejsFunction,
        ),
        ...(definition.auth === 'iam' ? { authorizer: adminAuthorizer } : {}),
      });
    }

    /**
     * The base URL a game points at. This is `VITE_GT_PLATFORM_URL` for a deployed build.
     *
     * `apiEndpoint` rather than `url` because the default stage is `$default`, so the endpoint already IS the
     * base — appending a stage name here would produce a URL that 404s every route.
     */
    new CfnOutput(this, 'ApiBaseUrl', {
      value: this.api.apiEndpoint,
      description: 'VITE_GT_PLATFORM_URL for a deployed game',
    });
  }
}

interface FnOptions {
  readonly memorySize: number;
  readonly timeout: Duration;
  readonly reservedConcurrentExecutions: number;
  readonly environment: Record<string, string>;
}
