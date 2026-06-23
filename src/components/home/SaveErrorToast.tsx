/**
 * Optimistic-save failure toast (PRD 6.3 / 8.3). The UI keeps the optimistic change; this
 * only surfaces that persistence failed. Subscribes to the store's saveError and shows a
 * danger-toned banner. A friendly message is shown (the raw error is not leaked to the UI).
 */
import { Text, View } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export function SaveErrorToast() {
  const saveError = useAppStore((s) => s.saveError);
  const { color, font, space, radius } = useTheme();
  if (saveError === null) return null;
  return (
    <View
      testID="save-error-toast"
      style={{
        position: 'absolute',
        left: space.s5,
        right: space.s5,
        bottom: space.s6,
        backgroundColor: color.danger,
        borderRadius: radius.card,
        paddingVertical: space.s3,
        paddingHorizontal: space.s4,
      }}>
      <Text style={{ color: color.bg, fontSize: font.body.size }}>
        저장에 실패했습니다. 변경 내용은 화면에 유지되며, 잠시 후 다시 시도해 주세요.
      </Text>
    </View>
  );
}
