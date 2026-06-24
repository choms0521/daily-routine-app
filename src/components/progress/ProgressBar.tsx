/**
 * Progress bar (PRD 5.6 / 6.4). Display-only: it renders the { done, total, pct } that
 * domain/progress.weekProgress already computed — no recomputation or re-rounding here
 * (architecture appendix rule 3). Label format matches the PRD concept "5 / 8 · 63%".
 */
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type ProgressBarProps = { done: number; total: number; pct: number };

export function ProgressBar({ done, total, pct }: ProgressBarProps) {
  const { color, space, font, radius } = useTheme();
  return (
    <View style={{ gap: space.s2 }}>
      <View
        style={{
          height: 8,
          backgroundColor: color.chipIdleBg,
          borderRadius: radius.full,
          overflow: 'hidden',
        }}>
        <View
          testID="progress-fill"
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color.primary,
            borderRadius: radius.full,
          }}
        />
      </View>
      <Text
        style={{
          color: color.fgMuted,
          fontSize: font.body.size,
          fontVariant: font.numeric.fontVariant,
        }}>
        {`${done} / ${total} · ${pct}%`}
      </Text>
    </View>
  );
}
