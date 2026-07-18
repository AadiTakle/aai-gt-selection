import {
  applicationVersionSchema,
  assessmentVersionSchema,
  snapshotFixtureReferenceSchema,
  statusProjectionSchema,
} from '@gt-selection/contracts';
import { describe, expect, it } from 'vitest';

import {
  fictionalFixtures,
  syntheticArtifactFixture,
  syntheticNarrativeFixture,
  syntheticTrackAAssessment,
  syntheticTrackBAssessment,
  syntheticTrackBApplication,
  trackBSnapshotRequiredStatus,
} from './index';

describe('fictional fixture boundary', () => {
  it('keeps every fixture visibly synthetic', () => {
    expect(fictionalFixtures.every(({ syntheticOnly }) => syntheticOnly)).toBe(true);
  });

  it('validates the Track A and Track B boundary examples', () => {
    expect(applicationVersionSchema.parse(syntheticTrackBApplication)).toBeDefined();
    expect(assessmentVersionSchema.parse(syntheticTrackAAssessment).compositeScore).toBe(95);
    expect(assessmentVersionSchema.parse(syntheticTrackBAssessment).compositeScore).toBe(89.5);
  });

  it('validates both fixed Snapshot routes', () => {
    expect(snapshotFixtureReferenceSchema.parse(syntheticArtifactFixture).route).toBe('artifact');
    expect(snapshotFixtureReferenceSchema.parse(syntheticNarrativeFixture).route).toBe('narrative');
  });

  it('rejects a fixture that is not marked synthetic', () => {
    const result = snapshotFixtureReferenceSchema.safeParse({
      ...syntheticArtifactFixture,
      syntheticOnly: false,
    });

    expect(result.success).toBe(false);
  });

  it('keeps invitation separate from eligibility or admission', () => {
    const status = statusProjectionSchema.parse(trackBSnapshotRequiredStatus);
    expect(status.workflowStatus).toBe('track_b_snapshot_required');
    expect(JSON.stringify(status)).not.toMatch(/admitted|offered|waitlisted|funded/i);
  });
});
