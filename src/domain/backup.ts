/**
 * Local full-backup serialization (PRD 8.5). Pure domain: turns the whole AppState into a
 * JSON string and back, with validation. File I/O (write/share/pick/read) lives in the
 * platform layer, not here (architecture §2). Unlike share (routine template only), a backup
 * is the entire AppState — routines, timeline, completion logs, settings.
 *
 * Import reuses migrate(): an older backup is migrated forward and Zod-validated; a newer one
 * is rejected (PRD 7.2 policy, same as share import). The caller still gates the destructive
 * whole-state replace behind a user confirmation.
 */
import { IncompatibleVersionError, migrate } from '@/domain/migration';
import type { AppState } from '@/types/schema';

export type BackupParseResult =
  | { success: true; state: AppState }
  | { success: false; reason: 'invalid-json' | 'invalid-schema' | 'incompatible-version' };

/** Serialize the whole AppState to pretty JSON for a backup file (schemaVersion included). */
export function serializeBackup(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/** Backup filename: dailyroutine-backup-YYYY-MM-DD-v{schemaVersion}.json (PRD 8.5). */
export function backupFilename(state: AppState, dateKey: string): string {
  return `dailyroutine-backup-${dateKey}-v${state.schemaVersion}.json`;
}

/**
 * Parse + validate a backup JSON string into an AppState. migrate() handles version policy:
 * older payloads are migrated and Zod-validated; a newer schemaVersion throws
 * IncompatibleVersionError; structurally broken data fails Zod parse.
 */
export function parseBackup(json: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { success: false, reason: 'invalid-json' };
  }
  try {
    return { success: true, state: migrate(raw) };
  } catch (error) {
    if (error instanceof IncompatibleVersionError) {
      return { success: false, reason: 'incompatible-version' };
    }
    return { success: false, reason: 'invalid-schema' };
  }
}
