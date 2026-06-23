/**
 * AsyncStorage-backed StorageRepository (PRD 8.1). Serializes the whole AppState to a
 * single JSON key. Migration + validation run inside load() at hydrate time (spec §5.3).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupBeforeMigrate, CURRENT_SCHEMA_VERSION, migrate, schemaVersionOf } from '@/domain/migration';
import type { AppState } from '@/types/schema';
import type { StorageRepository } from '@/repository/StorageRepository';

const STORAGE_KEY = 'workout-tracker:appstate';

export class AsyncStorageRepository implements StorageRepository {
  async load(): Promise<AppState | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    // Back up the original before migrating an older payload, then migrate + validate.
    if (schemaVersionOf(parsed) < CURRENT_SCHEMA_VERSION) {
      await backupBeforeMigrate(parsed);
    }
    return migrate(parsed);
  }

  async save(state: AppState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
