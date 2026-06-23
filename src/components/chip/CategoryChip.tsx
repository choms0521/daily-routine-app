/**
 * Category chip (PRD 5.1 / 6.1). Color encodes COMPLETION, not category: idle is
 * achromatic (chipIdleBg/chipIdleFg) for both aerobic and anaerobic; only a completed
 * chip lights up Toss Blue (primaryWeak bg + primary fg). Category is shown by the label
 * text alone. Tapping the chip toggles the whole category; the chevron expands the list.
 */
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/schema';

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
  const fg = isDone ? color.primary : color.chipIdleFg;
  return (
    <Pressable
      testID={`chip-${category}`}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ selected: isDone }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.s2,
        alignSelf: 'flex-start',
        paddingHorizontal: space.s3,
        paddingVertical: space.s2,
        borderRadius: radius.chip,
        backgroundColor: isDone ? color.primaryWeak : color.chipIdleBg,
      }}>
      <Text style={{ color: fg, fontSize: font.body.size, fontWeight: '600' }}>{LABELS[category]}</Text>
      {isDone ? <Text style={{ color: fg, fontSize: font.body.size }}>✓</Text> : null}
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
        <Text style={{ color: fg, fontSize: font.body.size }}>{expanded ? '∧' : '∨'}</Text>
      </Pressable>
    </Pressable>
  );
}
