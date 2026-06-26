/**
 * One calendar cell (spec a1 §4). Display-only: its color is a pure token mapping of the
 * DayStatus the domain already classified — no recomputation. A 'rest' cell is a neutral
 * surface with a small border dot; a 'none' day is not shown (transparent). The "today"
 * cell gets a primary outline. Colors/radii are tokens only (no hardcoded values).
 */
import { Pressable, Text, View } from 'react-native';

import type { DayStatus } from '@/domain/insights';
import { useTheme } from '@/theme/ThemeProvider';
import type { Tokens } from '@/theme/tokens';

export interface DayCellProps {
  status: DayStatus;
  label?: string;
  isToday?: boolean;
  size?: number;
  onPress?: () => void;
  testID?: string;
}

/** status -> background token (spec a1 §4). 'none' is transparent (not shown). */
function backgroundFor(status: DayStatus, color: Tokens['color']): string {
  switch (status) {
    case 'complete':
      return color.primary;
    case 'partial':
      return color.primaryWeak;
    case 'empty':
      return color.chipIdleBg;
    case 'rest':
      return color.surface;
    case 'none':
      return 'transparent';
  }
}

/** Date-number color that reads on each background. 'complete' is the only solid fill. */
function labelColorFor(status: DayStatus, color: Tokens['color']): string {
  if (status === 'complete') return color.bg; // white on Toss Blue
  if (status === 'rest' || status === 'none') return color.fgMuted;
  return color.fg;
}

export function DayCell({ status, label, isToday = false, size = 28, onPress, testID }: DayCellProps) {
  const { color, radius, font } = useTheme();
  const Container = onPress ? Pressable : View;
  return (
    <Container
      testID={testID}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: radius.chip,
        backgroundColor: backgroundFor(status, color),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isToday ? 2 : status === 'rest' ? 1 : 0,
        borderColor: isToday ? color.primary : color.border,
      }}>
      {status === 'none' ? null : status === 'rest' ? (
        // Rest day: a neutral surface marked by a small border dot (spec a1 §4), no number.
        <View
          testID={testID ? `${testID}-rest-dot` : undefined}
          style={{
            width: 4,
            height: 4,
            borderRadius: radius.full,
            backgroundColor: color.border,
          }}
        />
      ) : label ? (
        <Text style={{ color: labelColorFor(status, color), fontSize: font.caption.size }}>{label}</Text>
      ) : null}
    </Container>
  );
}
