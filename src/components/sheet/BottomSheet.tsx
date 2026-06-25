/**
 * Bottom sheet (PRD 6.3): top corners rounded 20px, a drag handle, dimmed backdrop, and
 * drag-to-dismiss. Built on the RN Modal (slide-up + transparent) so entrance/exit stay the
 * Stage 2-4 behavior; Stage 5 only adds the drag-down gesture, dim that tracks the drag, and
 * a threshold snap. Close still also works by tapping the backdrop.
 *
 * Modal mounts in a separate native layer outside the app's GestureHandlerRootView, so the
 * sheet re-wraps its own root here (gesture-handler requirement for gestures inside a Modal).
 * The Pan is on the handle only — keeping it off the body avoids fighting the ScrollView and
 * Pressables inside sheets like ExerciseAddSheet.
 */
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Drag past this many px downward to dismiss; below it the sheet springs back.
const CLOSE_THRESHOLD = 120;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

export function BottomSheet({ visible, onClose, children, testID }: BottomSheetProps) {
  const { color, radius, space, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  // The Modal's slide handles entrance; we only own drag offset, so reset it on each open
  // (otherwise a sheet reopened after a drag-dismiss would start partway down).
  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY); // downward only
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_THRESHOLD) {
        // runOnJS: calling the JS onClose directly from this worklet crashes / silently no-ops.
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 18 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - translateY.value / 500) }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AnimatedPressable
          testID={testID ? `${testID}-backdrop` : undefined}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }, dimStyle]}
        />
        <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View
            testID={testID}
            style={[
              {
                backgroundColor: color.surfaceElevated,
                borderTopLeftRadius: radius.sheet,
                borderTopRightRadius: radius.sheet,
                paddingHorizontal: space.s5,
                paddingBottom: space.s5 + insets.bottom,
                ...shadow.sheet,
              },
              sheetStyle,
            ]}>
            <GestureDetector gesture={pan}>
              <View style={{ paddingTop: space.s3, paddingBottom: space.s4, alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: radius.full,
                    backgroundColor: color.border,
                  }}
                />
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
