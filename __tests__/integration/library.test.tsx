/**
 * Library integration (Stage 3 Day 1/4). Proves the list filters hidden routines and badges
 * exactly one active, that "새 루틴" routes to the editor, and that activating a different
 * routine goes through the confirm sheet and moves the active pointer (the switch itself is
 * effective tomorrow, verified in the store unit tests). Router/clock/store are mocked.
 */
import { render, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AppState } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';
import { routineB } from '../fixtures/storeHarness';

const mockPush = jest.fn();

jest.mock('@/domain/clock', () => ({ todayKey: () => '2026-06-23' }));
jest.mock('expo-router', () => ({ router: { push: (p: string) => mockPush(p) } }));
jest.mock('@/store/useAppStore', () => {
  const { createAppStore } = require('@/store/appStore');
  return {
    useAppStore: createAppStore(
      { load: async () => null, save: async () => {} },
      { now: () => '2026-06-24T00:00:00Z', newRoutineId: () => 'rt_dup' },
    ),
  };
});

import { useAppStore } from '@/store/useAppStore';
import LibraryScreen from '@/app/(tabs)/library';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderLibrary = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <LibraryScreen />
    </SafeAreaProvider>,
  );

/** active rt_aXk92, inactive rt_B, and a hidden routine. */
function threeRoutineState(): AppState {
  const s = clone(baseState);
  const hidden = { ...clone(routineB), id: 'rt_hidden', name: '숨긴 루틴', hidden: true };
  return { ...s, routines: [...s.routines, clone(routineB), hidden] };
}

beforeEach(() => {
  mockPush.mockClear();
  useAppStore.setState({ state: threeRoutineState(), hydrated: true });
});

describe('library', () => {
  it('lists only non-hidden routines with exactly one active badge', async () => {
    const view = await renderLibrary();
    expect(view.getByTestId('routine-card-rt_aXk92')).toBeTruthy();
    expect(view.getByTestId('routine-card-rt_B')).toBeTruthy();
    expect(view.queryByTestId('routine-card-rt_hidden')).toBeNull(); // hidden excluded
    expect(view.getByTestId('active-badge-rt_aXk92')).toBeTruthy();
    expect(view.queryByTestId('active-badge-rt_B')).toBeNull();
  });

  it('moves the active badge when the active pointer changes in the store', async () => {
    const view = await renderLibrary();
    expect(view.getByTestId('active-badge-rt_aXk92')).toBeTruthy();
    // Reactivity: a store change to the active pointer re-renders the badge. The async act
    // form flushes the resulting update inside an act boundary (the sync form does not).
    await act(async () => {
      const prev = useAppStore.getState().state;
      useAppStore.setState({
        state: { ...prev, settings: { ...prev.settings, activeRoutineId: 'rt_B' } },
      });
    });
    expect(view.getByTestId('active-badge-rt_B')).toBeTruthy();
    expect(view.queryByTestId('active-badge-rt_aXk92')).toBeNull();
  });

  it('routes to the editor on "새 루틴"', async () => {
    const view = await renderLibrary();
    await fireEvent.press(view.getByTestId('new-routine-btn'));
    expect(mockPush).toHaveBeenCalledWith('/editor/new');
  });

  it('switching active goes through the confirm sheet and moves the pointer', async () => {
    const view = await renderLibrary();
    await fireEvent.press(view.getByTestId('routine-card-rt_B')); // open actions sheet
    await fireEvent.press(view.getByTestId('routine-action-activate'));
    // A routine is already active -> the confirm sheet shows (not an immediate switch).
    expect(view.getByTestId('activation-confirm-sheet')).toBeTruthy();
    await fireEvent.press(view.getByTestId('activation-confirm'));
    expect(useAppStore.getState().state.settings.activeRoutineId).toBe('rt_B');
  });

  it('duplicate adds a visible card', async () => {
    const view = await renderLibrary();
    await fireEvent.press(view.getByTestId('routine-card-rt_aXk92'));
    await fireEvent.press(view.getByTestId('routine-action-duplicate'));
    expect(await view.findByTestId('routine-card-rt_dup')).toBeTruthy();
  });
});
