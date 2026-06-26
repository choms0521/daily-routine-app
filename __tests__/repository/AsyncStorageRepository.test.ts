/**
 * AsyncStorageRepository (Day 3): save/load round-trip, empty load, migration on load,
 * and future-version rejection. AsyncStorage is replaced with the package's in-memory mock.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageRepository } from '@/repository/AsyncStorageRepository';
import { baseState, clone } from '../fixtures/baseState';

const STORAGE_KEY = 'workout-tracker:appstate';
const BACKUP_KEY = 'workout-tracker:appstate.backup.preMigration';

// baseState is the v1 reference data; a current-version (v2) state for the "already current"
// paths. baseState already carries reminder, so only the version differs.
const currentState = { ...baseState, schemaVersion: 2 };

describe('AsyncStorageRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing is stored', async () => {
    expect(await new AsyncStorageRepository().load()).toBeNull();
  });

  it('round-trips save then load', async () => {
    const repo = new AsyncStorageRepository();
    await repo.save(currentState);
    expect(await repo.load()).toEqual(currentState);
  });

  it('migrates a v0 payload through to the current version on load', async () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(v0));
    const loaded = await new AsyncStorageRepository().load();
    expect(loaded?.schemaVersion).toBe(2);
  });

  it('rejects a future schemaVersion on load', async () => {
    const future = clone(baseState) as Record<string, unknown>;
    future.schemaVersion = 99;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(future));
    await expect(new AsyncStorageRepository().load()).rejects.toThrow();
  });

  it('rejects corrupted (non-JSON) storage with a contextual error', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not valid json');
    await expect(new AsyncStorageRepository().load()).rejects.toThrow(/not valid JSON/);
  });

  it('backs up the original raw before migrating a v0 payload', async () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    const rawV0 = JSON.stringify(v0);
    await AsyncStorage.setItem(STORAGE_KEY, rawV0);
    await new AsyncStorageRepository().load();
    // The exact pre-migration bytes are kept so a later save can be recovered from.
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBe(rawV0);
  });

  it('clears a stale pre-migration backup when loading current-version state', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, '{"old":"backup"}');
    await new AsyncStorageRepository().save(currentState);
    await new AsyncStorageRepository().load();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('still loads and migrates when the best-effort backup write fails', async () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(v0));
    // Simulate a transient storage failure on the backup write only; STORAGE_KEY is intact.
    const spy = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockImplementation((key) =>
        key === BACKUP_KEY ? Promise.reject(new Error('transient storage failure')) : Promise.resolve(),
      );
    try {
      const loaded = await new AsyncStorageRepository().load();
      // The backup failure must not hide the user's data behind an empty state.
      expect(loaded?.schemaVersion).toBe(2);
    } finally {
      spy.mockRestore();
    }
  });
});
