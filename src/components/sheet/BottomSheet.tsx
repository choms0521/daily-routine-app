/**
 * Bottom sheet (PRD 6.3): top corners rounded 20px, a drag handle, dimmed backdrop.
 * Built on the RN Modal (slide-up + transparent) so it stays Expo Go compatible without a
 * gesture/sheet dependency. v1 has no drag-to-dismiss; tap the backdrop or a close control.
 *
 * Tapping the sheet body must not dismiss it: an inner Pressable with a no-op onPress
 * becomes the touch responder for body taps, so the backdrop's onPress never fires there.
 */
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

export function BottomSheet({ visible, onClose, children, testID }: BottomSheetProps) {
  const { color, radius, space, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        testID={testID ? `${testID}-backdrop` : undefined}
        accessibilityRole="button"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' }}>
        <Pressable
          // Absorbs body taps so they don't reach the backdrop's onClose.
          onPress={() => {}}
          testID={testID}
          style={{
            backgroundColor: color.surfaceElevated,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: space.s5,
            paddingTop: space.s3,
            paddingBottom: space.s5 + insets.bottom,
            ...shadow.sheet,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: color.border,
              marginBottom: space.s4,
            }}
          />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
