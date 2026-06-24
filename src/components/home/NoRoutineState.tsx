/**
 * First-run empty state (Stage 3): the user has no routines at all. Distinct from
 * WeekEmptyState (a week with no active routine) — this guides into creating the first
 * routine via the editor, which is the Stage 3 entry that replaces the old dev seed.
 */
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

export function NoRoutineState() {
  const { color, font, space, radius } = useTheme();
  return (
    <View testID="no-routine-state" style={{ paddingVertical: space.s6, alignItems: 'center', gap: space.s4 }}>
      <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        아직 루틴이 없습니다
      </Text>
      <Text style={{ color: color.fgMuted, fontSize: font.body.size, textAlign: 'center' }}>
        나만의 주간 운동 루틴을 만들어{'\n'}매일 체크해 보세요.
      </Text>
      <Pressable
        testID="create-first-routine-btn"
        onPress={() => router.push('/editor/new')}
        accessibilityRole="button"
        style={{
          marginTop: space.s2,
          backgroundColor: color.primary,
          borderRadius: radius.card,
          paddingHorizontal: space.s6,
          paddingVertical: space.s4,
        }}>
        <Text style={{ color: color.bg, fontSize: font.body.size, fontWeight: '600' }}>
          루틴 만들기
        </Text>
      </Pressable>
    </View>
  );
}
