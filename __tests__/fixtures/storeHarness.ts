/**
 * Store test harness: a store seeded with a given AppState (already hydrated) over a fake
 * repository, using deterministic ids/timestamps so routine-lifecycle assertions are stable.
 */
import { createAppStore, type AppStoreApi, type AppStoreDeps } from '@/store/appStore';
import type { StorageRepository } from '@/repository/StorageRepository';
import type { AppState, Routine } from '@/types/schema';
import { baseState, clone } from './baseState';

/** Deterministic deps: fixed timestamp and a counter-based routine id (rt_new1, rt_new2…). */
export function counterDeps(): AppStoreDeps {
  let n = 0;
  return { now: () => '2026-06-24T00:00:00Z', newRoutineId: () => `rt_new${(n += 1)}` };
}

export function makeStore(initial: AppState, deps: AppStoreDeps = counterDeps()) {
  const saved: AppState[] = [];
  const repo: StorageRepository = {
    load: async () => clone(initial),
    save: async (s) => void saved.push(s),
  };
  const store = createAppStore(repo, deps);
  store.setState({ state: clone(initial), hydrated: true });
  return { store, saved };
}

/** A second, inactive routine (rt_B) for switch/edit-inactive scenarios. */
export const routineB: Routine = {
  id: 'rt_B',
  name: '가벼운 산책',
  createdAt: '2026-06-10T08:00:00Z',
  versions: [
    {
      versionId: 'v_001',
      createdAt: '2026-06-10T08:00:00Z',
      restDays: ['sat', 'sun'],
      days: {
        mon: { aerobic: [{ slotId: 'a1', name: '산책', sets: '20분' }], anaerobic: [] },
        tue: { aerobic: [{ slotId: 'a1', name: '산책', sets: '20분' }], anaerobic: [] },
        wed: { aerobic: [{ slotId: 'a1', name: '산책', sets: '20분' }], anaerobic: [] },
        thu: { aerobic: [{ slotId: 'a1', name: '산책', sets: '20분' }], anaerobic: [] },
        fri: { aerobic: [{ slotId: 'a1', name: '산책', sets: '20분' }], anaerobic: [] },
        sat: { aerobic: [], anaerobic: [] },
        sun: { aerobic: [], anaerobic: [] },
      },
    },
  ],
};

/** baseState (active rt_aXk92) plus an inactive rt_B in the library. */
export function twoRoutineState(): AppState {
  const s = clone(baseState);
  return { ...s, routines: [...s.routines, clone(routineB)] };
}
