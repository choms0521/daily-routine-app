/**
 * Exercise-add sheet (spec stage-3 §3.2). Opened per category from the editor. Tapping a
 * catalog item pre-fills the name and a suggested set string; both are editable, and a
 * custom name can be typed instead. Confirm commits one SlotDraft{ name, sets } — a catalog
 * pick and a custom entry are indistinguishable in the result (the catalog leaves no trace).
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/sheet/BottomSheet';
import { catalogFor } from '@/constants/exerciseCatalog';
import type { SlotDraft } from '@/domain/routineDraft';
import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/schema';

export interface ExerciseAddSheetProps {
  visible: boolean;
  category: Category;
  onClose: () => void;
  onAdd: (slot: SlotDraft) => void;
}

const CATEGORY_LABEL: Record<Category, string> = { aerobic: '유산소', anaerobic: '무산소' };

export function ExerciseAddSheet({ visible, category, onClose, onAdd }: ExerciseAddSheetProps) {
  const { color, font, space, radius } = useTheme();
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');

  const reset = () => {
    setName('');
    setSets('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const canAdd = name.trim().length > 0;
  const add = () => {
    if (!canAdd) return;
    onAdd({ name: name.trim(), sets: sets.trim() });
    reset();
    onClose();
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.chip,
    paddingHorizontal: space.s3,
    paddingVertical: space.s3,
    fontSize: font.body.size,
    color: color.fg,
  } as const;

  return (
    <BottomSheet visible={visible} onClose={close} testID="exercise-add-sheet">
      <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        {CATEGORY_LABEL[category]} 운동 추가
      </Text>

      <Text style={{ color: color.fgMuted, fontSize: font.caption.size, marginTop: space.s4, marginBottom: space.s2 }}>
        기본 운동에서 선택
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s2 }}>
        {catalogFor(category).map((item) => (
          <Pressable
            key={item.name}
            testID={`catalog-${item.name}`}
            onPress={() => {
              setName(item.name);
              setSets(item.defaultSets);
            }}
            style={{
              paddingHorizontal: space.s3,
              paddingVertical: space.s2,
              borderRadius: radius.chip,
              backgroundColor: color.chipIdleBg,
            }}>
            <Text style={{ color: color.chipIdleFg, fontSize: font.body.size }}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ gap: space.s2, marginTop: space.s4 }}>
        <TextInput
          testID="exercise-name-input"
          value={name}
          onChangeText={setName}
          placeholder="운동 이름 (직접 입력 가능)"
          placeholderTextColor={color.fgSubtle}
          style={inputStyle}
        />
        <TextInput
          testID="exercise-sets-input"
          value={sets}
          onChangeText={setSets}
          placeholder="세트 (예: 4 × 12, 30분)"
          placeholderTextColor={color.fgSubtle}
          style={inputStyle}
        />
      </View>

      <Pressable
        testID="exercise-add-confirm"
        onPress={add}
        disabled={!canAdd}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAdd }}
        style={{
          marginTop: space.s4,
          borderRadius: radius.card,
          paddingVertical: space.s4,
          alignItems: 'center',
          backgroundColor: canAdd ? color.primary : color.chipIdleBg,
        }}>
        <Text
          style={{
            color: canAdd ? color.bg : color.fgSubtle,
            fontSize: font.body.size,
            fontWeight: '600',
          }}>
          추가
        </Text>
      </Pressable>
    </BottomSheet>
  );
}
