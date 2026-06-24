/**
 * Library actions (Stage 3 Day 5): hideRoutine / unhideRoutine / duplicateRoutine /
 * deleteRoutine. Covers AC-5.4.3 plus the hidden-flag hydrate round-trip and the
 * stronger delete guard (a routine referenced by the timeline — activated but never
 * logged — is NOT deletable, because removing it would silently change past progress).
 */
import { setName, emptyDraft } from '@/domain/routineDraft';
import { RoutineSchema } from '@/types/schema';
import type { AppState, DayLog } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';
import { makeStore, routineB, twoRoutineState } from '../fixtures/storeHarness';

describe('hideRoutine / unhideRoutine', () => {
  it('sets hidden=true and preserves the versions (AC-5.4.3)', () => {
    const { store } = makeStore(baseState);
    store.getState().hideRoutine('rt_aXk92');
    const r = store.getState().state.routines[0];
    expect(r.hidden).toBe(true);
    expect(r.versions).toHaveLength(1); // versions untouched
  });

  it('unhideRoutine clears the flag', () => {
    const { store } = makeStore(baseState);
    store.getState().hideRoutine('rt_aXk92');
    store.getState().unhideRoutine('rt_aXk92');
    expect(store.getState().state.routines[0].hidden).toBe(false);
  });

  it('preserves hidden through a hydrate round-trip (Zod does not strip it)', () => {
    const { store } = makeStore(baseState);
    store.getState().hideRoutine('rt_aXk92');
    const persisted = JSON.parse(JSON.stringify(store.getState().state)) as AppState;
    const parsed = RoutineSchema.parse(persisted.routines[0]);
    expect(parsed.hidden).toBe(true);
  });
});

describe('duplicateRoutine', () => {
  it('appends a copy with a new id, leaving the original untouched', () => {
    const { store } = makeStore(baseState);
    const before = store.getState().state;
    const newId = store.getState().duplicateRoutine('rt_aXk92');
    const after = store.getState().state;

    expect(newId).toBe('rt_new1');
    expect(after.routines).toHaveLength(before.routines.length + 1);
    expect(after.routines[0]).toBe(before.routines[0]); // original reference unchanged
    const copy = after.routines.find((r) => r.id === newId)!;
    expect(copy.id).not.toBe('rt_aXk92');
    expect(copy.versions).toHaveLength(1);
    expect(copy.versions[0].versionId).toBe('v_001');
    // The copy's content matches the source's latest version content.
    expect(copy.versions[0].days.mon.anaerobic.map((s) => s.name)).toEqual([
      '푸시업',
      '턱걸이',
      '덤벨 로우',
    ]);
  });

  it('does not carry over the hidden flag (a copy is visible)', () => {
    const { store } = makeStore(baseState);
    store.getState().hideRoutine('rt_aXk92');
    const newId = store.getState().duplicateRoutine('rt_aXk92')!;
    const copy = store.getState().state.routines.find((r) => r.id === newId)!;
    expect(copy.hidden).toBeFalsy();
  });

  it('does not touch the active pointer', () => {
    const { store } = makeStore(baseState);
    store.getState().duplicateRoutine('rt_aXk92');
    expect(store.getState().state.settings.activeRoutineId).toBe('rt_aXk92');
  });

  it('returns null for an unknown routine', () => {
    const { store } = makeStore(baseState);
    expect(store.getState().duplicateRoutine('rt_nope')).toBeNull();
  });
});

describe('deleteRoutine — guards (AC-5.4.3 + past-immutability)', () => {
  it('rejects deleting the active routine (switch first)', () => {
    const { store } = makeStore(baseState);
    const result = store.getState().deleteRoutine('rt_aXk92');
    expect(result.ok).toBe(false);
    expect(store.getState().state.routines.find((r) => r.id === 'rt_aXk92')).toBeDefined();
  });

  it('rejects a routine referenced by the timeline (activated but never logged)', () => {
    // rt_B was active in the past (earlier timeline entry) but is not active now and has no
    // completion log. Deleting it would drop those past dates from version resolution and
    // change past weekProgress — so it must be rejected (hide instead).
    const s = clone(baseState);
    const state: AppState = {
      ...s,
      routines: [...s.routines, clone(routineB)],
      activationTimeline: [
        { effectiveFrom: '2026-05-01', routineId: 'rt_B', versionId: 'v_001' },
        { effectiveFrom: '2026-06-01', routineId: 'rt_aXk92', versionId: 'v_001' },
      ],
      completionLogs: {}, // no log references rt_B
      settings: { activeRoutineId: 'rt_aXk92' },
    };
    const { store } = makeStore(state);
    const result = store.getState().deleteRoutine('rt_B');
    expect(result.ok).toBe(false);
    expect(store.getState().state.routines.find((r) => r.id === 'rt_B')).toBeDefined();
  });

  it('rejects a routine referenced by a completion log', () => {
    // Artificial: a log points at rt_logged with no timeline entry, isolating the log guard.
    const log: DayLog = {
      date: '2026-06-10',
      routineId: 'rt_logged',
      versionId: 'v_001',
      checks: { aerobic: {}, anaerobic: {} },
    };
    const state: AppState = {
      schemaVersion: 1,
      routines: [{ ...clone(routineB), id: 'rt_logged' }],
      activationTimeline: [],
      completionLogs: { '2026-06-10': log },
      settings: { activeRoutineId: null },
    };
    const { store } = makeStore(state);
    expect(store.getState().deleteRoutine('rt_logged').ok).toBe(false);
    expect(store.getState().state.routines).toHaveLength(1);
  });

  it('removes a never-activated routine (no timeline, no log)', () => {
    const { store } = makeStore(baseState);
    const id = store.getState().createRoutine(setName(emptyDraft(), '버릴 루틴'));
    const result = store.getState().deleteRoutine(id);
    expect(result.ok).toBe(true);
    expect(store.getState().state.routines.find((r) => r.id === id)).toBeUndefined();
  });

  it('rejects an unknown routine', () => {
    const { store } = makeStore(baseState);
    expect(store.getState().deleteRoutine('rt_nope').ok).toBe(false);
  });
});
