import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AnswerKeyRecord } from '@platform/domain';

import { createDocumentClient, type StoreConfig } from './client.js';
import { answerKeyPk, answerKeyRevisionSk, stripKeys } from './keys.js';

/**
 * The answer keys, in their own table.
 *
 * The isolation is the point, and it is an IAM boundary rather than a code one: the serving function
 * has no policy statement naming this table, so a key cannot leak through the serve path even if the
 * serving code is wrong. The prototype's `toServed()` strips the key inside the same process that
 * holds it, which protects against a bug but not against a mistake in what a payload contains.
 *
 * Keyed by item and revision because a revised item may have a revised key, and marking a response
 * has to use the key that was correct for the revision the child was actually shown.
 */
export class AnswerKeyStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(cfg: Pick<StoreConfig, 'answerKeyTableName' | 'endpoint' | 'region'>) {
    this.doc = createDocumentClient({ endpoint: cfg.endpoint, region: cfg.region });
    this.tableName = cfg.answerKeyTableName;
  }

  async get(itemId: string, revision: number): Promise<AnswerKeyRecord | null> {
    const got = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: answerKeyPk(itemId), SK: answerKeyRevisionSk(revision) },
      }),
    );
    return got.Item ? stripKeys<AnswerKeyRecord>(got.Item) : null;
  }

  async put(k: AnswerKeyRecord): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...k, PK: answerKeyPk(k.itemId), SK: answerKeyRevisionSk(k.revision) },
      }),
    );
  }
}
