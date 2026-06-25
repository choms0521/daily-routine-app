/**
 * Category chip (PRD 5.1 / 6.1). Color encodes COMPLETION, not category: idle is
 * achromatic (chipIdleBg/chipIdleFg) for both aerobic and anaerobic; only a completed
 * chip lights up Toss Blue (primaryWeak bg + primary fg). Category is shown by the label
 * text alone. Tapping the chip toggles the whole category; the chevron expands the list.
 *
 * Stage 5 (PRD 6.3 / spec stage-5 §3.1–3.2): tapping bounces the chip (scale 0.96→1.0) and
 * the idle↔done color transition tweens over ~175ms. Animation is display-only; completion
 * is still derived from the store `isDone` prop, not the animated value.
 */
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/schema';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CategoryChipProps = {
  category: Category;
  isDone: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
};

const LABELS: Record<Category, string> = { aerobic: '유산소', anaerobic: '무산소' };

export function CategoryChip({ category, isDone, expanded, onToggle, onExpand }: CategoryChipProps) {
  const { color, font, space, radius } = useTheme();
  const scale = useSharedValue(1);
  const progress = useSharedValue(isDone ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isDone ? 1 : 0, { duration: 175 });
  }, [isDone, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [color.chipIdleBg, color.primaryWeak]),
  }));
  const fgStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [color.chipIdleFg, color.primary]),
  }));

  const handleToggle = () => {
    // Optimistic visual feedback: bounce immediately, independent of the store write.
    scale.value = withSequence(withTiming(0.96, { duration: 80 }), withSpring(1, { damping: 12 }));
    onToggle();
  };

  return (
    <AnimatedPressable
      testID={`chip-${category}`}
      onPress={handleToggle}
      accessibilityRole="button"
      accessibilityState={{ selected: isDone }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s2,
          alignSelf: 'flex-start',
          paddingHorizontal: space.s3,
          paddingVertical: space.s2,
          borderRadius: radius.chip,
        },
        containerStyle,
      ]}>
      <Animated.Text style={[{ fontSize: font.body.size, fontWeight: '600' }, fgStyle]}>
        {LABELS[category]}
      </Animated.Text>
      {isDone ? <Animated.Text style={[{ fontSize: font.body.size }, fgStyle]}>✓</Animated.Text> : null}
      <Pressable
        testID={`chip-${category}-expand`}
        onPress={(e) => {
          // Isolate expand from the outer chip toggle: on web a nested Pressable press can
          // bubble to the parent and fire onToggle. Native already isolates via the
          // responder system; stopPropagation makes it correct cross-platform.
          e?.stopPropagation?.();
          onExpand();
        }}
        hitSlop={8}
        accessibilityRole="button">
        <Animated.Text style={[{ fontSize: font.body.size }, fgStyle]}>{expanded ? '∧' : '∨'}</Animated.Text>
      </Pressable>
    </AnimatedPressable>
  );
}
