/**
 * Share sheet (spec stage-4 §Day2, PRD 5.5/7.1). Shows a selected routine's current version
 * as three delivery forms: a QR of the import deep link, a copyable deep link, and a copyable
 * code string. When the deep link exceeds the single-frame QR budget the QR is hidden and the
 * code becomes the primary form (PRD D7 fallback).
 *
 * The sheet is presentational: it receives the already-encoded payload (the library serializes
 * the routine's latest version) and never touches the store. Copy uses expo-clipboard.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { BottomSheet } from '@/components/sheet/BottomSheet';
import { buildDeepLink, buildShareCode, isQrAvailable } from '@/domain/share';
import { useTheme } from '@/theme/ThemeProvider';

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  routineName: string;
  /** The serialized (base64url) payload for the routine's current version. */
  encoded: string;
}

type Copied = 'code' | 'link' | null;

export function ShareSheet({ visible, onClose, routineName, encoded }: ShareSheetProps) {
  const { color, font, space, radius } = useTheme();
  const [copied, setCopied] = useState<Copied>(null);

  // Nothing to render until a routine is chosen (encoded is '' when no target).
  if (encoded === '') return null;

  const deepLink = buildDeepLink(encoded);
  const code = buildShareCode(encoded);
  const qrAvailable = isQrAvailable(encoded);

  const close = () => {
    setCopied(null);
    onClose();
  };

  const copy = async (what: 'code' | 'link') => {
    await Clipboard.setStringAsync(what === 'code' ? code : deepLink);
    setCopied(what);
  };

  return (
    <BottomSheet visible={visible} onClose={close} testID="share-sheet">
      <Text
        style={{
          color: color.fg,
          fontSize: font.subtitle.size,
          fontWeight: font.subtitle.weight,
          marginBottom: space.s1,
        }}>
        루틴 공유
      </Text>
      <Text style={{ color: color.fgMuted, fontSize: font.caption.size, marginBottom: space.s4 }}>
        {routineName}
      </Text>

      {qrAvailable ? (
        <View
          testID="qr-view"
          style={{
            alignSelf: 'center',
            padding: space.s4,
            backgroundColor: '#FFFFFF',
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: color.border,
            marginBottom: space.s4,
          }}>
          <QRCode value={deepLink} size={200} />
        </View>
      ) : (
        <View
          testID="qr-fallback"
          style={{
            padding: space.s4,
            backgroundColor: color.surface,
            borderRadius: radius.card,
            marginBottom: space.s4,
          }}>
          <Text style={{ color: color.fgMuted, fontSize: font.caption.size, textAlign: 'center' }}>
            코드가 길어 QR 대신 아래 코드 문자열로 공유하세요.
          </Text>
        </View>
      )}

      <View
        style={{
          backgroundColor: color.surface,
          borderRadius: radius.chip,
          padding: space.s3,
          marginBottom: space.s4,
        }}>
        <Text
          testID="share-code-preview"
          selectable
          numberOfLines={2}
          ellipsizeMode="middle"
          style={{ color: color.fgMuted, fontSize: font.caption.size }}>
          {code}
        </Text>
      </View>

      <CopyButton
        testID="share-copy-link"
        label="링크 복사"
        primary
        onPress={() => copy('link')}
      />
      <View style={{ height: space.s2 }} />
      <CopyButton testID="share-copy-code" label="코드 복사" onPress={() => copy('code')} />

      <Text
        testID="share-copied-msg"
        style={{
          color: color.success,
          fontSize: font.caption.size,
          textAlign: 'center',
          marginTop: space.s3,
          minHeight: font.caption.size + 2,
        }}>
        {copied === 'code' ? '코드를 복사했습니다' : copied === 'link' ? '링크를 복사했습니다' : ''}
      </Text>
    </BottomSheet>
  );
}

interface CopyButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}

function CopyButton({ testID, label, onPress, primary }: CopyButtonProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: primary
          ? pressed
            ? color.primaryPressed
            : color.primary
          : pressed
            ? color.primaryWeak
            : color.surface,
        paddingVertical: space.s4,
        borderRadius: radius.chip,
        alignItems: 'center',
      })}>
      <Text
        style={{
          color: primary ? '#FFFFFF' : color.fg,
          fontSize: font.body.size,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
