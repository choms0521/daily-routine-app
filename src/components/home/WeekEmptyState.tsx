/**
 * Empty-week state (PRD 10.1 Q6). Shown when the viewed week had no active routine, i.e.
 * weekProgress returns total === 0. Wording is provisional (Q6 unresolved) and is
 * finalized in Stage 5 polish.
 */
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function WeekEmptyState() {
  const { color, font, space } = useTheme();
  return (
    <View style={{ paddingVertical: space.s6, alignItems: 'center', gap: space.s2 }}>
      <Text style={{ color: color.fgMuted, fontSize: font.body.size, textAlign: 'center' }}>
        이 주에는 활성 루틴이 없었습니다.
      </Text>
    </View>
  );
}
