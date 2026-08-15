import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { createDocumentClient, isConditionalCheckFailed, type StoreConfig } from './client.js';
import {
  PERSONA_CONTACT_SK,
  PERSONA_META_SK,
  personaPk,
  stripKeys,
} from './keys.js';

/**
 * The only table that holds personal information, spec sections 6.4 and 12.
 *
 * Two rows per persona and a hard line between them. `META` is pseudonymous and lives as long as the
 * measurement trace it belongs to. `CONTACT` holds the guardian email and nothing else, carries a
 * TTL from the app's retention policy, and can be deleted on request without touching anything else —
 * because the trace references only `personaId`, an erasure leaves the measurement whole.
 *
 * This phase collects a guardian email and nothing gathered from a child. `robloxUsername` and
 * `childFirstName` are reserved in the design and deliberately not written here; enabling them is
 * blocked on a COPPA consent design that does not exist yet.
 */

export interface PersonaMetaRecord {
  readonly personaId: string;
  readonly createdAt: string;
  readonly locale: string | null;
  readonly firstSeenAppId: string;
}

export interface PersonaContactRecord {
  readonly personaId: string;
  readonly guardianEmail: string;
  readonly collectedFrom: 'guardian';
  readonly consentRef: string | null;
  readonly collectedAt: string;
}

export class PersonaStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(cfg: Pick<StoreConfig, 'personaTableName' | 'endpoint' | 'region'>) {
    this.doc = createDocumentClient({ endpoint: cfg.endpoint, region: cfg.region });
    this.tableName = cfg.personaTableName;
  }

  /**
   * Register a persona, once.
   *
   * A repeat call is a no-op rather than an error or an overwrite: `firstSeenAppId` and `createdAt`
   * mean what they say, and a retried session start must not rewrite the app a child was first seen
   * on to whichever app happened to retry.
   */
  async create(personaId: string, locale: string | null, firstSeenAppId: string): Promise<void> {
    const meta: PersonaMetaRecord = {
      personaId,
      createdAt: new Date().toISOString(),
      locale,
      firstSeenAppId,
    };
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: { ...meta, PK: personaPk(personaId), SK: PERSONA_META_SK },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
    } catch (err) {
      if (!isConditionalCheckFailed(err)) throw err;
    }
  }

  /**
   * Store the guardian email under a retention deadline.
   *
   * `ttlEpoch` is unix seconds and is computed by the caller from the app's `retentionDays`, because
   * retention is a per-app policy and this store should not be the place that decides it. DynamoDB
   * deletes the row on its own schedule after that instant, so the deadline is a floor on deletion
   * rather than a guarantee of the exact moment.
   */
  async putContact(
    personaId: string,
    guardianEmail: string,
    consentRef: string | null,
    ttlEpoch: number,
  ): Promise<void> {
    const contact: PersonaContactRecord = {
      personaId,
      guardianEmail,
      collectedFrom: 'guardian',
      consentRef,
      collectedAt: new Date().toISOString(),
    };
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          ...contact,
          PK: personaPk(personaId),
          SK: PERSONA_CONTACT_SK,
          ttl: ttlEpoch,
        },
      }),
    );
  }

  /**
   * Read back only the email.
   *
   * Narrowed on purpose. Every caller of this needs an address to send to, and returning the whole
   * row would spread `collectedAt` and `consentRef` into code that has no business holding them.
   */
  async getContact(personaId: string): Promise<{ guardianEmail: string } | null> {
    const got = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: personaPk(personaId), SK: PERSONA_CONTACT_SK },
      }),
    );
    if (!got.Item) return null;
    const contact = stripKeys<PersonaContactRecord>(got.Item);
    return { guardianEmail: contact.guardianEmail };
  }

  /** Erasure. Deletes the contact row and nothing else, leaving the pseudonymous `META` intact. */
  async deleteContact(personaId: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: personaPk(personaId), SK: PERSONA_CONTACT_SK },
      }),
    );
  }
}
