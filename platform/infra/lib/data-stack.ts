import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import {
  AttributeType,
  Billing,
  StreamViewType,
  TableEncryptionV2,
  TableV2,
} from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import { MAIN_TABLE_INDEXES, TTL_ATTRIBUTE } from '@platform/store';

/**
 * Storage, and the boundaries drawn around it.
 *
 * Three tables rather than one, and the split is the security design rather than a modelling
 * preference. Answer keys sit alone so that the serving function's role can omit them entirely, and
 * personas sit alone under their own key so that an erasure request destroys contact details without
 * touching the measurement trace that references only a pseudonymous id.
 *
 * Every table retains on stack deletion. A screener whose sessions vanish because someone destroyed
 * a stack has lost the only record of what a family was told.
 */
export class DataStack extends Stack {
  readonly mainTable: TableV2;
  readonly answerKeyTable: TableV2;
  readonly personaTable: TableV2;
  readonly personaKey: Key;
  readonly snapshotBucket: Bucket;
  readonly tokenSecret: Secret;
  readonly rescoreQueue: Queue;
  readonly rescoreDlq: Queue;
  readonly notificationQueue: Queue;
  readonly notificationDlq: Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.mainTable = new TableV2(this, 'PlatformTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billing: Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      // Outbox rows expire; nothing else carries the attribute, so nothing else is affected.
      timeToLiveAttribute: TTL_ATTRIBUTE,
      // The outbox is published off the stream. Both images, because the publisher needs to tell a
      // newly written qualification from an update to a row that already carried one.
      dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: RemovalPolicy.RETAIN,
      globalSecondaryIndexes: MAIN_TABLE_INDEXES.map((index) => ({
        indexName: index.name,
        partitionKey: { name: index.partitionKey, type: AttributeType.STRING },
        sortKey: { name: index.sortKey, type: AttributeType.STRING },
      })),
    });

    this.answerKeyTable = new TableV2(this, 'AnswerKeyTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billing: Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    /**
     * A customer-managed key for the persona table specifically.
     *
     * The point is not that AWS-managed encryption is weak. It is that a separate key gives a
     * separate audit trail and a separate revocation lever for the only data in this system that
     * identifies a human being.
     */
    this.personaKey = new Key(this, 'PersonaKey', {
      description: 'Encrypts the persona table, the only store of guardian contact details.',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.personaTable = new TableV2(this, 'PersonaTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billing: Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: TableEncryptionV2.customerManagedKey(this.personaKey),
      // Contact rows carry a retention deadline from the app's policy. COPPA requires a written
      // retention policy with no indefinite retention, and this is where that becomes mechanical.
      timeToLiveAttribute: TTL_ATTRIBUTE,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.snapshotBucket = new Bucket(this, 'SnapshotBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.tokenSecret = new Secret(this, 'ServedTokenSecret', {
      description: 'HMAC key binding a response to the item that was actually served.',
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.rescoreDlq = new Queue(this, 'RescoreDlq', {
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
    });

    /**
     * The backfill queue.
     *
     * The visibility timeout must exceed the worker's timeout or a slow rescore gets delivered twice
     * while the first attempt is still running. Rescoring is idempotent by event id, so a double
     * delivery would not double-notify, but it would double the work.
     */
    this.rescoreQueue = new Queue(this, 'RescoreQueue', {
      visibilityTimeout: Duration.minutes(6),
      retentionPeriod: Duration.days(4),
      enforceSSL: true,
      deadLetterQueue: { queue: this.rescoreDlq, maxReceiveCount: 3 },
    });

    this.notificationDlq = new Queue(this, 'NotificationDlq', {
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
    });

    /**
     * Where a qualifying session lands.
     *
     * Nothing consumes this yet, deliberately. Choosing an email provider and writing the message a
     * family receives is a product decision, and a queue that retains for fourteen days is a safer
     * place for those events to wait than a notifier nobody has reviewed.
     */
    this.notificationQueue = new Queue(this, 'NotificationQueue', {
      visibilityTimeout: Duration.minutes(5),
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
      deadLetterQueue: { queue: this.notificationDlq, maxReceiveCount: 3 },
    });
  }
}
