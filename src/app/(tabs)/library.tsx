/**
 * Library screen (spec stage-3 §Day1). Lists the user's (non-hidden) routines with the
 * active badge and a per-routine actions menu, plus a "새 루틴" entry into the editor.
 *
 * Activation rules live in the store; the screen only decides whether to confirm: switching
 * away from an already-active routine shows the confirm sheet (today stays, new applies
 * tomorrow); first activation (nothing active yet) is immediate. Delete/hide guards surface
 * their rejection reason via an alert. Share is an entry point only (Stage 4).
 */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { RoutineActionsSheet } from '@/components/library/RoutineActionsSheet';
import { RoutineCard } from '@/components/library/RoutineCard';
import { ActivationConfirmSheet } from '@/components/sheet/ActivationConfirmSheet';
import { todayKey } from '@/domain/clock';
import {
  selectActiveRoutineId,
  selectLibraryRoutines,
  type LibraryRoutineVM,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function LibraryScreen() {
  const { color, font, space } = useTheme();
  const state = useAppStore((s) => s.state);
  const setActiveRoutine = useAppStore((s) => s.setActiveRoutine);
  const duplicateRoutine = useAppStore((s) => s.duplicateRoutine);
  const hideRoutine = useAppStore((s) => s.hideRoutine);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);

  const routines = selectLibraryRoutines(state);
  const activeId = selectActiveRoutineId(state);

  const [menuRoutine, setMenuRoutine] = useState<LibraryRoutineVM | null>(null);
  const [switchTarget, setSwitchTarget] = useState<LibraryRoutineVM | null>(null);

  const activate = (vm: LibraryRoutineVM) => {
    setMenuRoutine(null);
    if (activeId === null) {
      setActiveRoutine(vm.id, todayKey()); // first activation -> immediate (effective today)
    } else {
      setSwitchTarget(vm); // a routine is already active -> confirm the tomorrow switch
    }
  };

  const remove = (vm: LibraryRoutineVM) => {
    setMenuRoutine(null);
    Alert.alert('루틴 삭제', `'${vm.name}'을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const result = deleteRoutine(vm.id);
          if (!result.ok) Alert.alert('삭제할 수 없습니다', result.reason);
        },
      },
    ]);
  };

  const hide = (vm: LibraryRoutineVM) => {
    setMenuRoutine(null);
    if (vm.isActive) {
      Alert.alert('루틴 숨김', '활성 루틴입니다. 숨기면 라이브러리에 보이지 않습니다. 계속할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '숨김', onPress: () => hideRoutine(vm.id) },
      ]);
    } else {
      hideRoutine(vm.id);
    }
  };

  const share = () => {
    setMenuRoutine(null);
    Alert.alert('공유', '공유 기능은 다음 업데이트에서 제공됩니다.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.s6, gap: space.s4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
            내 루틴
          </Text>
          <Pressable
            testID="new-routine-btn"
            onPress={() => router.push('/editor/new')}
            accessibilityRole="button"
            hitSlop={8}>
            <Text style={{ color: color.primary, fontSize: font.body.size, fontWeight: '600' }}>
              + 새 루틴
            </Text>
          </Pressable>
        </View>

        {routines.length === 0 ? (
          <View style={{ paddingVertical: space.s6, alignItems: 'center', gap: space.s2 }}>
            <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>
              아직 루틴이 없습니다.
            </Text>
            <Text style={{ color: color.fgSubtle, fontSize: font.caption.size }}>
              새 루틴을 만들어 시작해 보세요.
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.s3 }}>
            {routines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} onPress={() => setMenuRoutine(routine)} />
            ))}
          </View>
        )}
      </ScrollView>

      <RoutineActionsSheet
        visible={menuRoutine !== null}
        routine={menuRoutine}
        onClose={() => setMenuRoutine(null)}
        onActivate={() => menuRoutine && activate(menuRoutine)}
        onEdit={() => {
          const id = menuRoutine?.id;
          setMenuRoutine(null);
          if (id) router.push(`/editor/${id}`);
        }}
        onDuplicate={() => {
          if (menuRoutine) duplicateRoutine(menuRoutine.id);
          setMenuRoutine(null);
        }}
        onHide={() => menuRoutine && hide(menuRoutine)}
        onDelete={() => menuRoutine && remove(menuRoutine)}
        onShare={share}
      />

      <ActivationConfirmSheet
        visible={switchTarget !== null}
        routineName={switchTarget?.name ?? ''}
        onConfirm={() => {
          if (switchTarget) setActiveRoutine(switchTarget.id, todayKey());
          setSwitchTarget(null);
        }}
        onCancel={() => setSwitchTarget(null)}
      />
    </SafeAreaView>
  );
}
