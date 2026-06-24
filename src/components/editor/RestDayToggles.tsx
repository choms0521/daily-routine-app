/**
 * Rest-day chips (spec stage-3 §3.1). Seven toggle chips (Mon..Sun); a selected chip means
 * that weekday is a rest day. Rest days are version data, not a calendar fact (PRD D8.6).
 */
import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/constants/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { WEEKDAYS, type Weekday } from '@/types/schema';

export interface RestDayTogglesProps {
  restDays: Weekday[];
  onToggle: (weekday: Weekday) => void;
}

export function RestDayToggles({ restDays, onToggle }: RestDayTogglesProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.s2, flexWrap: 'wrap' }}>
      {WEEKDAYS.map((weekday) => {
        const isRest = restDays.includes(weekday);
        return (
          <Pressable
            key={weekday}
            testID={`rest-toggle-${weekday}`}
            onPress={() => onToggle(weekday)}
            accessibilityRole="button"
            accessibilityState={{ selected: isRest }}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.full,
              backgroundColor: isRest ? color.primaryWeak : color.chipIdleBg,
            }}>
            <Text
              style={{
                color: isRest ? color.primary : color.chipIdleFg,
                fontSize: font.body.size,
                fontWeight: isRest ? '700' : '400',
              }}>
              {WEEKDAY_LABELS[weekday]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
