/**
 * createRoutine / editRoutine (Stage 3 Day 3). Verifies the spec §4.1 transition matrix and
 * the D8.8 invariants: version append-only, past unchanged, today protected, rest-day past
 * judgment. today = '2026-06-23' (Tue) so tomorrow = '2026-06-24'.
 */
import { isRestDay } from '@/domain/completion';
import { weekStartOf } from '@/domain/date';
import { weekProgress } from '@/domain/progress';
import { addSlot, draftFromRoutine, emptyDraft, setName, toggleRestDay } from '@/domain/routineDraft';
import { streak } from '@/domain/streak';
import { plan } from '@/domain/timeline';
import { WEEKDAYS } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';
import { makeStore, twoRoutineState } from '../fixtures/storeHarness';

const TODAY = '2026-06-23';
const TOMORROW = '2026-06-24';

function newDraft() {
  let d = emptyDraft();
  d = setName(d, '새 루틴');
  d = addSlot(d, 'mon', 'aerobic', { name: '러닝', sets: '30분' });
  return d;
}

/** A draft that differs from v_001: adds a uniquely-named slot to every weekday. */
function editedDraft() {
  let d = draftFromRoutine(baseState.routines[0]);
  for (const weekday of WEEKDAYS) {
    d = addSlot(d, weekday, 'aerobic', { name: '추가운동', sets: '10분' });
  }
  return d;
}

describe('createRoutine', () => {
  it('appends a routine with one v_001 version and returns its id', () => {
    const { store } = makeStore(baseState);
    const before = store.getState().state;
    const id = store.getState().createRoutine(newDraft());
    const after = store.getState().state;

    expect(id).toBe('rt_new1');
    expect(after.routines).toHaveLength(before.routines.length + 1);
    const created = after.routines.find((r) => r.id === id)!;
    expect(created.versions).toHaveLength(1);
    expect(created.versions[0].versionId).toBe('v_001');
  });

  it('does NOT touch the timeline or the active pointer (creation is not activation)', () => {
    const { store } = makeStore(baseState);
    const before = store.getState().state;
    store.getState().createRoutine(newDraft());
    const after = store.getState().state;

    expect(after.activationTimeline).toHaveLength(before.activationTimeline.length);
    expect(after.settings.activeRoutineId).toBe(before.settings.activeRoutineId);
  });
});

describe('editRoutine — AC-5.3.1 version immutability', () => {
  it('appends a new version and never mutates the old one', () => {
    const { store } = makeStore(baseState);
    const before = store.getState().state;
    store.getState().editRoutine('rt_aXk92', editedDraft(), TODAY);
    const after = store.getState().state;

    expect(after.routines[0].versions).toHaveLength(2);
    expect(after.routines[0].versions[0]).toBe(before.routines[0].versions[0]); // same reference
    expect(JSON.stringify(after.routines[0].versions[0])).toBe(
      JSON.stringify(before.routines[0].versions[0]),
    );
    expect(after.routines[0].versions[1].versionId).toBe('v_002');
  });
});

describe('editRoutine — active vs inactive timeline (spec §4.1)', () => {
  it('an active routine edit appends a timeline entry effective tomorrow', () => {
    const { store } = makeStore(baseState);
    store.getState().editRoutine('rt_aXk92', editedDraft(), TODAY);
    const tl = store.getState().state.activationTimeline;
    const last = tl[tl.length - 1];
    expect(last.effectiveFrom).toBe(TOMORROW);
    expect(last.routineId).toBe('rt_aXk92');
    expect(last.versionId).toBe('v_002');
  });

  it('an inactive routine edit leaves the timeline unchanged', () => {
    const { store } = makeStore(twoRoutineState()); // active = rt_aXk92, rt_B inactive
    const before = store.getState().state.activationTimeline.length;
    store.getState().editRoutine('rt_B', editedDraft(), TODAY);
    const after = store.getState().state;
    expect(after.activationTimeline).toHaveLength(before);
    // The new version is still appended to the inactive routine.
    expect(after.routines.find((r) => r.id === 'rt_B')!.versions).toHaveLength(2);
  });
});

describe('editRoutine — AC-5.3.2 past unchanged', () => {
  it('past week progress and streak are byte-identical after an active edit', () => {
    // today in a later week so the 2026-06-22 week is strictly in the past.
    const LATER = '2026-07-01';
    const { store } = makeStore(baseState);
    const before = clone(store.getState().state);
    store.getState().editRoutine('rt_aXk92', editedDraft(), LATER);
    const after = store.getState().state;

    const pastWeek = weekStartOf('2026-06-22');
    expect(weekProgress(after, pastWeek)).toEqual(weekProgress(before, pastWeek));
    expect(streak(after, LATER)).toBe(streak(before, LATER));
  });
});

describe('editRoutine — AC-5.3.3 today protection', () => {
  it("today's plan is unchanged and tomorrow resolves to the new version", () => {
    const { store } = makeStore(baseState);
    const before = clone(store.getState().state);
    store.getState().editRoutine('rt_aXk92', editedDraft(), TODAY);
    const after = store.getState().state;

    expect(plan(after, TODAY)).toEqual(plan(before, TODAY)); // today untouched
    // tomorrow now carries the edited version (the uniquely-named slot is present).
    const tomorrowPlan = plan(after, TOMORROW)!;
    expect(tomorrowPlan.aerobic.some((s) => s.name === '추가운동')).toBe(true);
    expect(plan(before, TOMORROW)!.aerobic.some((s) => s.name === '추가운동')).toBe(false);
  });
});

describe('editRoutine — AC-5.3.4 rest-day past judgment', () => {
  it('past dates use the old restDays; future dates use the new restDays', () => {
    // v_001 rests on Sunday; edit to rest on Saturday instead.
    let draft = draftFromRoutine(baseState.routines[0]);
    draft = toggleRestDay(draft, 'sun'); // remove sun
    draft = toggleRestDay(draft, 'sat'); // add sat
    const { store } = makeStore(baseState);
    store.getState().editRoutine('rt_aXk92', draft, TODAY);
    const after = store.getState().state;

    expect(isRestDay(after, '2026-06-21')).toBe(true); // past Sunday, v_001 (sun rest)
    expect(isRestDay(after, '2026-06-28')).toBe(false); // future Sunday, v_002 (sat rest)
  });
});
