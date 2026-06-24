/**
 * Expanded exercise list (PRD 5.2). Each exercise shows its name, a read-only set caption
 * (e.g. "4 × 한계-2"), and a boolean checkbox. Per-set numeric input is a v1 non-goal
 * (PRD 11 v2), so there are no rep/duration input fields — checks are boolean toggles only.
 */
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { ExerciseSlot } from '@/types/schema';

export type ExerciseListProps = {
  slots: ExerciseSlot[];
  checks: Record<string, boolean>;
  onCheck: (slotId: string) => void;
};

export function ExerciseList({ slots, checks, onCheck }: ExerciseListProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <View style={{ gap: space.s2, paddingTop: space.s1 }}>
      {slots.map((slot) => {
        const checked = checks[slot.slotId] === true;
        return (
          <View
            key={slot.slotId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.s3 }}>
            <Pressable
              testID={`check-${slot.slotId}`}
              onPress={() => onCheck(slot.slotId)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              hitSlop={8}
              style={{
                width: 22,
                height: 22,
                borderRadius: radius.chip / 2,
                borderWidth: 2,
                borderColor: checked ? color.primary : color.border,
                backgroundColor: checked ? color.primary : color.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {checked ? <Text style={{ color: color.bg, fontSize: 14 }}>✓</Text> : null}
            </Pressable>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: color.fg, fontSize: font.body.size }}>{slot.name}</Text>
              <Text style={{ color: color.fgSubtle, fontSize: font.caption.size, fontVariant: font.numeric.fontVariant }}>
                {slot.sets}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
