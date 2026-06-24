/**
 * Weekday selector for the editor (spec stage-3 §3.1). One tab per weekday (Mon..Sun); the
 * selected tab lights up Toss Blue. Rest days carry a small dot so the user can see which
 * days are rest without switching to them.
 */
import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/constants/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { WEEKDAYS, type Weekday } from '@/types/schema';

export interface WeekdayTabsProps {
  selected: Weekday;
  restDays: Weekday[];
  onSelect: (weekday: Weekday) => void;
}

export function WeekdayTabs({ selected, restDays, onSelect }: WeekdayTabsProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.s1 }}>
      {WEEKDAYS.map((weekday) => {
        const isSelected = weekday === selected;
        const isRest = restDays.includes(weekday);
        return (
          <Pressable
            key={weekday}
            testID={`weekday-tab-${weekday}`}
            onPress={() => onSelect(weekday)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: space.s2,
              borderRadius: radius.chip,
              backgroundColor: isSelected ? color.primaryWeak : 'transparent',
            }}>
            <Text
              style={{
                color: isSelected ? color.primary : color.fgMuted,
                fontSize: font.body.size,
                fontWeight: isSelected ? '700' : '400',
              }}>
              {WEEKDAY_LABELS[weekday]}
            </Text>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: radius.full,
                marginTop: space.s1,
                backgroundColor: isRest ? color.fgSubtle : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
