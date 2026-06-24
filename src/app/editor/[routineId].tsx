/**
 * Routine editor (spec stage-3 §3). One route, two modes by the `routineId` param:
 *   - 'new' (or an unknown id) -> blank draft; save calls createRoutine.
 *   - an existing id           -> draft seeded from that routine's latest version; save
 *                                 calls editRoutine (a new version, effective tomorrow if
 *                                 the routine is active — today is protected, D8.8).
 *
 * The editor edits a local immutable draft (useRoutineDraft); the store is only touched on
 * save. All version/timeline reasoning lives in the store actions, not here.
 */
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { CategorySection } from '@/components/editor/CategorySection';
import { EditorTopBar } from '@/components/editor/EditorTopBar';
import { RestDayToggles } from '@/components/editor/RestDayToggles';
import { WeekdayTabs } from '@/components/editor/WeekdayTabs';
import { ExerciseAddSheet } from '@/components/sheet/ExerciseAddSheet';
import { draftFromRoutine, emptyDraft } from '@/domain/routineDraft';
import { todayKey } from '@/domain/clock';
import { useAppStore } from '@/store/useAppStore';
import { useRoutineDraft } from '@/hooks/useRoutineDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { CATEGORIES, type Category, type Weekday } from '@/types/schema';

export default function EditorScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { color, font, space } = useTheme();
  const createRoutine = useAppStore((s) => s.createRoutine);
  const editRoutine = useAppStore((s) => s.editRoutine);

  // Resolve the edit target once at mount (the editor doesn't subscribe to the store).
  const existing = useMemo(() => {
    if (routineId === 'new' || routineId === undefined) return undefined;
    return useAppStore.getState().state.routines.find((r) => r.id === routineId);
  }, [routineId]);
  const isNew = existing === undefined;

  const initialDraft = useMemo(
    () => (existing ? draftFromRoutine(existing) : emptyDraft()),
    [existing],
  );
  const { draft, setName, toggleRestDay, addSlot, removeSlot, moveSlot, isSaveable } =
    useRoutineDraft(initialDraft);

  const [selectedWeekday, setSelectedWeekday] = useState<Weekday>('mon');
  const [sheetCategory, setSheetCategory] = useState<Category | null>(null);

  const isRestDay = draft.restDays.includes(selectedWeekday);

  const onSave = () => {
    if (!isSaveable) return;
    if (isNew) {
      createRoutine(draft);
    } else if (JSON.stringify(draft) !== JSON.stringify(initialDraft)) {
      // Skip an unchanged edit so it doesn't append an identical version (and a misleading
      // "applies tomorrow" banner) for no real change.
      editRoutine(routineId as string, draft, todayKey());
    }
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top']}>
      <EditorTopBar
        title={isNew ? '새 루틴' : '루틴 편집'}
        canSave={isSaveable}
        onClose={() => router.back()}
        onSave={onSave}
      />
      <ScrollView contentContainerStyle={{ padding: space.s5, gap: space.s5 }}>
        <View style={{ gap: space.s2 }}>
          <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>루틴 이름</Text>
          <TextInput
            testID="routine-name-input"
            value={draft.name}
            onChangeText={setName}
            placeholder="예: 여름 컨디셔닝"
            placeholderTextColor={color.fgSubtle}
            style={{
              borderWidth: 1,
              borderColor: color.border,
              borderRadius: 10,
              paddingHorizontal: space.s3,
              paddingVertical: space.s3,
              fontSize: font.body.size,
              color: color.fg,
            }}
          />
        </View>

        <View style={{ gap: space.s2 }}>
          <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>휴식일</Text>
          <RestDayToggles restDays={draft.restDays} onToggle={toggleRestDay} />
        </View>

        <View style={{ gap: space.s3 }}>
          <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>요일별 계획</Text>
          <WeekdayTabs
            selected={selectedWeekday}
            restDays={draft.restDays}
            onSelect={setSelectedWeekday}
          />

          {isRestDay ? (
            <View style={{ paddingVertical: space.s5, alignItems: 'center' }}>
              <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>
                휴식일입니다. 이 요일에는 운동을 추가하지 않습니다.
              </Text>
            </View>
          ) : (
            <View style={{ gap: space.s5 }}>
              {CATEGORIES.map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  slots={draft.days[selectedWeekday][category]}
                  onAdd={() => setSheetCategory(category)}
                  onRemove={(index) => removeSlot(selectedWeekday, category, index)}
                  onMove={(index, dir) => moveSlot(selectedWeekday, category, index, dir)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ExerciseAddSheet
        visible={sheetCategory !== null}
        category={sheetCategory ?? 'aerobic'}
        onClose={() => setSheetCategory(null)}
        onAdd={(slot) => {
          if (sheetCategory !== null) addSlot(selectedWeekday, sheetCategory, slot);
        }}
      />
    </SafeAreaView>
  );
}
