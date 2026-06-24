/**
 * Store foundation (Stage 2): the createAppStore DI seam and hydrate(). A fake
 * repository is injected so load()/save() are observable without AsyncStorage. The
 * mutating actions are tested on their own days.
 */
import { AppStateSchema } from '@/types/schema';
import type { AppState } from '@/types/schema';
import type { StorageRepository } from '@/repository/StorageRepository';
import { createAppStore, emptyAppState } from '@/store/appStore';
import { baseState, clone } from '../fixtures/baseState';

type FakeRepository = StorageRepository & { saved: AppState[] };

function fakeRepo(initial: AppState | null): FakeRepository {
  const saved: AppState[] = [];
  return {
    saved,
    load: async () => initial,
    save: async (s: AppState) => {
      saved.push(s);
    },
  };
}

describe('emptyAppState', () => {
  it('is a valid AppState at the current schema version', () => {
    const empty = emptyAppState();
    expect(() => AppStateSchema.parse(empty)).not.toThrow();
    expect(empty.routines).toHaveLength(0);
    expect(empty.settings.activeRoutineId).toBeNull();
  });
});

describe('createAppStore', () => {
  it('starts empty and not hydrated', () => {
    const store = createAppStore(fakeRepo(null));
    expect(store.getState().hydrated).toBe(false);
    expect(store.getState().state.routines).toHaveLength(0);
  });

  it('hydrate() loads persisted state from the repository', async () => {
    const store = createAppStore(fakeRepo(clone(baseState)));
    await store.getState().hydrate();
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().state.routines[0].id).toBe('rt_aXk92');
  });

  it('hydrate() falls back to empty state when the repository is empty', async () => {
    const store = createAppStore(fakeRepo(null));
    await store.getState().hydrate();
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().state.routines).toHaveLength(0);
  });

  it('hydrate() rejects when the repository load fails (left for the app root)', async () => {
    const failing: StorageRepository = {
      load: async () => {
        throw new Error('corrupted');
      },
      save: async () => {},
    };
    const store = createAppStore(failing);
    await expect(store.getState().hydrate()).rejects.toThrow('corrupted');
    expect(store.getState().hydrated).toBe(false);
  });

  it('isolates state between independently created stores', async () => {
    const a = createAppStore(fakeRepo(clone(baseState)));
    const b = createAppStore(fakeRepo(null));
    await a.getState().hydrate();
    await b.getState().hydrate();
    expect(a.getState().state.routines).toHaveLength(1);
    expect(b.getState().state.routines).toHaveLength(0);
  });
});
