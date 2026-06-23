/**
 * StreakBadge (Day 2): renders text containing the streak count.
 */
import { render } from '@testing-library/react-native';
import { StreakBadge } from '@/components/progress/StreakBadge';

describe('StreakBadge', () => {
  it('renders text containing the streak number', async () => {
    const view = await render(<StreakBadge days={12} />);
    expect(view.getByText(/12/)).toBeTruthy();
  });

  it('shows zero when the streak is zero', async () => {
    const view = await render(<StreakBadge days={0} />);
    expect(view.getByText(/0/)).toBeTruthy();
  });
});
