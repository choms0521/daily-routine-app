/**
 * Routine actions sheet (spec stage-3 §Day1). The per-routine menu: activate (hidden when
 * already active), edit, duplicate, hide, delete, share. Share is an entry point only — the
 * actual serialization lands in Stage 4. The screen owns the handlers and the confirmations.
 */
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/sheet/BottomSheet';
import type { LibraryRoutineVM } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';

export interface RoutineActionsSheetProps {
  visible: boolean;
  routine: LibraryRoutineVM | null;
  onClose: () => void;
  onActivate: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onHide: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function RoutineActionsSheet({
  visible,
  routine,
  onClose,
  onActivate,
  onEdit,
  onDuplicate,
  onHide,
  onDelete,
  onShare,
}: RoutineActionsSheetProps) {
  const { color, font, space } = useTheme();
  if (routine === null) return null;

  const rows: { key: string; label: string; onPress: () => void; danger?: boolean; hidden?: boolean }[] = [
    { key: 'activate', label: '활성으로 설정', onPress: onActivate, hidden: routine.isActive },
    { key: 'edit', label: '편집', onPress: onEdit },
    { key: 'duplicate', label: '복제', onPress: onDuplicate },
    { key: 'share', label: '공유', onPress: onShare },
    { key: 'hide', label: '숨김', onPress: onHide },
    { key: 'delete', label: '삭제', onPress: onDelete, danger: true },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="routine-actions-sheet">
      <Text
        style={{
          color: color.fg,
          fontSize: font.subtitle.size,
          fontWeight: font.subtitle.weight,
          marginBottom: space.s2,
        }}>
        {routine.name}
      </Text>
      <View>
        {rows
          .filter((row) => !row.hidden)
          .map((row) => (
            <Pressable
              key={row.key}
              testID={`routine-action-${row.key}`}
              onPress={row.onPress}
              accessibilityRole="button"
              style={{ paddingVertical: space.s4 }}>
              <Text
                style={{
                  color: row.danger ? color.danger : color.fg,
                  fontSize: font.body.size,
                }}>
                {row.label}
              </Text>
            </Pressable>
          ))}
      </View>
    </BottomSheet>
  );
}
