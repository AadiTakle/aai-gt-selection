import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BankSnapshot, SessionOutcome, SessionRecord } from '@gt/contracts';

/**
 * Persistence.
 *
 * Sessions are stored as an append-only JSON Lines log rather than a mutable document, for
 * the same reason published generators are immutable: a statistic is only trustworthy if the
 * record behind it cannot be quietly rewritten. Rebuilding state means replaying the log, and
 * a later line for the same session id supersedes an earlier one.
 *
 * A file is the right call at this size. Nothing here depends on it being a file, so swapping
 * in a real database later means reimplementing this one class.
 */

const DATA_DIR = process.env.GT_SCREENER_DATA ?? join(process.cwd(), 'data');
const SESSION_LOG = join(DATA_DIR, 'sessions.jsonl');
const SNAPSHOT_FILE = join(DATA_DIR, 'snapshots.json');

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export class Store {
  private sessions = new Map<string, SessionRecord>();
  private snapshots: BankSnapshot[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    if (existsSync(SESSION_LOG)) {
      const lines = readFileSync(SESSION_LOG, 'utf8').split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const record = JSON.parse(line) as SessionRecord;
          this.sessions.set(record.id, record);
        } catch {
          // A truncated final line is expected if the process died mid-write. Skip it rather
          // than refusing to start, since one bad line should not cost every earlier session.
        }
      }
    }
    if (existsSync(SNAPSHOT_FILE)) {
      try {
        this.snapshots = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8')) as BankSnapshot[];
      } catch {
        this.snapshots = [];
      }
    }
  }

  /** Append. Never rewrites an earlier line, so the history of a session stays inspectable. */
  saveSession(record: SessionRecord): void {
    ensureDir(SESSION_LOG);
    appendFileSync(SESSION_LOG, JSON.stringify(record) + '\n', 'utf8');
    this.sessions.set(record.id, record);
  }

  getSession(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  allSessions(): readonly SessionRecord[] {
    return [...this.sessions.values()];
  }

  /**
   * Attach a real outcome to a session. This is the write that turns the effectiveness
   * statistics from unavailable into computable, and until it happens they stay null.
   */
  attachOutcome(sessionId: string, outcome: SessionOutcome): SessionRecord | undefined {
    const existing = this.sessions.get(sessionId);
    if (!existing) return undefined;
    const updated: SessionRecord = { ...existing, outcome };
    this.saveSession(updated);
    return updated;
  }

  saveSnapshots(snapshots: readonly BankSnapshot[]): void {
    ensureDir(SNAPSHOT_FILE);
    this.snapshots = [...snapshots];
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(this.snapshots, null, 2), 'utf8');
  }

  allSnapshots(): readonly BankSnapshot[] {
    return this.snapshots;
  }

  get dataDir(): string {
    return DATA_DIR;
  }
}
