/**
 * Insights tab integration (Stage 1, dev doc §EC6): the 기록 tab renders its title and the
 * A1 history section (month calendar by default), and the empty-state guidance replaces the
 * grid when the user has no recorded activity. The clock and the store singleton are injected
 * so "today" and the data are deterministic.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { baseState, clone } from '../fixtures/baseState';

jest.mock('@/domain/clock', () => ({ todayKey: () => '2026-06-25' })); // within a year of the 06-22 log
jest.mock('@/store/useAppStore', () => {
  const { createAppStore } = require('@/store/appStore');
  return { useAppStore: createAppStore({ load: async () => null, save: async () => {} }) };
});

import { useAppStore } from '@/store/useAppStore';
import InsightsScreen from '@/app/(tabs)/insights';
import HomeScreen from '@/app/(tabs)/index';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// --- Minimal tree helpers for asserting render ORDER, not just presence. ---
// react-test-renderer JSON: { type, props, children } | string | null.
type Json = { type: string; props: Record<string, unknown>; children: Json[] | null } | string | null;

function isTestId(node: Json, testID: string): boolean {
  return typeof node === 'object' && node !== null && node.props?.testID === testID;
}

function isText(node: Json, text: string): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    Array.isArray(node.children) &&
    node.children.some((c) => c === text)
  );
}

/**
 * Depth-first index of the first node matching each predicate, in the order the predicates are
 * given. Returns the position each predicate's match holds in encounter order, so a strictly
 * increasing result proves the first element renders before the second.
 */
function nodeOrder(root: Json, predicates: ((node: Json) => boolean)[]): number[] {
  const found = new Map<number, number>();
  let visitIndex = 0;
  const visit = (node: Json) => {
    predicates.forEach((pred, i) => {
      if (!found.has(i) && pred(node)) found.set(i, visitIndex);
    });
    visitIndex += 1;
    if (typeof node === 'object' && node !== null && Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  };
  visit(root);
  const positions = predicates.map((_, i) => found.get(i) ?? Infinity);
  const sorted = [...positions].sort((a, b) => a - b);
  return positions.map((p) => sorted.indexOf(p));
}

const renderInsights = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <InsightsScreen />
    </SafeAreaProvider>,
  );

const renderHome = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HomeScreen />
    </SafeAreaProvider>,
  );

describe('insights tab integration', () => {
  it('renders the 기록 title and the A1 history calendar for a user with activity', async () => {
    useAppStore.setState({ state: clone(baseState), hydrated: true, saveError: null });
    const view = await renderInsights();
    expect(view.getByText('기록')).toBeTruthy();
    expect(view.getByText('기록 캘린더')).toBeTruthy();
    // The partial log on 2026-06-22 falls in June, the default viewed month -> its cell renders.
    expect(view.getByTestId('day-cell-2026-06-22')).toBeTruthy();
  });

  it('renders the B3 weekly summary card above the A1 history calendar', async () => {
    useAppStore.setState({ state: clone(baseState), hydrated: true, saveError: null });
    const view = await renderInsights();
    expect(view.getByTestId('week-review-card')).toBeTruthy();
    expect(view.getByTestId('week-review-summary')).toBeTruthy();
    // B3 must sit ABOVE the A1 calendar: its testID node precedes the '기록 캘린더' title in
    // a depth-first traversal of the rendered tree (JSX order alone is not asserted).
    const order = nodeOrder(view.toJSON(), [
      (n) => isTestId(n, 'week-review-card'),
      (n) => isText(n, '기록 캘린더'),
    ]);
    expect(order).toEqual([0, 1]);
  });

  it('does not leak the B3 card into the home screen (중복 금지 regression guard)', async () => {
    useAppStore.setState({ state: clone(baseState), hydrated: true, saveError: null });
    const view = await renderHome();
    // Home keeps its live progress bar + streak; the retrospective B3 card never appears there.
    expect(view.queryByTestId('week-review-card')).toBeNull();
    expect(view.queryByTestId('week-review-summary')).toBeNull();
  });

  it('shows the empty-state guidance when there is no recorded activity', async () => {
    const blank = clone(baseState);
    blank.completionLogs = {}; // remove the only log -> no complete/partial day
    useAppStore.setState({ state: blank, hydrated: true, saveError: null });
    const view = await renderInsights();
    expect(view.getByTestId('history-empty')).toBeTruthy();
  });

  it('toggles to the year heatmap', async () => {
    useAppStore.setState({ state: clone(baseState), hydrated: true, saveError: null });
    const view = await renderInsights();
    await fireEvent.press(view.getByTestId('history-mode-year'));
    expect(view.getByTestId('year-heatmap')).toBeTruthy();
  });

  it('renders the A3 badge grid as the bottom section, after the C2 stats', async () => {
    useAppStore.setState({ state: clone(baseState), hydrated: true, saveError: null });
    const view = await renderInsights();
    // The badge section renders, with its catalog items (first-complete is always present).
    expect(view.getByTestId('badge-grid')).toBeTruthy();
    expect(view.getByTestId('badge-item-first-complete')).toBeTruthy();
    // A3 must sit BELOW the C2 통계 section: its testID node follows the '통계' title in a
    // depth-first traversal of the rendered tree (fixed order B3 -> A1 -> C2 -> A3).
    const order = nodeOrder(view.toJSON(), [
      (n) => isText(n, '통계'),
      (n) => isTestId(n, 'badge-grid'),
    ]);
    expect(order).toEqual([0, 1]);
  });
});
