import { Tags } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';

/**
 * The four tags SEC-05 requires, plus one for provenance.
 *
 * ══ WHY THESE EXACT KEYS ══════════════════════════════════════════════════════════════════════════
 *
 * This file used to apply `project`, `managed-by` and `repo` — lowercase, and only one of them a required
 * key. That is not a style difference. **AWS tag keys are case-sensitive**, so `project` and `Project` are
 * two unrelated tags: a cost-attribution query filtering `Key=Project` would have found nothing, and the
 * org's compliance scan would have read every resource here as missing all four.
 *
 * SEC-05 has been enforced since 8 May 2026 and the consequence is not a warning: untagged resources are
 * tagged `MarkedForDeletion` and then deleted. The tagging guide is explicit that the sandbox is not exempt —
 * "interns tag their resources too" — so this applies to exactly the deployment this platform is heading for.
 *
 * ══ THE VALUES, AND WHY EACH ONE ═════════════════════════════════════════════════════════════════
 *
 * `Project` is the app name, which matches the CDK stack prefix, so a resource found in a console can be
 * traced back to the thing that made it without knowing this repository exists.
 *
 * `Environment` defaults to `ephemeral` because that is what the standard calls a sandbox deployment, in so
 * many words. It is overridable for the day this reaches a real environment, and the allowed set is fixed by
 * the policy rather than by preference — anything outside it is a compliance failure that looks like a typo.
 *
 * `ManagedBy` is `cdk`, which is in the policy's allowed list. CDK synthesises CloudFormation, so
 * `cloudformation` would also read true, but `cdk` is the thing an engineer has to run to change these
 * resources and that is what the tag is for.
 *
 * `Owner` has no safe default, and defaulting it to nothing is how a resource ends up unowned and deleted. So
 * it is a context value with a fallback to the engineer who wrote this, and `-c owner=` is how it changes
 * hands. If it is ever blank, the tag is omitted rather than set empty — an absent tag fails a scan loudly,
 * where `Owner=""` passes a key check and tells an incident responder nothing.
 *
 * ══ WHY THE STACKS CALL THIS RATHER THAN THE ENTRY POINT ══════════════════════════════════════════
 *
 * Tagging at the app level in `bin/platform.ts` is the idiomatic placement and it is also how tags go
 * missing: any other entry point — a test, a different app, a one-off synth — constructs the stacks directly
 * and silently produces untagged resources. Putting it here means a stack cannot exist untagged, and
 * `infra.test.ts` proves it.
 */

/** The keys SEC-05 requires on every resource. Exported so the test asserts the policy, not a copy of it. */
export const REQUIRED_TAG_KEYS = ['Project', 'Environment', 'ManagedBy', 'Owner'] as const;

/** The environments SEC-05 allows. A sandbox deployment is `ephemeral`. */
export const ALLOWED_ENVIRONMENTS = ['production', 'staging', 'dev', 'ephemeral'] as const;

export type Environment = (typeof ALLOWED_ENVIRONMENTS)[number];

export interface TagOptions {
  readonly environment?: string | undefined;
  readonly owner?: string | undefined;
}

export function tagPlatform(scope: IConstruct, options: TagOptions = {}): void {
  const environment = options.environment ?? 'ephemeral';
  if (!(ALLOWED_ENVIRONMENTS as readonly string[]).includes(environment)) {
    // Thrown at synth rather than discovered by a compliance scan a week later.
    throw new Error(
      `Environment tag must be one of ${ALLOWED_ENVIRONMENTS.join(', ')}; got "${environment}"`,
    );
  }

  const owner = (options.owner ?? 'aadi.takle@alphaaiengineering.com').trim();
  if (owner.length === 0) {
    throw new Error('Owner tag cannot be empty: an unowned resource is a resource nobody can be asked about');
  }

  Tags.of(scope).add('Project', 'gt-question-platform');
  Tags.of(scope).add('Environment', environment);
  Tags.of(scope).add('ManagedBy', 'cdk');
  Tags.of(scope).add('Owner', owner);

  // Not required by the policy, and kept because it is the one thing the four cannot tell you: which
  // repository to open.
  Tags.of(scope).add('repo', 'aai-gt-selection');
}
