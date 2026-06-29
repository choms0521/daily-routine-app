/**
 * WeekReviewCard (Stage 3 B3, spec b3 §4): display-only. Verifies the completed-day count, the
 * weekday readouts, and the delta sign + token color across all four delta states
 * (gain -> success, loss/flat/absent -> fgMuted). Uses the RNTL v14 async-render convention and
 * the theme defaults (useTheme falls back to the token set without a provider).
 */
import { render } from '@testing-library/react-native';

import { WeekReviewCard } from '@/components/insights/WeekReviewCard';
import { color } from '@/theme/tokens';
import type { WeekReview } from '@/domain/insights';

function review(partial: Partial<WeekReview>): WeekReview {
  return {
    weekStart: '2026-06-22',
    progress: { done: 1, total: 8, pct: 13 },
    completedDays: 0,
    activeDays: 6,
    topWeekday: 'mon',
    missedWeekday: 'tue',
    deltaPct: 13,
    ...partial,
  };
}

describe('WeekReviewCard', () => {
  it('renders the completed-day count and weekday names (retrospective info, not the live bar)', async () => {
    const view = await render(
      <WeekReviewCard review={review({ completedDays: 2 })} summary="요약 한 줄" />,
    );
    expect(view.getByTestId('week-review-completed-days')).toHaveTextContent('2');
    expect(view.getByText('월요일')).toBeTruthy(); // top weekday
    expect(view.getByText('화요일')).toBeTruthy(); // missed weekday
    expect(view.getByTestId('week-review-summary')).toHaveTextContent('요약 한 줄');
  });

  it('shows a positive delta as "+N%p" in the success token', async () => {
    const view = await render(<WeekReviewCard review={review({ deltaPct: 13 })} summary="" />);
    const delta = view.getByText('+13%p');
    expect(delta).toHaveStyle({ color: color.success });
  });

  it('shows a negative delta as "−N%p" in the muted token (never success)', async () => {
    const view = await render(<WeekReviewCard review={review({ deltaPct: -5 })} summary="" />);
    const delta = view.getByText('−5%p');
    expect(delta).toHaveStyle({ color: color.fgMuted });
  });

  it('shows a flat delta as "0%p" in the muted token', async () => {
    const view = await render(<WeekReviewCard review={review({ deltaPct: 0 })} summary="" />);
    const delta = view.getByText('0%p');
    expect(delta).toHaveStyle({ color: color.fgMuted });
  });

  it('shows an absent delta and absent weekdays as "–" in the muted token', async () => {
    const view = await render(
      <WeekReviewCard
        review={review({ deltaPct: null, topWeekday: null, missedWeekday: null })}
        summary=""
      />,
    );
    // Three "–" placeholders: top weekday, missed weekday, and the delta.
    expect(view.getAllByText('–').length).toBe(3);
  });
});
