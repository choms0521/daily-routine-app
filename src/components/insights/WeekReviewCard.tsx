/**
 * WeekReviewCard (spec b3 §3, the B3 surface at the top of the 기록 tab). Display-only: it
 * renders the WeekReview + summary the selector already produced and never recomputes a rate.
 *
 * Deliberately NOT a duplicate of the home header — it shows only the retrospective facts the
 * home omits (completed-day count, best/worst weekday, change vs. the prior week). It does not
 * re-render the live progress bar or the streak badge (spec b3 §0 중복 금지).
 *
 * Tokens only: the completed-day count is font.display + tabular-nums (number-forward, PRD 6.1);
 * the delta sign color is success for a strict gain and fgMuted for flat/loss/absent.
 */
import { Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/constants/labels';
import { Card } from '@/components/ui/Card';
import type { WeekReview } from '@/domain/insights';
import { useTheme } from '@/theme/ThemeProvider';
import type { Weekday } from '@/types/schema';

export interface WeekReviewCardProps {
  review: WeekReview;
  summary: string;
}

/** "월요일" for a weekday key, or "–" when the week has no best/worst day. */
function weekdayName(weekday: Weekday | null): string {
  return weekday === null ? '–' : `${WEEKDAY_LABELS[weekday]}요일`;
}

/** "+12%p" / "−5%p" / "0%p" / "–" — the prior-week delta as a signed readout. */
function deltaLabel(deltaPct: number | null): string {
  if (deltaPct === null) return '–';
  if (deltaPct > 0) return `+${deltaPct}%p`;
  if (deltaPct < 0) return `−${Math.abs(deltaPct)}%p`;
  return '0%p';
}

export function WeekReviewCard({ review, summary }: WeekReviewCardProps) {
  const { color, font, space } = useTheme();
  // Only a strict gain is positive (success); flat, loss, and "no prior week" are neutral.
  const deltaColor = review.deltaPct !== null && review.deltaPct > 0 ? color.success : color.fgMuted;

  return (
    <Card style={{ gap: space.s4 }}>
      <Text
        testID="week-review-card"
        style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        주간 요약
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.s2 }}>
        <Text
          testID="week-review-completed-days"
          style={{
            color: color.fg,
            fontSize: font.display.size,
            fontWeight: font.display.weight,
            fontVariant: font.numeric.fontVariant,
          }}>
          {review.completedDays}
        </Text>
        <Text style={{ color: color.fgMuted, fontSize: font.body.size, paddingBottom: space.s1 }}>
          일 완료 · 활동 {review.activeDays}일
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: space.s5 }}>
        <Metric label="가장 잘 지킨 요일" value={weekdayName(review.topWeekday)} />
        <Metric label="가장 못 지킨 요일" value={weekdayName(review.missedWeekday)} />
        <Metric label="지난주 대비" value={deltaLabel(review.deltaPct)} valueColor={deltaColor} />
      </View>

      <Text testID="week-review-summary" style={{ color: color.fgMuted, fontSize: font.body.size }}>
        {summary}
      </Text>
    </Card>
  );
}

interface MetricProps {
  label: string;
  value: string;
  valueColor?: string;
}

function Metric({ label, value, valueColor }: MetricProps) {
  const { color, font, space } = useTheme();
  return (
    <View style={{ gap: space.s1 }}>
      <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>{label}</Text>
      <Text
        style={{
          color: valueColor ?? color.fg,
          fontSize: font.body.size,
          fontWeight: '600',
          fontVariant: font.numeric.fontVariant,
        }}>
        {value}
      </Text>
    </View>
  );
}
