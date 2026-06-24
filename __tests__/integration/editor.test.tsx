/**
 * Editor integration (Stage 3 Day 2/3). Proves the draft-then-commit contract end to end:
 * the save CTA gates on a name, catalog/custom adds land in the draft, rest-day toggles
 * disable a day's sections, the store is untouched until save, and save commits via
 * createRoutine (new) / editRoutine (existing). expo-router, the clock, and the store
 * singleton are mocked so the screen renders deterministically off-device.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { baseState, clone } from '../fixtures/baseState';
import { emptyAppState } from '@/store/appStore';

let mockRoutineId = 'new';
const mockBack = jest.fn();

jest.mock('@/domain/clock', () => ({ todayKey: () => '2026-06-23' }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ routineId: mockRoutineId }),
}));
jest.mock('@/store/useAppStore', () => {
  const { createAppStore } = require('@/store/appStore');
  return {
    useAppStore: createAppStore(
      { load: async () => null, save: async () => {} },
      { now: () => '2026-06-24T00:00:00Z', newRoutineId: () => 'rt_made' },
    ),
  };
});

import { useAppStore } from '@/store/useAppStore';
import EditorScreen from '@/app/editor/[routineId]';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderEditor = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <EditorScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockBack.mockClear();
});

describe('editor — create mode', () => {
  beforeEach(() => {
    mockRoutineId = 'new';
    useAppStore.setState({ state: emptyAppState(), hydrated: true });
  });

  it('disables save until a name is entered', async () => {
    const view = await renderEditor();
    expect(view.getByTestId('editor-save')).toBeDisabled();
    await fireEvent.changeText(view.getByTestId('routine-name-input'), '아침 루틴');
    expect(view.getByTestId('editor-save')).toBeEnabled();
  });

  it('adds a catalog exercise into the draft without touching the store', async () => {
    const view = await renderEditor();
    await fireEvent.changeText(view.getByTestId('routine-name-input'), '아침 루틴');
    await fireEvent.press(view.getByTestId('add-exercise-aerobic'));
    // Pick a catalog item -> name/sets pre-fill -> confirm.
    await fireEvent.press(view.getByTestId('catalog-러닝'));
    await fireEvent.press(view.getByTestId('exercise-add-confirm'));
    // The slot shows in the Monday aerobic section…
    expect(view.getByTestId('slot-row-aerobic-0')).toBeTruthy();
    expect(view.getByText('러닝')).toBeTruthy();
    // …but the store still has no routine (draft only, not committed).
    expect(useAppStore.getState().state.routines).toHaveLength(0);
  });

  it('commits a new routine on save (createRoutine)', async () => {
    const view = await renderEditor();
    await fireEvent.changeText(view.getByTestId('routine-name-input'), '아침 루틴');
    await fireEvent.press(view.getByTestId('add-exercise-anaerobic'));
    await fireEvent.changeText(view.getByTestId('exercise-name-input'), '푸시업');
    await fireEvent.changeText(view.getByTestId('exercise-sets-input'), '4 × 12');
    await fireEvent.press(view.getByTestId('exercise-add-confirm'));
    await fireEvent.press(view.getByTestId('editor-save'));

    const routines = useAppStore.getState().state.routines;
    expect(routines).toHaveLength(1);
    expect(routines[0].name).toBe('아침 루틴');
    expect(routines[0].versions[0].days.mon.anaerobic).toEqual([
      { slotId: 'x1', name: '푸시업', sets: '4 × 12' },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('reorders and removes draft slots via the inline controls', async () => {
    const view = await renderEditor();
    await fireEvent.changeText(view.getByTestId('routine-name-input'), '아침 루틴');
    // Add two aerobic slots: A then B.
    for (const name of ['A', 'B']) {
      await fireEvent.press(view.getByTestId('add-exercise-aerobic'));
      await fireEvent.changeText(view.getByTestId('exercise-name-input'), name);
      await fireEvent.press(view.getByTestId('exercise-add-confirm'));
    }
    expect(view.getByTestId('slot-row-aerobic-0')).toHaveTextContent(/A/);
    expect(view.getByTestId('slot-row-aerobic-1')).toHaveTextContent(/B/);
    // Move A down -> [B, A].
    await fireEvent.press(view.getByTestId('slot-down-aerobic-0'));
    expect(view.getByTestId('slot-row-aerobic-0')).toHaveTextContent(/B/);
    expect(view.getByTestId('slot-row-aerobic-1')).toHaveTextContent(/A/);
    // Remove A (now index 1) -> only B remains, committed on save.
    await fireEvent.press(view.getByTestId('slot-remove-aerobic-1'));
    expect(view.queryByTestId('slot-row-aerobic-1')).toBeNull();
    await fireEvent.press(view.getByTestId('editor-save'));
    expect(useAppStore.getState().state.routines[0].versions[0].days.mon.aerobic).toEqual([
      { slotId: 'a1', name: 'B', sets: '' },
    ]);
  });

  it('shows a rest-day notice and hides the category sections for a rest day', async () => {
    const view = await renderEditor();
    await fireEvent.press(view.getByTestId('rest-toggle-mon')); // Monday becomes a rest day
    expect(view.getByText('휴식일입니다. 이 요일에는 운동을 추가하지 않습니다.')).toBeTruthy();
    expect(view.queryByTestId('category-section-aerobic')).toBeNull();
  });
});

describe('editor — edit mode', () => {
  beforeEach(() => {
    mockRoutineId = 'rt_aXk92';
    useAppStore.setState({ state: clone(baseState), hydrated: true });
  });

  it('pre-fills the name from the routine and appends a new version on save', async () => {
    const view = await renderEditor();
    expect(view.getByTestId('routine-name-input').props.value).toBe('여름 컨디셔닝');

    await fireEvent.press(view.getByTestId('add-exercise-aerobic'));
    await fireEvent.press(view.getByTestId('catalog-수영'));
    await fireEvent.press(view.getByTestId('exercise-add-confirm'));
    await fireEvent.press(view.getByTestId('editor-save'));

    const routine = useAppStore.getState().state.routines.find((r) => r.id === 'rt_aXk92')!;
    expect(routine.versions).toHaveLength(2); // new version appended
    // Active routine edit -> a tomorrow-effective timeline entry was added.
    const tl = useAppStore.getState().state.activationTimeline;
    expect(tl[tl.length - 1].effectiveFrom).toBe('2026-06-24');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
