/**
 * Editor top bar: a close control, the screen title, and the single primary save CTA
 * (PRD 6.3 — one blue CTA per screen). Save is disabled until the draft is saveable.
 */
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface EditorTopBarProps {
  title: string;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EditorTopBar({ title, canSave, onClose, onSave }: EditorTopBarProps) {
  const { color, font, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space.s5,
        paddingVertical: space.s3,
        borderBottomWidth: 1,
        borderBottomColor: color.border,
      }}>
      <Pressable testID="editor-close" onPress={onClose} accessibilityRole="button" hitSlop={8}>
        <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>닫기</Text>
      </Pressable>
      <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        {title}
      </Text>
      <Pressable
        testID="editor-save"
        onPress={onSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        hitSlop={8}>
        <Text
          style={{
            color: canSave ? color.primary : color.fgSubtle,
            fontSize: font.body.size,
            fontWeight: '700',
          }}>
          저장
        </Text>
      </Pressable>
    </View>
  );
}
