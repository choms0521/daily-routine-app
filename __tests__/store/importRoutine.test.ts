/**
 * importRoutine store action (spec stage-4 §5.3, dev-plan Day 3). Proves an imported payload
 * becomes a brand-new routine built exactly like a hand-made one: fresh routine id, positionally
 * reissued slot ids (PRD 4.4 — scope-unique, NOT globally unique), 7-day completeness, existing
 * state untouched (AC-5.5.2), and a later edit appends a normal v_002 (AC-5.5.4).
 *
 * Note: the dev-plan's "no slotId intersection with existing routines" wording is over-specified
 * — it conflicts with the positional slotId scheme that spec §5.3 / PRD 4.4 mandate (a1/x1 repeat
 * across routines by design). We assert the binding constraints from the higher source instead.
 */
import { serializeRoutine, deserializeRoutine, type SharePayload } from '@/domain/share';
import { draftFromRoutine, setName, toggleRestDay } from '@/domain/routineDraft';
import type { RoutineVersion } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';
import { makeStore, twoRoutineState } from '../fixtures/storeHarness';

/** A source version with multiple anaerobic slots so positional reissue (x1, x2…) is observable. */
const sourceVersion: RoutineVersion = {
  versionId: 'v_777',
  createdAt: '2026-05-01T00:00:00Z',
  restDays: ['sun'],
  days: {
    mon: {
      aerobic: [{ slotId: 'orig-a', name: '러닝', sets: '30분' }],
      anaerobic: [
        { slotId: 'orig-x', name: '푸시업', sets: '4세트' },
        { slotId: 'orig-y', name: '스쿼트', sets: '3세트' },
      ],
    },
    tue: { aerobic: [], anaerobic: [] },
    wed: { aerobic: [], anaerobic: [] },
    thu: { aerobic: [], anaerobic: [] },
    fri: { aerobic: [], anaerobic: [] },
    sat: { aerobic: [], anaerobic: [] },
    sun: { aerobic: [], anaerobic: [] },
  },
};

function payloadFrom(version: RoutineVersion, name: string): SharePayload {
  const result = deserializeRoutine(serializeRoutine(version, name), 1);
  if (!result.success) throw new Error('test payload failed to decode');
  return result.payload;
}

describe('importRoutine', () => {
  it('adds exactly one new routine and leaves existing state untouched (AC-5.5.2)', () => {
    const { store } = makeStore(twoRoutineState());
    const before = clone(store.getState().state);

    store.getState().importRoutine(payloadFrom(sourceVersion, '가져온 루틴'));
    const after = store.getState().state;

    expect(after.routines.length).toBe(before.routines.length + 1);
    expect(after.routines[0]).toEqual(before.routines[0]); // existing routine unchanged
    expect(after.routines[1]).toEqual(before.routines[1]);
    expect(JSON.stringify(after.completionLogs)).toBe(JSON.stringify(before.completionLogs));
    expect(JSON.stringify(after.activationTimeline)).toBe(JSON.stringify(before.activationTimeline));
    expect(after.settings.activeRoutineId).toBe(before.settings.activeRoutineId); // not activated
  });

  it('mints a fresh routine id not used by any existing routine', () => {
    const { store } = makeStore(twoRoutineState());
    const existingIds = store.getState().state.routines.map((r) => r.id);

    const newId = store.getState().importRoutine(payloadFrom(sourceVersion, '가져온 루틴'));

    expect(existingIds).not.toContain(newId);
    expect(store.getState().state.routines[store.getState().state.routines.length - 1].id).toBe(
      newId,
    );
  });

  it('reissues slot ids positionally and keeps 7-day completeness (PRD 4.4 / C1)', () => {
    const { store } = makeStore(twoRoutineState());
    const newId = store.getState().importRoutine(payloadFrom(sourceVersion, '가져온 루틴'));

    const imported = store.getState().state.routines.find((r) => r.id === newId);
    const version = imported!.versions[0];

    expect(Object.keys(version.days)).toHaveLength(7);
    expect(version.days.mon.aerobic[0].slotId).toBe('a1');
    expect(version.days.mon.anaerobic[0].slotId).toBe('x1');
    expect(version.days.mon.anaerobic[1].slotId).toBe('x2');
    // Names/sets survive; the original ids do not.
    expect(version.days.mon.anaerobic.map((s) => s.name)).toEqual(['푸시업', '스쿼트']);
    expect(version.restDays).toEqual(['sun']);
    expect(imported!.versions).toHaveLength(1);
    expect(imported!.versions[0].versionId).toBe('v_001');
  });

  it('does not introduce a new slotId scheme — import matches a hand-made routine', () => {
    // The active baseState routine already uses a1/x1/x2; an import reusing those strings within
    // its own (version, weekday, category) scope is expected and harmless (slotIds are not global).
    const { store } = makeStore(makeOneRoutineState());
    const newId = store.getState().importRoutine(payloadFrom(sourceVersion, '가져온 루틴'));
    const imported = store.getState().state.routines.find((r) => r.id === newId);
    expect(imported!.versions[0].days.mon.aerobic[0].slotId).toBe('a1'); // same scheme as base
  });

  it('imported routine edits append a normal v_002, old version unchanged (AC-5.5.4)', () => {
    const { store } = makeStore(twoRoutineState());
    const newId = store.getState().importRoutine(payloadFrom(sourceVersion, '가져온 루틴'));

    const imported = store.getState().state.routines.find((r) => r.id === newId)!;
    const v0 = clone(imported.versions[0]);
    // A real plan change (add a rest day) appends a version; it is inactive so no timeline entry.
    const edited = toggleRestDay(setName(draftFromRoutine(imported), '가져온 루틴 v2'), 'mon');
    store.getState().editRoutine(newId, edited, '2026-06-24');

    const after = store.getState().state.routines.find((r) => r.id === newId)!;
    expect(after.versions).toHaveLength(2);
    expect(after.versions[0]).toEqual(v0); // append-only: original version untouched
    expect(after.versions[1].versionId).toBe('v_002');
    expect(after.name).toBe('가져온 루틴 v2');
  });
});

/** baseState with only its single active routine (for the same-scheme assertion). */
function makeOneRoutineState() {
  return clone(baseState);
}
