/**
 * Home screen (PRD 6.4) — Day 1 skeleton. SafeAreaView + ScrollView shell on the PRD
 * theme. The real content (HomeHeader, DayCard[], ProgressBar, StreakBadge) is assembled
 * from Day 2 onward; this stage proves the route + theme render end to end.
 */
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const { color, space, font } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.s6, gap: space.s5 }}>
        <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
          오늘의 루틴
        </Text>
        <View
          style={{
            backgroundColor: color.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: color.border,
            padding: space.s4,
            gap: space.s2,
          }}>
          <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
            홈 화면 준비 중
          </Text>
          <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>
            Stage 2에서 주간 카드·진행률·스트릭을 채워 나갑니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
