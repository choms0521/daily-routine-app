/**
 * One category section in the editor (유산소 / 무산소). Lists the draft slots for the
 * selected weekday with inline remove and reorder controls, plus an "운동 추가" button that
 * opens the exercise-add sheet for this category. Slots here are SlotDraft (no slotId yet).
 */
import { Pressable, Text, View } from 'react-native';

import { CATEGORY_LABELS } from '@/constants/labels';
import type { SlotDraft } from '@/domain/routineDraft';
import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/schema';

export interface CategorySectionProps {
  category: Category;
  slots: SlotDraft[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}

export function CategorySection({ category, slots, onAdd, onRemove, onMove }: CategorySectionProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <View style={{ gap: space.s2 }} testID={`category-section-${category}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: color.fg, fontSize: font.body.size, fontWeight: '600' }}>
          {CATEGORY_LABELS[category]}
        </Text>
        <Pressable
          testID={`add-exercise-${category}`}
          onPress={onAdd}
          accessibilityRole="button"
          hitSlop={8}>
          <Text style={{ color: color.primary, fontSize: font.body.size, fontWeight: '600' }}>
            + 운동 추가
          </Text>
        </Pressable>
      </View>

      {slots.length === 0 ? (
        <Text style={{ color: color.fgSubtle, fontSize: font.caption.size }}>
          추가된 운동이 없습니다.
        </Text>
      ) : (
        slots.map((slot, index) => (
          <View
            // Rows hold no local state, so a positional key is correct: a reorder updates
            // props in place instead of remounting (avoids the index+name churn).
            key={`${category}-${index}`}
            testID={`slot-row-${category}-${index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.s2,
              backgroundColor: color.surface,
              borderRadius: radius.chip,
              paddingHorizontal: space.s3,
              paddingVertical: space.s2,
            }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: color.fg, fontSize: font.body.size }}>{slot.name}</Text>
              {slot.sets.length > 0 ? (
                <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>{slot.sets}</Text>
              ) : null}
            </View>
            <Pressable
              testID={`slot-up-${category}-${index}`}
              onPress={() => onMove(index, -1)}
              disabled={index === 0}
              accessibilityRole="button"
              hitSlop={6}>
              <Text style={{ color: index === 0 ? color.fgSubtle : color.fgMuted, fontSize: font.body.size }}>
                ↑
              </Text>
            </Pressable>
            <Pressable
              testID={`slot-down-${category}-${index}`}
              onPress={() => onMove(index, 1)}
              disabled={index === slots.length - 1}
              accessibilityRole="button"
              hitSlop={6}>
              <Text
                style={{
                  color: index === slots.length - 1 ? color.fgSubtle : color.fgMuted,
                  fontSize: font.body.size,
                }}>
                ↓
              </Text>
            </Pressable>
            <Pressable
              testID={`slot-remove-${category}-${index}`}
              onPress={() => onRemove(index)}
              accessibilityRole="button"
              hitSlop={6}>
              <Text style={{ color: color.danger, fontSize: font.body.size }}>✕</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}
