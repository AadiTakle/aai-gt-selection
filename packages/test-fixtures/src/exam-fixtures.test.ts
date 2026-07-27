import {
  examItemSchema,
  examPolicySchema,
  itemResponseSchema,
  participantSchema,
  screeningOutcomeSchema,
  servedItemSchema,
  sessionSchema,
  startSessionResponseSchema,
  submitResponseResponseSchema,
  telemetryEventSchema,
} from '@gt-selection/contracts';
import { describe, expect, it } from 'vitest';

import {
  examFixtures,
  startSessionResponseFixture,
  submitResponseCompleteFixture,
  syntheticClassicalItem,
  syntheticExamPolicyAdaptive,
  syntheticExamPolicyLinear,
  syntheticExamSession,
  syntheticIrtItem,
  syntheticItemResponse,
  syntheticParticipant,
  syntheticScreeningOutcome,
  syntheticServedItem,
  syntheticTelemetryEvents,
} from './index';

describe('format-agnostic exam fixtures', () => {
  it('validates the linear and adaptive policy fixtures against the same schema', () => {
    expect(examPolicySchema.parse(syntheticExamPolicyLinear)).toEqual(syntheticExamPolicyLinear);
    expect(examPolicySchema.parse(syntheticExamPolicyAdaptive)).toEqual(
      syntheticExamPolicyAdaptive,
    );
    expect(syntheticExamPolicyLinear.deliveryStructure).toBe('linear');
    expect(syntheticExamPolicyLinear.structureConfig).toEqual({});
    expect(syntheticExamPolicyAdaptive.deliveryStructure).toBe('adaptive');
  });

  it('validates IRT and non-IRT item fixtures (IRT is optional)', () => {
    expect(examItemSchema.parse(syntheticIrtItem)).toEqual(syntheticIrtItem);
    expect(examItemSchema.parse(syntheticClassicalItem)).toEqual(syntheticClassicalItem);
    expect(syntheticClassicalItem.irt).toBeNull();
  });

  it('validates the participant, served item, response, and telemetry fixtures', () => {
    expect(participantSchema.parse(syntheticParticipant)).toEqual(syntheticParticipant);
    expect(servedItemSchema.parse(syntheticServedItem)).toEqual(syntheticServedItem);
    expect(Object.keys(syntheticServedItem)).not.toContain('irt');
    expect(itemResponseSchema.parse(syntheticItemResponse)).toEqual(syntheticItemResponse);
    for (const event of syntheticTelemetryEvents) {
      expect(telemetryEventSchema.parse(event)).toEqual(event);
    }
  });

  it('validates the linear session with structure-neutral progress and no baked ability state', () => {
    expect(sessionSchema.parse(syntheticExamSession)).toEqual(syntheticExamSession);
    expect(syntheticExamSession.structureState).toBeNull();
    expect(JSON.stringify(syntheticExamSession)).not.toMatch(/theta|abilities|"se"/i);
  });

  it('validates the screening outcome with a claim-safe, screening-only decision', () => {
    expect(screeningOutcomeSchema.parse(syntheticScreeningOutcome)).toEqual(
      syntheticScreeningOutcome,
    );
    expect(syntheticScreeningOutcome.decision).toBe('advance');
    expect(JSON.stringify(syntheticScreeningOutcome)).not.toMatch(
      /admit|offer|waitlist|funded|admission/i,
    );
    expect(syntheticScreeningOutcome.claimBoundary.length).toBeGreaterThan(0);
  });

  it('validates the RPC envelope fixtures end-to-end', () => {
    expect(startSessionResponseSchema.parse(startSessionResponseFixture)).toEqual(
      startSessionResponseFixture,
    );
    expect(submitResponseResponseSchema.parse(submitResponseCompleteFixture)).toEqual(
      submitResponseCompleteFixture,
    );
    expect(submitResponseCompleteFixture.data.nextItem).toBeNull();
    expect(submitResponseCompleteFixture.data.session.status).toBe('completed');
  });

  it('keeps every exam fixture visibly synthetic and unvalidated where applicable', () => {
    expect(examFixtures.every(({ syntheticOnly }) => syntheticOnly === true)).toBe(true);
    expect(syntheticExamPolicyLinear.validated).toBe(false);
    expect(syntheticExamPolicyAdaptive.validated).toBe(false);
    expect(syntheticScreeningOutcome.validated).toBe(false);
  });
});
