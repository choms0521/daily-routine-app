/**
 * setActiveRoutine (Stage 3 Day 4). Verifies AC-5.4.1 (exactly one active) and AC-5.4.2
 * (switch is effective tomorrow / today is protected; first activation is effective today).
 *
 * The switch case uses today = Sunday '2026-06-28' so the whole current week is in the past
 * relative to the tomorrow-effective entry ('2026-06-29', next Monday). weekProgress counts
 * all 7 days of a week, so a same-week weekday today would legitimately change the current
 * week's future days — D8.8 protects today and the past, not future days. Picking Sunday
 * makes the "this week unchanged" assertion exact.
 */
import { weekStartOf } from '@/domain/date';
import { weekProgress } from '@/domain/progress';
import { addSlot, draftFromRoutine, emptyDraft, setName } from '@/domain/routineDraft';
import { streak } from '@/domain/streak';
import { versionOf } from '@/domain/timeline';
import type { AppState } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';
import { makeStore, twoRoutineState } from '../fixtures/storeHarness';

const SUN = '2026-06-28';
const NEXT_MON = '2026-06-29';

/** baseState with nothing active yet (empty timeline, no active pointer, no logs). */
function preActivationState(): AppState {
  const s = clone(baseState);
  return { ...s, activationTimeline: [], completionLogs: {}, settings: { activeRoutineId: null } };
}

describe('setActiveRoutine — AC-5.4.1 exactly one active', () => {
  it('the active pointer moves to the switched-to routine', () => {
    const { store } = makeStore(twoRoutineState());
    store.getState().setActiveRoutine('rt_B', SUN);
    expect(store.getState().state.settings.activeRoutineId).toBe('rt_B');
  });

  it('is a no-op when the target is already active (no redundant timeline entry)', () => {
    const { store } = makeStore(baseState);
    const before = store.getState().state;
    store.getState().setActiveRoutine('rt_aXk92', SUN); // already active
    expect(store.getState().state).toBe(before); // unchanged reference
  });

  it('is a no-op for an unknown routine', () => {
    const { store } = makeStore(baseState);
    const before = store.getState().state;
    store.getState().setActiveRoutine('rt_nope', SUN);
    expect(store.getState().state).toBe(before);
  });
});

describe('setActiveRoutine — AC-5.4.2 case A: switch is effective tomorrow', () => {
  it('switches the pointer now but protects today and the past', () => {
    const { store } = makeStore(twoRoutineState());
    const before = clone(store.getState().state);
    store.getState().setActiveRoutine('rt_B', SUN);
    const after = store.getState().state;

    const tl = after.activationTimeline;
    expect(tl[tl.length - 1].effectiveFrom).toBe(NEXT_MON); // tomorrow
    expect(tl[tl.length - 1].routineId).toBe('rt_B');
    // today still resolves to the previous active version (today protection).
    expect(versionOf(after, SUN)!.versionId).toBe(versionOf(before, SUN)!.versionId);
    expect(after.routines.find((r) => r.id === 'rt_aXk92')).toBeDefined();
    // The whole current week is in the past relative to the switch -> unchanged.
    const thisWeek = weekStartOf(SUN);
    expect(weekProgress(after, thisWeek)).toEqual(weekProgress(before, thisWeek));
    expect(streak(after, SUN)).toBe(streak(before, SUN));
  });
});

describe('setActiveRoutine — AC-5.4.2 case B: first activation is effective today', () => {
  it('applies from today and today immediately resolves to the activated version', () => {
    const { store } = makeStore(preActivationState());
    const TODAY = '2026-06-23';
    expect(versionOf(store.getState().state, TODAY)).toBeNull(); // nothing active yet
    store.getState().setActiveRoutine('rt_aXk92', TODAY);
    const after = store.getState().state;

    const tl = after.activationTimeline;
    expect(tl[tl.length - 1].effectiveFrom).toBe(TODAY); // first activation -> today
    expect(versionOf(after, TODAY)!.versionId).toBe('v_001');
    expect(after.settings.activeRoutineId).toBe('rt_aXk92');
  });
});

describe('setActiveRoutine — inactive edit then activate picks the latest version', () => {
  it('uses the edited (latest) version id in the activation entry', () => {
    const { store } = makeStore(twoRoutineState());
    let draft = draftFromRoutine(twoRoutineState().routines[1]); // rt_B
    draft = setName(draft, '가벼운 산책');
    draft = addSlot(draft, 'mon', 'aerobic', { name: '조깅', sets: '15분' });
    store.getState().editRoutine('rt_B', draft, SUN); // rt_B inactive -> v_002, no timeline entry
    store.getState().setActiveRoutine('rt_B', SUN);
    const tl = store.getState().state.activationTimeline;
    expect(tl[tl.length - 1].versionId).toBe('v_002');
  });
});
