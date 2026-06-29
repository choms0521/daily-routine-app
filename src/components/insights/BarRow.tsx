/**
 * BarRow (spec c2 §3): a label + a proportional bar + a "{done} / {total} · {pct}%" readout,
 * reused by both the weekday and the exercise lists. Display-only — it renders the
 * { done, total, pct } that domain/insights already computed and never recomputes the ratio.
 * The bar mirrors ProgressBar's visual language (chipIdleBg track, primary fill, radius.full)
 * but is static (no animation) since these are aggregate, not live, values.
 */
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface BarRowProps {
  label: string;
  done: number;
  total: number;
  pct: number;
  testID?: string;
}

export function BarRow({ label, done, total, pct, testID }: BarRowProps) {
  const { color, space, font, radius } = useTheme();
  return (
    <View testID={testID} style={{ gap: space.s1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.s2 }}>
        <Text style={{ color: color.fg, fontSize: font.body.size }} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={{
            color: color.fgMuted,
            fontSize: font.caption.size,
            fontVariant: font.numeric.fontVariant,
          }}>
          {`${done} / ${total} · ${pct}%`}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: color.chipIdleBg,
          borderRadius: radius.full,
          overflow: 'hidden',
        }}>
        <View
          testID={testID ? `${testID}-fill` : undefined}
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: color.primary,
            borderRadius: radius.full,
          }}
        />
      </View>
    </View>
  );
}
