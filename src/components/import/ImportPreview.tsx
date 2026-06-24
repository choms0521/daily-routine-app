/**
 * Import preview (spec stage-4 §5.2, PRD 5.5). Renders a decoded share payload before the user
 * commits: routine name, rest days, and every weekday's aerobic/anaerobic exercises with sets.
 * Purely presentational — it shows the payload, the screen owns the "add to library" decision.
 */
import { Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/constants/labels';
import type { SharePayload } from '@/domain/share';
import { useTheme } from '@/theme/ThemeProvider';
import { WEEKDAYS } from '@/types/schema';

export function ImportPreview({ payload }: { payload: SharePayload }) {
  const { color, font, space, radius } = useTheme();
  const { name, version } = payload.routine;
  const restSet = new Set(version.restDays);

  return (
    <View testID="import-preview" style={{ gap: space.s3 }}>
      <Text
        style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        {name}
      </Text>
      <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>
        휴식일:{' '}
        {restSet.size > 0
          ? WEEKDAYS.filter((w) => restSet.has(w))
              .map((w) => WEEKDAY_LABELS[w])
              .join(', ')
          : '없음'}
      </Text>

      {WEEKDAYS.map((weekday) => {
        const day = version.days[weekday];
        const rows = [
          ...day.aerobic.map((s) => ({ cat: '유산소', ...s })),
          ...day.anaerobic.map((s) => ({ cat: '무산소', ...s })),
        ];
        return (
          <View
            key={weekday}
            style={{
              backgroundColor: color.surface,
              borderRadius: radius.chip,
              padding: space.s3,
              gap: space.s1,
            }}>
            <Text style={{ color: color.fg, fontSize: font.body.size, fontWeight: '600' }}>
              {WEEKDAY_LABELS[weekday]}
              {restSet.has(weekday) ? ' · 휴식' : ''}
            </Text>
            {rows.length === 0 ? (
              <Text style={{ color: color.fgSubtle, fontSize: font.caption.size }}>—</Text>
            ) : (
              rows.map((row, i) => (
                <Text
                  key={`${row.cat}-${i}`}
                  style={{ color: color.fgMuted, fontSize: font.caption.size }}>
                  {row.cat} · {row.name}
                  {row.sets ? `  ${row.sets}` : ''}
                </Text>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}
