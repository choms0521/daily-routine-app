/**
 * Zustand app store (architecture §6). Holds the whole AppState and the actions that
 * mutate it. Per the architecture, persistence goes through the Repository layer (NOT
 * Zustand persist) so storage swap (AsyncStorage -> MMKV) and migration stay outside
 * the store.
 *
 * Dependency-injection seam: `createAppStore(repository, deps?)` builds a store bound to a
 * given StorageRepository and a clock/id seam. Tests inject a fake repository and
 * deterministic ids; the app-wide singleton lives in `@/store/useAppStore` (it pulls in
 * AsyncStorage), keeping this factory module free of that import so store unit tests run
 * without mocking the native module.
 *
 * Stage 3 adds the routine lifecycle actions (create/edit/setActive/hide/duplicate/delete).
 * Their transition matrix (spec stage-3 §4.1) plus the D8.8 "today protection" invariant is
 * the only non-trivial logic here: every edit/switch takes effect from tomorrow (first
 * activation only takes effect today), old versions are never mutated (append-only), and
 * the timeline is the single source of truth for date -> version resolution.
 */
import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import { addDays, weekDays } from '@/domain/date';
import { CURRENT_SCHEMA_VERSION } from '@/domain/migration';
import {
  buildRoutine,
  buildVersion,
  firstVersionId,
  nextVersionId,
} from '@/domain/routineBuild';
import { draftFromRoutine, type RoutineDraft } from '@/domain/routineDraft';
import { draftFromSharePayload, type SharePayload } from '@/domain/share';
import { activationOf, plan, versionOf } from '@/domain/timeline';
import type { StorageRepository } from '@/repository/StorageRepository';
import type { AppState, Category, DateKey, DayLog, Routine } from '@/types/schema';

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

/** Outcome of a guarded action — currently only `deleteRoutine`. UI surfaces `reason` when not ok. */
export type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Non-deterministic seam: the wall clock and routine-id minting. Injected so the store
 * stays deterministic under test (fixed timestamps, counter ids). Version ids are
 * sequential and derived purely from the routine, so they are NOT part of this seam.
 */
export interface AppStoreDeps {
  now: () => string;
  newRoutineId: () => string;
}

const defaultDeps: AppStoreDeps = {
  now: () => new Date().toISOString(),
  newRoutineId: () => `rt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
};

export interface AppStore {
  /** The single AppState tree (PRD 4.2). Read via selectors, never mutated in place. */
  state: AppState;
  /** False until the first hydrate() resolves; the app shows nothing data-bound before. */
  hydrated: boolean;
  /** Set when the last optimistic Repository.save() failed (PRD 8.3); drives a toast. */
  saveError: string | null;
  /** Set when hydrate() could not read persisted state (e.g. corrupted storage). */
  hydrateError: string | null;
  /**
   * Load persisted state on app start. The repository's load() already migrates and
   * validates (spec §5.3); an empty store (null) falls back to emptyAppState(). A load
   * failure (e.g. corrupted JSON) rejects; the app root records it in `hydrateError`
   * (it must not be swallowed) and proceeds with an empty state.
   */
  hydrate: () => Promise<void>;
  /** Toggle one slot's check (PRD 5.1/5.2). Optimistic: UI updates, then save async. */
  toggleCheck: (date: DateKey, category: Category, slotId: string) => void;
  /** Set every slot of a category to `value` at once (PRD 5.2 batch). Optimistic. */
  toggleCategory: (date: DateKey, category: Category, value: boolean) => void;
  /** Clear the viewed week's completion logs only (PRD 5.10); routines/timeline untouched. */
  resetWeek: (weekStartMonday: DateKey) => void;

  // --- Stage 3 routine lifecycle (spec stage-3 §4.1) ---
  /**
   * Create a new routine (single v_001 version) from an editor draft. Does NOT activate it
   * and does NOT touch the timeline/settings (creation is not activation). Returns the new
   * routine id.
   */
  createRoutine: (draft: RoutineDraft) => string;
  /**
   * Append a new RoutineVersion to a routine. If it is the active routine, append a
   * timeline entry effective tomorrow (today's plan is protected, D8.8); if inactive, the
   * timeline is untouched (the new version is picked up when it is later activated). Old
   * versions are never mutated.
   */
  editRoutine: (routineId: string, draft: RoutineDraft, today: DateKey) => void;
  /**
   * Switch the active routine. First activation (no plan resolves for today) takes effect
   * today; a switch (a plan already resolves) takes effect tomorrow so today is protected.
   * `settings.activeRoutineId` changes immediately either way. No-op if already active.
   */
  setActiveRoutine: (routineId: string, today: DateKey) => void;
  /** Mark a routine hidden (display-only; versions/timeline/computations untouched). */
  hideRoutine: (routineId: string) => void;
  /** Un-hide a routine (clears the display-only hidden flag). */
  unhideRoutine: (routineId: string) => void;
  /** Copy a routine's latest version into a brand-new routine. Returns the new id, or null. */
  duplicateRoutine: (routineId: string) => string | null;
  /**
   * Permanently remove a routine. Allowed only for a routine that was never activated and
   * is referenced by no completion log — i.e. no timeline entry and no log point at it.
   * Deleting an activated routine would drop past dates' plan resolution and silently change
   * past weekProgress (breaking past-immutability), so those are rejected (hide instead).
   */
  deleteRoutine: (routineId: string) => ActionResult;

  // --- Stage 4 share/import (spec stage-4 §5.3) ---
  /**
   * Import a shared routine payload as a brand-new routine. The payload is converted to a draft
   * and built like any hand-made routine, so a fresh routine id is minted and slot ids are
   * reissued positionally (PRD 4.8); the version is a normal v_001. It is NOT activated, and
   * existing routines, completion logs, the timeline, and the active pointer are untouched
   * (AC-5.5.2). Returns the new routine id.
   */
  importRoutine: (payload: SharePayload) => string;
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

/** Replace one routine in the list immutably (others keep reference identity). */
function mapRoutine(state: AppState, routineId: string, fn: (r: Routine) => Routine): AppState {
  return {
    ...state,
    routines: state.routines.map((r) => (r.id === routineId ? fn(r) : r)),
  };
}

export type AppStoreApi = UseBoundStore<StoreApi<AppStore>>;

/** Build a store bound to a specific repository and clock/id seam (DI for tests and app). */
export function createAppStore(
  repository: StorageRepository,
  deps: AppStoreDeps = defaultDeps,
): AppStoreApi {
  return create<AppStore>((set, get) => {
    // Optimistic write: the store is updated immediately (UI reflects it now), then the
    // whole state is persisted asynchronously; only a failure is surfaced (PRD 6.3/8.3).
    // Saves are fire-and-forget and can resolve out of order, so a sequence guard ensures
    // only the latest save's failure surfaces — an older save failing after a newer one
    // was dispatched must not raise a stale error for already-persisted state.
    let saveSeq = 0;
    const persist = (next: AppState) => {
      const seq = (saveSeq += 1);
      set({ state: next, saveError: null });
      void repository.save(next).catch((e: unknown) => {
        if (seq !== saveSeq) return; // superseded by a newer save
        set({ saveError: e instanceof Error ? e.message : String(e) });
      });
    };
    return {
      state: emptyAppState(),
      hydrated: false,
      saveError: null,
      hydrateError: null,
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
      resetWeek: (weekStartMonday) => {
        const { state } = get();
        const inWeek = new Set(weekDays(weekStartMonday));
        const completionLogs: AppState['completionLogs'] = {};
        let changed = false;
        for (const [date, log] of Object.entries(state.completionLogs)) {
          if (inWeek.has(date)) {
            changed = true; // drop this week's log
            continue;
          }
          completionLogs[date] = log;
        }
        if (!changed) return; // nothing logged that week -> no-op
        persist({ ...state, completionLogs });
      },

      createRoutine: (draft) => {
        const { state } = get();
        const routineId = deps.newRoutineId();
        const createdAt = deps.now();
        const routine = buildRoutine(draft, { routineId, versionId: firstVersionId(), createdAt });
        // Append the new routine only; timeline and settings are untouched (not an activation).
        persist({ ...state, routines: [...state.routines, routine] });
        return routineId;
      },

      editRoutine: (routineId, draft, today) => {
        const { state } = get();
        const target = state.routines.find((r) => r.id === routineId);
        if (target === undefined) return; // unknown routine -> no-op
        const latest = target.versions[target.versions.length - 1];
        const newVersion = buildVersion(draft, {
          versionId: nextVersionId(target),
          createdAt: deps.now(),
        });
        // A RoutineVersion captures the plan (restDays + days); the routine name is
        // routine-level metadata. Only a real plan change appends a new version (and, for the
        // active routine, a tomorrow-effective timeline entry). A rename alone just updates
        // the name — no version churn and no misleading "applies tomorrow" banner. The name
        // is always applied so a rename in the editor is never lost.
        // Compare restDays order-independently (it is a set) so a mere toggle reorder is not
        // treated as a plan change; days order is meaningful (slot order) and compared as-is.
        const sameRestDays =
          JSON.stringify([...latest.restDays].sort()) ===
          JSON.stringify([...newVersion.restDays].sort());
        const sameDays = JSON.stringify(latest.days) === JSON.stringify(newVersion.days);
        const planChanged = !(sameRestDays && sameDays);
        const name = draft.name.trim();
        // Old versions keep reference identity (append-only).
        let next = mapRoutine(state, routineId, (r) => ({
          ...r,
          name,
          versions: planChanged ? [...r.versions, newVersion] : r.versions,
        }));
        if (planChanged && state.settings.activeRoutineId === routineId) {
          next = {
            ...next,
            activationTimeline: [
              ...next.activationTimeline,
              { effectiveFrom: addDays(today, 1), routineId, versionId: newVersion.versionId },
            ],
          };
        }
        persist(next);
      },

      setActiveRoutine: (routineId, today) => {
        const { state } = get();
        if (state.settings.activeRoutineId === routineId) return; // already active -> no-op
        const target = state.routines.find((r) => r.id === routineId);
        if (target === undefined) return; // unknown routine -> no-op
        const latest = target.versions[target.versions.length - 1];
        // First activation (no plan resolves today) applies today; a switch applies tomorrow
        // so today's already-running plan is protected (D8.8). The pointer moves immediately.
        const isFirstActivation = versionOf(state, today) === null;
        const effectiveFrom = isFirstActivation ? today : addDays(today, 1);
        persist({
          ...state,
          activationTimeline: [
            ...state.activationTimeline,
            { effectiveFrom, routineId, versionId: latest.versionId },
          ],
          settings: { ...state.settings, activeRoutineId: routineId },
        });
      },

      hideRoutine: (routineId) => {
        const { state } = get();
        if (!state.routines.some((r) => r.id === routineId)) return;
        persist(mapRoutine(state, routineId, (r) => ({ ...r, hidden: true })));
      },

      unhideRoutine: (routineId) => {
        const { state } = get();
        if (!state.routines.some((r) => r.id === routineId)) return;
        persist(mapRoutine(state, routineId, (r) => ({ ...r, hidden: false })));
      },

      duplicateRoutine: (routineId) => {
        const { state } = get();
        const source = state.routines.find((r) => r.id === routineId);
        if (source === undefined) return null;
        // Copy the latest version into a fresh draft (drops slotIds and the hidden flag),
        // then build a brand-new routine. The original and the active pointer are untouched.
        const newId = deps.newRoutineId();
        const createdAt = deps.now();
        const copy = buildRoutine(draftFromRoutine(source), {
          routineId: newId,
          versionId: firstVersionId(),
          createdAt,
        });
        persist({ ...state, routines: [...state.routines, copy] });
        return newId;
      },

      deleteRoutine: (routineId) => {
        const { state } = get();
        if (!state.routines.some((r) => r.id === routineId)) {
          return { ok: false, reason: '존재하지 않는 루틴입니다.' };
        }
        if (state.settings.activeRoutineId === routineId) {
          return { ok: false, reason: '활성 루틴은 삭제할 수 없습니다. 다른 루틴으로 전환한 뒤 삭제하세요.' };
        }
        // A routine referenced by the timeline resolves some past/today date's plan; deleting
        // it would drop those dates from progress and change the past (PRD 4.1 immutability).
        if (state.activationTimeline.some((a) => a.routineId === routineId)) {
          return { ok: false, reason: '사용 기록이 있는 루틴은 삭제할 수 없습니다. 숨김만 가능합니다.' };
        }
        if (Object.values(state.completionLogs).some((log) => log.routineId === routineId)) {
          return { ok: false, reason: '완료 기록이 있는 루틴은 삭제할 수 없습니다. 숨김만 가능합니다.' };
        }
        persist({ ...state, routines: state.routines.filter((r) => r.id !== routineId) });
        return { ok: true };
      },

      importRoutine: (payload) => {
        const { state } = get();
        const routineId = deps.newRoutineId();
        const createdAt = deps.now();
        // Built exactly like a hand-made routine: fresh id, reissued slot ids, a normal v_001.
        const routine = buildRoutine(draftFromSharePayload(payload), {
          routineId,
          versionId: firstVersionId(),
          createdAt,
        });
        // Append only; existing routines, logs, timeline, and the active pointer are untouched.
        persist({ ...state, routines: [...state.routines, routine] });
        return routineId;
      },
    };
  });
}
