import type { AgeBand } from './types';

/**
 * The contract every world honours, so the launcher can list them without knowing anything about
 * them and a new world is one folder plus one line in the registry.
 */
export interface ExperienceMeta {
  id: string;
  /** What the child is told they are doing. Never a test, a quiz, an assessment or a score. */
  title: string;
  band: AgeBand;
  /** The pull: who needs help, or what world this is. One short phrase for the launcher card. */
  interest: string;
  /** One sentence, readable by an adult deciding what to click. */
  blurb: string;
  /** Two accent colours the launcher card uses, so the grid previews each world's direction. */
  accent: [string, string];
  /** Roughly how long, from the precision step it chose. */
  minutes: string;
}

export interface ExperienceProps {
  onExit: () => void;
}
