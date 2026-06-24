/**
 * Home integration (Day 4): the full optimistic loop — chip tap -> toggle action -> store
 * update -> weekProgress selector recompute -> ProgressBar label — plus the save-failure
 * toast and week navigation. The clock and the store singleton are injected so "today" and
 * persistence are deterministic. This proves on CI what live simulator taps cannot reliably.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { baseState, clone } from '../fixtures/baseState';

let mockSave: (s: unknown) => Promise<void>;

jest.mock('@/domain/clock', () => ({ todayKey: () => '2026-06-23' })); // Tue, in the fixture week
jest.mock('@/store/useAppStore', () => {
  const { createAppStore } = require('@/store/appStore');
  return { useAppStore: createAppStore({ load: async () => null, save: (s: unknown) => mockSave(s) }) };
});

import { useAppStore } from '@/store/useAppStore';
import HomeScreen from '@/app/(tabs)/index';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderHome = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HomeScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockSave = async () => {};
  useAppStore.setState({ state: clone(baseState), hydrated: true, saveError: null });
});

describe('home integration', () => {
  it('optimistically updates the weekly progress label on a chip tap', async () => {
    const view = await renderHome();
    expect(view.getByText('1 / 8 · 13%')).toBeTruthy();
    // Tuesday (today) aerobic chip — index 1 in Mon..Sat order.
    await fireEvent.press(view.getAllByTestId('chip-aerobic')[1]);
    expect(view.getByText('2 / 8 · 25%')).toBeTruthy();
  });

  it('keeps the optimistic change and shows the toast when the save fails', async () => {
    mockSave = async () => {
      throw new Error('disk full');
    };
    const view = await renderHome();
    expect(view.queryByTestId('save-error-toast')).toBeNull();
    await fireEvent.press(view.getAllByTestId('chip-aerobic')[1]);
    expect(view.getByText('2 / 8 · 25%')).toBeTruthy(); // optimistic update is kept
    expect(await view.findByTestId('save-error-toast')).toBeTruthy();
  });

  it('navigates to the previous week and disables next on the current week', async () => {
    const view = await renderHome();
    expect(view.getByText('6.22 – 6.28 · 이번 주')).toBeTruthy();
    expect(view.getByTestId('next-week-btn')).toBeDisabled();
    await fireEvent.press(view.getByTestId('prev-week-btn'));
    expect(view.getByText('6.15 – 6.21 · 지난 주')).toBeTruthy();
    expect(view.getByTestId('next-week-btn')).toBeEnabled();
  });

  it('shows the "applies tomorrow" banner when a future activation is pending', async () => {
    const pending = clone(baseState);
    pending.activationTimeline.push({
      effectiveFrom: '2026-06-24', // tomorrow relative to the mocked today
      routineId: 'rt_aXk92',
      versionId: 'v_002',
    });
    useAppStore.setState({ state: pending, hydrated: true });
    const view = await renderHome();
    expect(view.getByTestId('home-banner')).toBeTruthy();
    expect(view.getByText("내일부터 '여름 컨디셔닝'이 적용됩니다.")).toBeTruthy();
  });
});
