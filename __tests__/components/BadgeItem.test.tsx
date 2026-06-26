/**
 * BadgeItem (dev doc §EC3): an earned badge shows the earned mark and no progress gauge; an
 * unearned badge shows the "current / target" readout and a gauge whose fill width is the clamped
 * ratio. Uses the RNTL v14 async-render convention (await render).
 */
import { render } from '@testing-library/react-native';

import { BadgeItem } from '@/components/badges/BadgeItem';
import type { BadgeStatus } from '@/domain/badges';

const earned: BadgeStatus = {
  id: 'first-complete',
  label: '첫 완료',
  description: '하루를 완전히 완료했습니다',
  earned: true,
  progress: { current: 2, target: 1 },
};

const inProgress: BadgeStatus = {
  id: 'streak-7',
  label: '7일 연속',
  description: '7일 연속으로 완료했습니다',
  earned: false,
  progress: { current: 2, target: 7 },
};

describe('BadgeItem', () => {
  it('renders the label and description', async () => {
    const view = await render(<BadgeItem badge={earned} />);
    expect(view.getByText('첫 완료')).toBeTruthy();
    expect(view.getByText('하루를 완전히 완료했습니다')).toBeTruthy();
  });

  it('an earned badge shows the earned mark and no progress gauge', async () => {
    const view = await render(<BadgeItem badge={earned} />);
    expect(view.getByTestId('badge-earned-first-complete')).toBeTruthy();
    expect(view.queryByTestId('badge-progress-first-complete')).toBeNull();
    expect(view.queryByTestId('badge-gauge-fill-first-complete')).toBeNull();
  });

  it('an unearned badge shows the "current / target" readout and a gauge', async () => {
    const view = await render(<BadgeItem badge={inProgress} />);
    expect(view.queryByTestId('badge-earned-streak-7')).toBeNull();
    expect(view.getByText('2 / 7')).toBeTruthy();
    // 2/7 -> round(28.57) = 29%
    expect(view.getByTestId('badge-gauge-fill-streak-7')).toHaveStyle({ width: '29%' });
  });

  it('clamps the gauge fill at 100% when current exceeds target', async () => {
    const over: BadgeStatus = { ...inProgress, progress: { current: 20, target: 7 } };
    const view = await render(<BadgeItem badge={over} />);
    expect(view.getByTestId('badge-gauge-fill-streak-7')).toHaveStyle({ width: '100%' });
  });

  it('renders a 0% gauge for an untouched badge', async () => {
    const untouched: BadgeStatus = { ...inProgress, progress: { current: 0, target: 7 } };
    const view = await render(<BadgeItem badge={untouched} />);
    expect(view.getByText('0 / 7')).toBeTruthy();
    expect(view.getByTestId('badge-gauge-fill-streak-7')).toHaveStyle({ width: '0%' });
  });
});
