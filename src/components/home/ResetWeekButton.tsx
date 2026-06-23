/**
 * Reset-week button (PRD 5.10). Always targets the currently viewed week. A confirm step
 * guards the destructive action (AC-5.10.2); the wording names this/past week so the label
 * and effect agree. The actual reset (logs-only) is the store's resetWeek, passed in.
 */
import { Alert, Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function resetConfirmMessage(isCurrentWeek: boolean): string {
  const which = isCurrentWeek ? '이번 주를 초기화합니다' : '과거 주를 초기화합니다';
  return `${which}. 이 주의 체크 기록이 모두 지워집니다. 루틴 자체는 변경되지 않습니다.`;
}

export type ResetWeekButtonProps = { isCurrentWeek: boolean; onConfirm: () => void };

export function ResetWeekButton({ isCurrentWeek, onConfirm }: ResetWeekButtonProps) {
  const { color, font, space } = useTheme();
  const press = () => {
    Alert.alert('주 초기화', resetConfirmMessage(isCurrentWeek), [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: onConfirm },
    ]);
  };
  return (
    <Pressable
      testID="reset-week-btn"
      onPress={press}
      style={{ alignSelf: 'center', paddingVertical: space.s3, paddingHorizontal: space.s4 }}>
      <Text style={{ color: color.danger, fontSize: font.body.size }}>보고 있는 주 초기화</Text>
    </Pressable>
  );
}
