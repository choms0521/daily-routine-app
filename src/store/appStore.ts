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
import { activationOf, plan } from '@/domain/timeline';
import type { StorageRepository } from '@/repository/StorageRepository';
import type { AppState, Category, DateKey, DayLog } from '@/types/schema';

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
  /** Set when the last optimistic Repository.save() failed (PRD 8.3); drives a toast. */
  saveError: string | null;
  /**
   * Load persisted state on app start. The repository's load() already migrates and
   * validates (spec §5.3); an empty store (null) falls back to emptyAppState(). A load
   * failure (e.g. corrupted JSON) rejects and is left for the app root to surface.
   */
  hydrate: () => Promise<void>;
  /** Toggle one slot's check (PRD 5.1/5.2). Optimistic: UI updates, then save async. */
  toggleCheck: (date: DateKey, category: Category, slotId: string) => void;
  /** Set every slot of a category to `value` at once (PRD 5.2 batch). Optimistic. */
  toggleCategory: (date: DateKey, category: Category, value: boolean) => void;
}

const EMPTY_CHECKS: DayLog['checks'] = { aerobic: {}, anaerobic: {} };

/**
 * Immutably write `nextCategoryChecks` as a date's `category` checks. Creates the DayLog
 * if absent, recording the day's routineId/versionId from the timeline (AC-5.1.4). Returns
 * the same state reference (no-op) when no routine is active that day.
 */
function writeChecks(
  state: AppState,
  date: DateKey,
  category: Category,
  nextCategoryChecks: Record<string, boolean>,
): AppState {
  const existing = state.completionLogs[date];
  let log: DayLog;
  if (existing) {
    log = { ...existing, checks: { ...existing.checks, [category]: nextCategoryChecks } };
  } else {
    const act = activationOf(state, date);
    if (act === null) return state;
    log = {
      date,
      routineId: act.routineId,
      versionId: act.versionId,
      checks: { ...EMPTY_CHECKS, [category]: nextCategoryChecks },
    };
  }
  return { ...state, completionLogs: { ...state.completionLogs, [date]: log } };
}

export type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

/** Build a store bound to a specific repository (DI seam for tests and the app). */
export function createAppStore(repository: StorageRepository): AppStoreApi {
  return create<AppStore>((set, get) => {
    // Optimistic write: the store is updated immediately (UI reflects it now), then the
    // whole state is persisted asynchronously; only a failure is surfaced (PRD 6.3/8.3).
    const persist = (next: AppState) => {
      set({ state: next, saveError: null });
      void repository.save(next).catch((e: unknown) => {
        set({ saveError: e instanceof Error ? e.message : String(e) });
      });
    };
    return {
      state: emptyAppState(),
      hydrated: false,
      saveError: null,
      hydrate: async () => {
        const loaded = await repository.load();
        set({ state: loaded ?? emptyAppState(), hydrated: true });
      },
      toggleCheck: (date, category, slotId) => {
        const { state } = get();
        const current = state.completionLogs[date]?.checks[category][slotId] ?? false;
        const nextCat = {
          ...(state.completionLogs[date]?.checks[category] ?? {}),
          [slotId]: !current,
        };
        const next = writeChecks(state, date, category, nextCat);
        if (next === state) return; // no active routine that day -> no-op
        persist(next);
      },
      toggleCategory: (date, category, value) => {
        const { state } = get();
        const p = plan(state, date);
        if (p === null) return; // no active routine that day -> no-op
        const nextCat: Record<string, boolean> = {};
        for (const slot of p[category]) nextCat[slot.slotId] = value;
        const next = writeChecks(state, date, category, nextCat);
        if (next === state) return;
        persist(next);
      },
    };
  });
}
