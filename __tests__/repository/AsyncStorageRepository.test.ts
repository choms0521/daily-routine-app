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

describe('AsyncStorageRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing is stored', async () => {
    expect(await new AsyncStorageRepository().load()).toBeNull();
  });

  it('round-trips save then load', async () => {
    const repo = new AsyncStorageRepository();
    await repo.save(baseState);
    expect(await repo.load()).toEqual(baseState);
  });

  it('migrates a v0 payload to v1 on load', async () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(v0));
    const loaded = await new AsyncStorageRepository().load();
    expect(loaded?.schemaVersion).toBe(1);
  });

  it('rejects a future schemaVersion on load', async () => {
    const future = clone(baseState) as Record<string, unknown>;
    future.schemaVersion = 99;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(future));
    await expect(new AsyncStorageRepository().load()).rejects.toThrow();
  });
});
