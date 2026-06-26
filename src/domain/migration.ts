/**
 * Schema migration (PRD 8.4). Current schemaVersion is 2; the only real transform is the
 * v1 -> v2 step that seeds Settings.reminder (B1). This module defines the sequential apply
 * mechanism and the pre-migration backup point that future versions plug into.
 *
 * Migration ownership (single definition, spec stage-1 §3.6):
 *   - migrate(raw -> AppState): evolves a stored AppState's schemaVersion.
 *   - migrateSharePayload(payload, targetVersion): share payload version transform.
 */
import { AppStateSchema } from '@/types/schema';
import type { AppState, Reminder, Settings } from '@/types/schema';

export const CURRENT_SCHEMA_VERSION = 2;

/** Default daily reminder for states predating schemaVersion 2 and fresh installs (spec b1 §1). */
export const DEFAULT_REMINDER: Reminder = { enabled: false, time: '20:00' };

/** Raised when a payload's schemaVersion is newer than this app supports (PRD 7.2). */
export class IncompatibleVersionError extends Error {
  readonly version: number;
  constructor(version: number) {
    super(`Unsupported schemaVersion ${version} (current is ${CURRENT_SCHEMA_VERSION})`);
    this.name = 'IncompatibleVersionError';
    this.version = version;
  }
}

type MigrationStep = (raw: unknown) => unknown;

/**
 * migrations[n] = schemaVersion n -> n+1; the key is the "from" version. The v0 -> v1
 * step (just raising schemaVersion) closes the runtime hole where migrations[s] would
 * be undefined. A stage-5 fixture test (state-v0.json) depends on this entry.
 *
 * v1 -> v2 (B1): seed Settings.reminder with DEFAULT_REMINDER, preserving every existing
 * settings field (e.g. activeRoutineId). Additive change — no computation semantics shift.
 */
export const migrations: Record<number, MigrationStep> = {
  0: (s) => ({ ...(s as object), schemaVersion: 1 }),
  1: (s) => {
    const state = s as { settings?: Partial<Settings> };
    return {
      ...(s as object),
      schemaVersion: 2,
      settings: { ...state.settings, reminder: { ...DEFAULT_REMINDER } },
    };
  },
};

/** Read a raw payload's schemaVersion, defaulting to 0 when absent/non-numeric. */
export function schemaVersionOf(raw: unknown): number {
  const v = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  return typeof v === 'number' ? v : 0;
}

/**
 * Sequentially migrate raw to the current schema, then validate with Zod and return
 * an AppState. Rejects schemaVersion > CURRENT_SCHEMA_VERSION (IncompatibleVersionError).
 */
export function migrate(raw: unknown): AppState {
  let current: unknown = raw;
  let version = schemaVersionOf(current);
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new IncompatibleVersionError(version);
  }
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = migrations[version];
    if (step === undefined) {
      throw new Error(`Missing migration step for schemaVersion ${version}`);
    }
    current = step(current);
    // Each step must advance the version by exactly 1, so no intermediate migration is
    // ever skipped: a malformed future step (no bump, or a >1 jump) fails loudly here.
    const expected = version + 1;
    if (schemaVersionOf(current) !== expected) {
      throw new Error(`Migration step ${version} must produce schemaVersion ${expected}`);
    }
    version = expected;
  }
  return AppStateSchema.parse(current);
}

/** Share payload schemaVersion transform (PRD 7.2). v1 is an empty pass-through. */
export function migrateSharePayload(payload: unknown, _targetVersion: number): unknown {
  return payload;
}
