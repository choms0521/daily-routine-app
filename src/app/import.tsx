/**
 * Import screen (spec stage-4 §5, PRD 5.5/7.1). Three entry points feed one decode pipeline:
 *   - code paste: a TextInput string
 *   - QR scan: expo-camera reads a deep link URL
 *   - deep link: `workouttracker://import?d=...` arrives as the `d` route param
 * Each is run through deserializeRoutine; on success the decoded template is previewed and the
 * user explicitly adds it to the library (importRoutine). Nothing is activated (Stage 3 owns that).
 */
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ImportPreview } from '@/components/import/ImportPreview';
import { CURRENT_SCHEMA_VERSION } from '@/domain/migration';
import { deserializeRoutine, type DeserializeError, type SharePayload } from '@/domain/share';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

type Result =
  | null
  | { kind: 'error'; message: string }
  | { kind: 'preview'; payload: SharePayload }
  | { kind: 'added'; name: string };

/** Map a decode failure to a user-facing message (PRD 7.2 / spec §5.2). */
function messageFor(reason: DeserializeError): string {
  switch (reason) {
    case 'incompatible-schema':
      return '앱 업데이트가 필요합니다. 더 최신 버전에서 만든 공유 코드입니다.';
    case 'input-too-large':
    case 'payload-too-large':
      return '공유 코드가 너무 큽니다.';
    default:
      return '올바른 공유 코드가 아닙니다.';
  }
}

function decode(input: string): Result {
  const r = deserializeRoutine(input, CURRENT_SCHEMA_VERSION);
  return r.success
    ? { kind: 'preview', payload: r.payload }
    : { kind: 'error', message: messageFor(r.reason) };
}

export default function ImportScreen() {
  const { color, font, space, radius } = useTheme();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const importRoutine = useAppStore((s) => s.importRoutine);

  const [tab, setTab] = useState<'code' | 'qr'>('code');
  const [codeText, setCodeText] = useState('');
  // Deep-link entry: when the screen opens from `workouttracker://import?d=...`, the `d` param is
  // present at mount, so decode it in the lazy initializer (no effect — the param does not change
  // for an already-open screen, and deriving state in an effect would cascade renders).
  const [result, setResult] = useState<Result>(() =>
    typeof d === 'string' && d.length > 0 ? decode(d) : null,
  );
  const scanHandled = useRef(false);

  const onScan = (data: string) => {
    if (scanHandled.current) return; // the camera fires per frame; handle the first hit only
    scanHandled.current = true;
    setResult(decode(data));
  };

  const reset = () => {
    scanHandled.current = false;
    setResult(null);
  };

  const add = () => {
    if (result?.kind !== 'preview') return;
    importRoutine(result.payload);
    setResult({ kind: 'added', name: result.payload.routine.name });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: space.s5,
        }}>
        <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
          루틴 가져오기
        </Text>
        <Pressable
          testID="import-close"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}>
          <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>닫기</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.s5, paddingBottom: space.s6, gap: space.s4 }}>
        {result?.kind === 'added' ? (
          <View testID="import-added" style={{ gap: space.s4, paddingTop: space.s5 }}>
            <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
              루틴을 가져왔습니다
            </Text>
            <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>
              {`'${result.name}'을(를) 라이브러리에 추가했습니다.`}
            </Text>
            <PrimaryButton
              testID="import-go-library"
              label="라이브러리로 이동"
              onPress={() => router.replace('/library')}
            />
          </View>
        ) : result?.kind === 'preview' ? (
          <View style={{ gap: space.s4 }}>
            <ImportPreview payload={result.payload} />
            <PrimaryButton testID="import-add" label="라이브러리에 추가" onPress={add} />
            <Pressable testID="import-cancel" onPress={reset} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: space.s3 }}>
              <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>다른 코드 입력</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: space.s4 }}>
            <View style={{ flexDirection: 'row', gap: space.s2 }}>
              <TabButton label="코드" active={tab === 'code'} onPress={() => setTab('code')} testID="import-tab-code" />
              <TabButton label="QR 스캔" active={tab === 'qr'} onPress={() => setTab('qr')} testID="import-tab-qr" />
            </View>

            {tab === 'code' ? (
              <View style={{ gap: space.s3 }}>
                <TextInput
                  testID="import-code-input"
                  value={codeText}
                  onChangeText={setCodeText}
                  placeholder="공유 코드를 붙여넣으세요"
                  placeholderTextColor={color.fgSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  style={{
                    minHeight: 96,
                    borderWidth: 1,
                    borderColor: color.border,
                    borderRadius: radius.chip,
                    padding: space.s3,
                    color: color.fg,
                    fontSize: font.caption.size,
                    textAlignVertical: 'top',
                  }}
                />
                <PrimaryButton
                  testID="import-preview-btn"
                  label="미리보기"
                  disabled={codeText.trim().length === 0}
                  onPress={() => setResult(decode(codeText.trim()))}
                />
              </View>
            ) : (
              <QrTab onScan={onScan} />
            )}

            {result?.kind === 'error' ? (
              <Text testID="import-error" style={{ color: color.danger, fontSize: font.body.size }}>
                {result.message}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QrTab({ onScan }: { onScan: (data: string) => void }) {
  const { color, font, space, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>카메라 권한을 확인하는 중…</Text>
    );
  }

  if (!permission.granted) {
    return (
      <View testID="import-camera-denied" style={{ gap: space.s3 }}>
        <Text style={{ color: color.fg, fontSize: font.body.size }}>
          QR 스캔에는 카메라 권한이 필요합니다.
        </Text>
        <PrimaryButton testID="import-grant-camera" label="권한 허용" onPress={requestPermission} />
        <Text style={{ color: color.fgSubtle, fontSize: font.caption.size }}>
          또는 코드 탭에서 공유 코드를 붙여넣으세요.
        </Text>
      </View>
    );
  }

  return (
    <CameraView
      testID="import-camera"
      style={{ height: 280, borderRadius: radius.card, overflow: 'hidden' }}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }: { data: string }) => onScan(data)}
    />
  );
}

interface PrimaryButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function PrimaryButton({ testID, label, onPress, disabled }: PrimaryButtonProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        backgroundColor: disabled ? color.chipIdleBg : pressed ? color.primaryPressed : color.primary,
        paddingVertical: space.s4,
        borderRadius: radius.chip,
        alignItems: 'center',
      })}>
      <Text style={{ color: disabled ? color.fgSubtle : '#FFFFFF', fontSize: font.body.size, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface TabButtonProps {
  testID: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ testID, label, active, onPress }: TabButtonProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        paddingVertical: space.s3,
        borderRadius: radius.chip,
        alignItems: 'center',
        backgroundColor: active ? color.primaryWeak : color.surface,
      }}>
      <Text
        style={{
          color: active ? color.primary : color.fgMuted,
          fontSize: font.body.size,
          fontWeight: active ? '600' : '400',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
