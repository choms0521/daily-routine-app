/**
 * Zustand app store (architecture §6). Holds the whole AppState and the actions that
 * mutate it. Per the architecture, persistence goes through the Repository layer (NOT
 * Zustand persist) so storage swap (AsyncStorage -> MMKV) and migration stay outside
 * the store.
 *
 * Dependency-injection seam: `createAppStore(repository)` builds a store bound to a
 * given StorageRepository. Tests inject a fake repository. The app-wide singleton lives
 * in `@/store/useAppStore` (it pulls in AsyncStorage); keeping this factory module free
 * of that import lets store unit tests run without mocking the native module. The
 * mutating actions (toggleCheck/toggleCategory/resetWeek) are added on their Stage 2
 * days; this module currently provides the shell + `hydrate()`.
 */
import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import { CURRENT_SCHEMA_VERSION } from '@/domain/migration';
import type { StorageRepository } from '@/repository/StorageRepository';
import type { AppState } from '@/types/schema';

/** Fresh-install state: a valid, empty AppState at the current schema version. */
export function emptyAppState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    routines: [],
    activationTimeline: [],
    completionLogs: {},
    settings: { activeRoutineId: null },
  };
}

export interface AppStore {
  /** The single AppState tree (PRD 4.2). Read via selectors, never mutated in place. */
  state: AppState;
  /** False until the first hydrate() resolves; the app shows nothing data-bound before. */
  hydrated: boolean;
  /**
   * Load persisted state on app start. The repository's load() already migrates and
   * validates (spec §5.3); an empty store (null) falls back to emptyAppState(). A load
   * failure (e.g. corrupted JSON) rejects and is left for the app root to surface.
   */
  hydrate: () => Promise<void>;
}

export type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

/** Build a store bound to a specific repository (DI seam for tests and the app). */
export function createAppStore(repository: StorageRepository): AppStoreApi {
  return create<AppStore>((set) => ({
    state: emptyAppState(),
    hydrated: false,
    hydrate: async () => {
      const loaded = await repository.load();
      set({ state: loaded ?? emptyAppState(), hydrated: true });
    },
  }));
}
