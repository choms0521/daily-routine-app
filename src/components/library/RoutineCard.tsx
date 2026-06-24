/**
 * Library routine card (spec stage-3 §Day1). Shows the routine name, its version count, and
 * an active badge when this is the selected active routine. The whole card opens the actions
 * sheet (activate / edit / duplicate / hide / delete / share).
 */
import { Pressable, Text, View } from 'react-native';

import type { LibraryRoutineVM } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';

export interface RoutineCardProps {
  routine: LibraryRoutineVM;
  onPress: () => void;
}

export function RoutineCard({ routine, onPress }: RoutineCardProps) {
  const { color, font, space, radius, shadow } = useTheme();
  return (
    <Pressable
      testID={`routine-card-${routine.id}`}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: color.surfaceElevated,
        borderRadius: radius.card,
        paddingHorizontal: space.s4,
        paddingVertical: space.s4,
        ...shadow.card,
      }}>
      <View style={{ flexShrink: 1, gap: space.s1 }}>
        <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
          {routine.name}
        </Text>
        <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>
          버전 {routine.versionCount}개
        </Text>
      </View>
      {routine.isActive ? (
        <View
          testID={`active-badge-${routine.id}`}
          style={{
            paddingHorizontal: space.s3,
            paddingVertical: space.s1,
            borderRadius: radius.full,
            backgroundColor: color.primaryWeak,
          }}>
          <Text style={{ color: color.primary, fontSize: font.caption.size, fontWeight: '600' }}>
            활성
          </Text>
        </View>
      ) : (
        <Text style={{ color: color.fgSubtle, fontSize: font.subtitle.size }}>⋯</Text>
      )}
    </Pressable>
  );
}
