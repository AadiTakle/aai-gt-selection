import { Tags } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';

/**
 * Tags, applied by the stacks rather than by the entry point.
 *
 * Tagging at the app level in `bin/platform.ts` is the idiomatic placement and it is also how tags go
 * missing: any other entry point — a test, a different app, a one-off synth — constructs the stacks
 * directly and silently produces untagged resources. Putting it here means a stack cannot exist
 * untagged, and the infrastructure test can prove it.
 */
export function tagPlatform(scope: IConstruct): void {
  Tags.of(scope).add('project', 'gt-question-platform');
  Tags.of(scope).add('managed-by', 'cdk');
  Tags.of(scope).add('repo', 'aai-gt-selection');
}
