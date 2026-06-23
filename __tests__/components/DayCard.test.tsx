/**
 * DayCard (Day 2): the "오늘" tag shows only on the current week's today (AC-5.9.1), and
 * a rest day renders the rest line instead of chips.
 */
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DayCard } from '@/components/chip/DayCard';

const base = {
  weekdayLabel: '월',
  dateLabel: '6.22',
  isRestDay: false,
};

describe('DayCard', () => {
  it('shows the 오늘 tag on the current week today', async () => {
    const view = await render(<DayCard {...base} isToday isCurrentWeek />);
    expect(view.getByText('오늘')).toBeTruthy();
  });

  it('hides the 오늘 tag when viewing a past week', async () => {
    const view = await render(<DayCard {...base} isToday isCurrentWeek={false} />);
    expect(view.queryByText('오늘')).toBeNull();
  });

  it('hides the 오늘 tag on a non-today day of the current week', async () => {
    const view = await render(<DayCard {...base} isToday={false} isCurrentWeek />);
    expect(view.queryByText('오늘')).toBeNull();
  });

  it('renders the rest-day line and not its children when isRestDay', async () => {
    const view = await render(
      <DayCard {...base} isRestDay isToday={false} isCurrentWeek>
        <Text>칩 자리</Text>
      </DayCard>,
    );
    expect(view.getByText(/휴식/)).toBeTruthy();
    expect(view.queryByText('칩 자리')).toBeNull();
  });

  it('renders children (chips) on a non-rest day', async () => {
    const view = await render(
      <DayCard {...base} isToday={false} isCurrentWeek>
        <Text>칩 자리</Text>
      </DayCard>,
    );
    expect(view.getByText('칩 자리')).toBeTruthy();
  });
});
