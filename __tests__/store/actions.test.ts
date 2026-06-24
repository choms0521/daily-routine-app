/**
 * Store actions (Day 3): toggleCheck / toggleCategory. Optimistic + immutable, persisting
 * through an injected fake repository. Verified against the canonical PRD 4.4 fixture.
 */
import { createAppStore } from '@/store/appStore';
import type { StorageRepository } from '@/repository/StorageRepository';
import type { AppState } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';

type FakeRepository = StorageRepository & { saved: AppState[] };

function fakeRepo(initial: AppState | null): FakeRepository {
  const saved: AppState[] = [];
  return { saved, load: async () => initial, save: async (s) => void saved.push(s) };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const MON = '2026-06-22';
const TUE = '2026-06-23';

describe('toggleCheck', () => {
  it('toggles a slot and persists', async () => {
    const repo = fakeRepo(clone(baseState));
    const store = createAppStore(repo);
    await store.getState().hydrate();
    store.getState().toggleCheck(MON, 'anaerobic', 'x3'); // was false
    expect(store.getState().state.completionLogs[MON].checks.anaerobic.x3).toBe(true);
    await flush();
    expect(repo.saved).toHaveLength(1);
  });

  it('creates a DayLog with that day routineId/versionId when none exists (AC-5.1.4)', async () => {
    const store = createAppStore(fakeRepo(clone(baseState)));
    await store.getState().hydrate();
    store.getState().toggleCheck(TUE, 'aerobic', 'a1'); // no log on TUE yet
    const log = store.getState().state.completionLogs[TUE];
    expect(log.checks.aerobic.a1).toBe(true);
    expect(log.versionId).toBe('v_001');
    expect(log.routineId).toBe('rt_aXk92');
  });

  it('is a no-op before any routine is active', async () => {
    const repo = fakeRepo(clone(baseState));
    const store = createAppStore(repo);
    await store.getState().hydrate();
    store.getState().toggleCheck('2026-05-01', 'aerobic', 'a1'); // before effectiveFrom
    expect(store.getState().state.completionLogs['2026-05-01']).toBeUndefined();
    await flush();
    expect(repo.saved).toHaveLength(0);
  });
});

describe('toggleCategory', () => {
  it('sets every slot of a category to true (AC-5.2.3)', async () => {
    const store = createAppStore(fakeRepo(clone(baseState)));
    await store.getState().hydrate();
    store.getState().toggleCategory(MON, 'anaerobic', true);
    expect(store.getState().state.completionLogs[MON].checks.anaerobic).toEqual({
      x1: true,
      x2: true,
      x3: true,
    });
  });

  it('clears every slot of a category to false', async () => {
    const store = createAppStore(fakeRepo(clone(baseState)));
    await store.getState().hydrate();
    store.getState().toggleCategory(MON, 'anaerobic', false);
    expect(store.getState().state.completionLogs[MON].checks.anaerobic).toEqual({
      x1: false,
      x2: false,
      x3: false,
    });
  });

  it('does not mutate routines / timeline (immutable, AC-5.10.1 spirit)', async () => {
    const store = createAppStore(fakeRepo(clone(baseState)));
    await store.getState().hydrate();
    const before = store.getState().state;
    store.getState().toggleCategory(MON, 'aerobic', true);
    const after = store.getState().state;
    expect(after).not.toBe(before);
    expect(after.routines).toBe(before.routines);
    expect(after.activationTimeline).toBe(before.activationTimeline);
  });
});

describe('optimistic save failure', () => {
  it('keeps the optimistic state and records saveError on reject', async () => {
    const failing: StorageRepository = {
      load: async () => clone(baseState),
      save: async () => {
        throw new Error('disk full');
      },
    };
    const store = createAppStore(failing);
    await store.getState().hydrate();
    store.getState().toggleCheck(MON, 'anaerobic', 'x3');
    expect(store.getState().state.completionLogs[MON].checks.anaerobic.x3).toBe(true);
    await flush();
    expect(store.getState().saveError).toMatch(/disk full/);
  });

  it('suppresses a stale error from an older save superseded by a newer one', async () => {
    let rejectFirst: (e: Error) => void = () => {};
    let call = 0;
    const repo: StorageRepository = {
      load: async () => clone(baseState),
      save: () => {
        call += 1;
        if (call === 1) return new Promise<void>((_, reject) => (rejectFirst = reject)); // hangs
        return Promise.resolve(); // newer save succeeds
      },
    };
    const store = createAppStore(repo);
    await store.getState().hydrate();
    store.getState().toggleCheck(MON, 'anaerobic', 'x3'); // save #1 (will fail later)
    store.getState().toggleCheck(MON, 'anaerobic', 'x2'); // save #2 (succeeds)
    await flush();
    rejectFirst(new Error('stale disk error')); // older save fails after the newer one won
    await flush();
    expect(store.getState().saveError).toBeNull();
  });
});

describe('resetWeek', () => {
  it('clears the viewed week logs and keeps routines/timeline by reference (AC-5.10.1)', async () => {
    const store = createAppStore(fakeRepo(clone(baseState)));
    await store.getState().hydrate();
    const before = store.getState().state;
    store.getState().resetWeek(MON); // week containing the 2026-06-22 log
    const after = store.getState().state;
    expect(after.completionLogs[MON]).toBeUndefined();
    expect(Object.keys(after.completionLogs)).toHaveLength(0);
    expect(after.routines).toBe(before.routines);
    expect(after.activationTimeline).toBe(before.activationTimeline);
  });

  it('is a no-op when the week has no logs', async () => {
    const repo = fakeRepo(clone(baseState));
    const store = createAppStore(repo);
    await store.getState().hydrate();
    const before = store.getState().state;
    store.getState().resetWeek('2026-05-04'); // a week with no logs
    expect(store.getState().state).toBe(before); // unchanged reference
    await flush();
    expect(repo.saved).toHaveLength(0);
  });
});

describe('restart persistence (AC-5.1.2)', () => {
  it('a check survives a reload through the repository', async () => {
    let stored: string | null = null;
    const repo: StorageRepository = {
      load: async () => (stored ? (JSON.parse(stored) as AppState) : null),
      save: async (s) => {
        stored = JSON.stringify(s);
      },
    };
    const first = createAppStore(repo);
    first.setState({ state: clone(baseState), hydrated: true });
    first.getState().toggleCheck(TUE, 'aerobic', 'a1');
    await flush();

    const reopened = createAppStore(repo);
    await reopened.getState().hydrate();
    expect(reopened.getState().state.completionLogs[TUE].checks.aerobic.a1).toBe(true);
  });
});
