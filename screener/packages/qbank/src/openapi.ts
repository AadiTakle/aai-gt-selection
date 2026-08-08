/**
 * The OpenAPI document for the adaptive engine.
 *
 * Exists for adopters who are not writing TypeScript. The TypeScript contract in `wire.ts` is the enforced
 * half — the handlers are annotated with it and stop compiling if a response changes — and this is the
 * publishable half.
 *
 * Built in code rather than hand-kept as YAML so it can be regenerated and compared, which is what stops the
 * committed copy rotting. `openapi.test.ts` asserts the file under `docs/api/` matches this output, so the
 * two cannot part company silently. What that does **not** guarantee is that these schemas match the
 * interfaces in `wire.ts`: they are maintained beside them, not derived from them. Adding a field to
 * `QbankState` and forgetting it here is still possible, and a TS-to-JSON-Schema step is the fix if this spec
 * ever becomes load-bearing for someone outside this repo.
 */

const ERROR_RESPONSE = {
  description: 'Every non-2xx in this family. The body carries a message and nothing else.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
} as const;

/** Reused by three responses, so declared once. */
const stateRef = { $ref: '#/components/schemas/SessionState' } as const;

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'GT adaptive engine — bank sessions',
      version: '1.0.0',
      description: [
        'Two questions over HTTP: what should I ask next, and how did they do.',
        '',
        'Covers the `/api/bank/*` family only. The generator screener, the item library, snapshots and both',
        'practice modes live in the same process and are separate products.',
        '',
        'Three things a caller should know before integrating:',
        '',
        '1. **The answer key never crosses to the client.** A served item has had `answer`, `scoring` and',
        '   `provenance` removed, so marking is a round trip. This is deliberate and is asserted by the',
        '   project smoke suite.',
        '2. **`correct: null` is not wrong.** It means the host could not interpret the response. Such an',
        '   attempt is counted and excluded from the ability estimate rather than held against the candidate.',
        '3. **`stopReason: "confident-below"` alongside `decision: "recommend"` is valid.** The stop reason',
        '   describes the composite posterior; a single strong domain can still carry a recommendation. See',
        '   `passRoute`.',
      ].join('\n'),
    },
    servers: [{ url: 'http://localhost:5181', description: 'Local Express, npm run api' }],
    paths: {
      '/api/bank': {
        get: {
          summary: 'What the bank holds, and the precision steps a session can be configured with',
          operationId: 'getBankCatalogue',
          responses: {
            200: {
              description: 'Catalogue',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/BankCatalogue' } } },
            },
          },
        },
      },
      '/api/bank/sessions': {
        post: {
          summary: 'Start a session',
          operationId: 'createBankSession',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSessionRequest' } } },
          },
          responses: {
            200: {
              description: 'Session created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSessionResponse' } } },
            },
            400: {
              ...ERROR_RESPONSE,
              description:
                'An unknown type code, or no scorable items match the requested age band. Unknown codes are ' +
                'refused rather than ignored, because a typo would otherwise narrow the pool silently.',
            },
          },
        },
      },
      '/api/bank/sessions/{sessionId}/next': {
        get: {
          summary: 'The next item, or the news that the session is over',
          operationId: 'getNextItem',
          parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Discriminated on `done`. When false, the served fields sit at the top level.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/NextResponse' } } },
            },
            404: { ...ERROR_RESPONSE, description: 'Unknown session. Sessions do not survive a server restart.' },
          },
        },
      },
      '/api/bank/sessions/{sessionId}/answer': {
        post: {
          summary: 'Submit a response and get the updated state',
          operationId: 'answerItem',
          parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AnswerRequest' } } },
          },
          responses: {
            200: {
              description: 'Marked',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AnswerResponse' } } },
            },
            400: { ...ERROR_RESPONSE, description: 'No pending item, or the session has already stopped.' },
            404: { ...ERROR_RESPONSE, description: 'Unknown session.' },
          },
        },
      },
      '/api/bank/sessions/{sessionId}/debug': {
        get: {
          summary: 'The operator view of a session',
          operationId: 'getSessionDebug',
          description: 'Nothing here is hidden from whoever is running the session. Not intended for a candidate.',
          parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Debug payload',
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
            },
            404: { ...ERROR_RESPONSE, description: 'Unknown session.' },
          },
        },
      },
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: { error: { type: 'string' } },
        },
        AgeBand: { type: 'string', enum: ['K-1', '2-3', '4-5', '6-8'] },
        Domain: { type: 'string', enum: ['quantitative', 'verbal', 'spatial', 'fluid'] },
        PrecisionStep: {
          type: 'object',
          description:
            'Test length expressed as the confidence demanded, because length is an outcome of that rather ' +
            'than an independent input. Note `confidenceBelow` is always the higher bar: it takes more ' +
            'evidence to rule a candidate out than to let one in.',
          required: ['label', 'confidenceAbove', 'confidenceBelow', 'minItems', 'maxItems', 'note'],
          properties: {
            label: { type: 'string' },
            confidenceAbove: { type: 'number' },
            confidenceBelow: { type: 'number' },
            minItems: { type: 'integer' },
            maxItems: { type: 'integer' },
            note: { type: 'string', description: 'What the caller is trading. Worth surfacing to an operator.' },
          },
        },
        BankTypeSummary: {
          type: 'object',
          required: ['typeCode', 'domain', 'scorable', 'total', 'excluded', 'difficultyRange', 'ageBands'],
          properties: {
            typeCode: { type: 'string' },
            domain: { type: 'string' },
            scorable: { type: 'integer', description: 'Items markable host-side. What a session can actually serve.' },
            total: { type: 'integer' },
            excluded: {
              type: 'object',
              additionalProperties: { type: 'integer' },
              description: 'Why the rest were held back, keyed by reason, so total minus scorable is accounted for.',
            },
            difficultyRange: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            ageBands: { type: 'array', items: { type: 'string' } },
          },
        },
        BankCatalogue: {
          type: 'object',
          required: ['types', 'typeCount', 'scorable', 'total', 'precisionSteps', 'difficultyMapping'],
          properties: {
            types: { type: 'array', items: { $ref: '#/components/schemas/BankTypeSummary' } },
            typeCount: { type: 'integer' },
            scorable: { type: 'integer' },
            total: { type: 'integer' },
            precisionSteps: { type: 'array', items: { $ref: '#/components/schemas/PrecisionStep' } },
            difficultyMapping: {
              type: 'object',
              description: 'How the bank 1-20 scale becomes logits. A rescaling, not a calibration.',
              required: ['midpoint', 'divisor', 'note'],
              properties: { midpoint: { type: 'number' }, divisor: { type: 'number' }, note: { type: 'string' } },
            },
          },
        },
        CreateSessionRequest: {
          type: 'object',
          description: 'Every field optional. Send `{}` for the prototype defaults.',
          properties: {
            precisionIndex: { type: 'integer', minimum: 0, maximum: 4, default: 2 },
            ageBand: { $ref: '#/components/schemas/AgeBand' },
            abilityThreshold: { type: 'number', default: 1.0 },
            perDomainMinimum: { type: 'integer', default: 1 },
            recommendProbability: { type: 'number', default: 0.35 },
            types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Restrict the pool. An unknown code is a 400, never a silent narrowing.',
            },
            seed: { type: 'integer', description: 'Supply for a reproducible session.' },
          },
        },
        DomainBand: {
          type: 'object',
          description:
            'One domain, over its own items only. **Never render `mean` without `interval` and the counts.** A ' +
            'session gives a domain two to four items, so the interval is usually 2-3 logits — close to the ' +
            'prior — and a bare mean off two items reads as a finding when it is not one. A domain that scored ' +
            'nothing is absent rather than reported at its prior.',
          required: ['mean', 'interval', 'itemsServed', 'itemsScored'],
          properties: {
            mean: { type: 'number' },
            interval: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            itemsServed: { type: 'integer' },
            itemsScored: { type: 'integer', description: 'The band rests on these, not on itemsServed.' },
          },
        },
        PassRoute: {
          type: 'object',
          description:
            'What produced a recommendation. **A domain-triggered pass is not evidence of a domain strength and ' +
            'must not be reported as one** — the band that carried it rests on a handful of items. Every domain ' +
            'that cleared is listed, in a fixed order, so nothing here invites reading a winner.',
          required: ['via'],
          properties: {
            via: { type: 'string', enum: ['composite', 'domain'] },
            domains: { type: 'array', items: { $ref: '#/components/schemas/Domain' } },
          },
        },
        SessionState: {
          type: 'object',
          required: [
            'stopped',
            'stopReason',
            'pAbove',
            'decision',
            'itemsServed',
            'unscorable',
            'estimate',
            'interval',
            'perDomain',
            'domains',
            'passRoute',
          ],
          properties: {
            stopped: { type: 'boolean' },
            stopReason: {
              type: ['string', 'null'],
              enum: ['confident-above', 'confident-below', 'item-cap', 'bank-exhausted', 'abandoned', null],
              description: 'Describes the **composite** posterior. May read as contradicting `decision`; see passRoute.',
            },
            pAbove: { type: 'number', description: 'P(ability > abilityThreshold) on the composite posterior.' },
            decision: { type: ['string', 'null'], enum: ['recommend', 'no-recommendation', null] },
            itemsServed: { type: 'integer' },
            unscorable: { type: 'integer', description: 'Attempts nobody could mark. Excluded from the estimate.' },
            estimate: { type: 'number', description: 'Composite posterior mean, in logits.' },
            interval: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            perDomain: { type: 'object', additionalProperties: { type: 'integer' } },
            domains: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/DomainBand' },
              description: 'Keyed by domain. A domain that scored nothing is absent.',
            },
            passRoute: {
              oneOf: [{ $ref: '#/components/schemas/PassRoute' }, { type: 'null' }],
              description: 'Null unless decision is recommend.',
            },
          },
        },
        CreateSessionResponse: {
          type: 'object',
          required: ['sessionId', 'poolSize', 'config', 'state'],
          properties: {
            sessionId: { type: 'string' },
            poolSize: { type: 'integer' },
            config: { type: 'object', additionalProperties: true, description: 'What the server resolved the request into.' },
            state: stateRef,
          },
        },
        ServedItem: {
          type: 'object',
          description:
            'An item with `answer`, `scoring` and `provenance` removed. `content` is the headless payload: what ' +
            'is asked and how it is answered, with nothing about how it looks.',
          required: ['itemId', 'typeCode', 'difficulty', 'content'],
          properties: {
            itemId: { type: 'string' },
            typeCode: { type: 'string' },
            difficulty: { type: 'number', description: 'On the bank 1-20 scale. See difficultyMapping.' },
            content: { type: 'object', additionalProperties: true },
          },
        },
        NextResponse: {
          oneOf: [
            {
              type: 'object',
              title: 'An item was served',
              required: ['done', 'served', 'typeCode', 'domain', 'difficulty', 'informationAtThreshold', 'selectionReason', 'state'],
              properties: {
                done: { const: false },
                served: { $ref: '#/components/schemas/ServedItem' },
                typeCode: { type: 'string' },
                domain: { $ref: '#/components/schemas/Domain' },
                difficulty: { type: 'number' },
                informationAtThreshold: { type: 'number' },
                selectionReason: { type: 'string', description: 'Why this item. Kept for the audit record.' },
                state: stateRef,
              },
            },
            {
              type: 'object',
              title: 'The session is over',
              required: ['done', 'state'],
              properties: { done: { const: true }, state: stateRef },
            },
          ],
        },
        AnswerRequest: {
          type: 'object',
          required: ['response'],
          properties: {
            response: {
              description:
                'Whatever the item UI produced. Deliberately unconstrained: the servable types were written ' +
                'independently and do not agree on where they put the answer.',
            },
            latencyMs: { type: 'integer', description: 'Shown-to-submitted. Stored now, used by rapid-guess detection later.' },
          },
        },
        AnswerResponse: {
          type: 'object',
          required: ['state', 'correct', 'difficulty'],
          properties: {
            state: stateRef,
            correct: {
              type: ['boolean', 'null'],
              description:
                '**Null means unmarkable, not wrong.** Think twice before showing this to a child: every item ' +
                'in the catalogue declines to report correctness on purpose.',
            },
            difficulty: { type: ['number', 'null'] },
          },
        },
      },
    },
  };
}

/** Where the committed document lives, relative to the repository root. One definition, two consumers. */
export const OPENAPI_PATH = 'docs/api/bank-engine.openapi.json';
