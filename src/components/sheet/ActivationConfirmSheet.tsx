/**
 * Activation switch confirmation (spec stage-3 §5.3, PRD journey B-4). Shown only when a
 * different routine is already active: the switch keeps today on the current routine and
 * applies the new one from tomorrow (D8.8). First activation skips this sheet (immediate).
 */
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/sheet/BottomSheet';
import { instrumentalParticle } from '@/domain/korean';
import { useTheme } from '@/theme/ThemeProvider';

export interface ActivationConfirmSheetProps {
  visible: boolean;
  routineName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActivationConfirmSheet({
  visible,
  routineName,
  onConfirm,
  onCancel,
}: ActivationConfirmSheetProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onCancel} testID="activation-confirm-sheet">
      <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        활성 루틴 전환
      </Text>
      <Text style={{ color: color.fgMuted, fontSize: font.body.size, marginTop: space.s3, lineHeight: 22 }}>
        {`'${routineName}'${instrumentalParticle(routineName)} 전환합니다. 오늘은 기존 루틴이 그대로 유지되고, 내일부터 새 루틴이 적용됩니다.`}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.s3, marginTop: space.s5 }}>
        <Pressable
          testID="activation-cancel"
          onPress={onCancel}
          accessibilityRole="button"
          style={{
            flex: 1,
            borderRadius: radius.card,
            paddingVertical: space.s4,
            alignItems: 'center',
            backgroundColor: color.chipIdleBg,
          }}>
          <Text style={{ color: color.fg, fontSize: font.body.size, fontWeight: '600' }}>취소</Text>
        </Pressable>
        <Pressable
          testID="activation-confirm"
          onPress={onConfirm}
          accessibilityRole="button"
          style={{
            flex: 1,
            borderRadius: radius.card,
            paddingVertical: space.s4,
            alignItems: 'center',
            backgroundColor: color.primary,
          }}>
          <Text style={{ color: color.bg, fontSize: font.body.size, fontWeight: '600' }}>전환</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
