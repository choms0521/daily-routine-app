/**
 * AsyncStorage-backed StorageRepository (PRD 8.1). Serializes the whole AppState to a
 * single JSON key. Migration + validation run inside load() at hydrate time (spec §5.3).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_SCHEMA_VERSION, migrate, schemaVersionOf } from '@/domain/migration';
import type { AppState } from '@/types/schema';
import type { StorageRepository } from '@/repository/StorageRepository';

const STORAGE_KEY = 'workout-tracker:appstate';
// Pre-migration backup of the original raw, so an upgrade has a recovery point (PRD 8.4).
const BACKUP_KEY = 'workout-tracker:appstate.backup.preMigration';

export class AsyncStorageRepository implements StorageRepository {
  async load(): Promise<AppState | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      // A corrupted or manually edited value would otherwise reject load() with a bare
      // SyntaxError; wrap it with the storage key so the hydrate failure is diagnosable.
      throw new Error(`Stored app state under "${STORAGE_KEY}" is not valid JSON`, {
        cause: error,
      });
    }
    // Pre-migration safety net (PRD 8.4 / 10.2): before upgrading an older payload, keep the
    // original raw under a backup key so a later save can't overwrite it with no recovery
    // point. Once we're already on the current version, clear any stale backup from a past
    // upgrade (load() never writes the migrated result, so migrate() throwing leaves the
    // original STORAGE_KEY value intact — no rollback machinery needed).
    //
    // Best-effort: a transient storage failure writing/clearing the backup must not reject
    // load() and hide the user's still-intact STORAGE_KEY data behind an empty hydrate state.
    try {
      if (schemaVersionOf(parsed) < CURRENT_SCHEMA_VERSION) {
        await AsyncStorage.setItem(BACKUP_KEY, raw);
      } else {
        await AsyncStorage.removeItem(BACKUP_KEY);
      }
    } catch {
      // The backup is a safety net, not on the critical load/migration path — proceed.
    }
    return migrate(parsed);
  }

  async save(state: AppState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
