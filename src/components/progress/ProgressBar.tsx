/**
 * Progress bar (PRD 5.6 / 6.4). Display-only: it renders the { done, total, pct } that
 * domain/progress.weekProgress already computed — no recomputation or re-rounding here
 * (architecture appendix rule 3). Label format matches the PRD concept "5 / 8 · 63%".
 *
 * The fill width tweens when pct changes (PRD 6.3 / spec stage-5 §3.3): the animated value
 * lives only in this display layer; weekProgress stays the pure-domain source of the number.
 */
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

export type ProgressBarProps = { done: number; total: number; pct: number };

export function ProgressBar({ done, total, pct }: ProgressBarProps) {
  const { color, space, font, radius } = useTheme();
  const widthPct = useSharedValue(pct);
  useEffect(() => {
    widthPct.value = withTiming(pct, { duration: 300 });
  }, [pct, widthPct]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${widthPct.value}%` }));
  return (
    <View style={{ gap: space.s2 }}>
      <View
        style={{
          height: 8,
          backgroundColor: color.chipIdleBg,
          borderRadius: radius.full,
          overflow: 'hidden',
        }}>
        <Animated.View
          testID="progress-fill"
          style={[
            {
              height: '100%',
              backgroundColor: color.primary,
              borderRadius: radius.full,
            },
            fillStyle,
          ]}
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
