/**
 * Settings tab (PRD 8.5, M5). First settings surface; holds local full backup/restore.
 * Export writes the whole AppState to a JSON file and opens the share sheet; import picks a
 * file, validates it (domain/backup), and — only after an explicit confirm — replaces the
 * entire state. The decode/validate logic is pure (tested); this screen is the I/O + UX shell.
 */
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReminderCard } from '@/components/settings/ReminderCard';
import { Card } from '@/components/ui/Card';
import { todayKey } from '@/domain/clock';
import type { BackupParseResult } from '@/domain/backup';
import { exportBackup, pickBackup } from '@/lib/backupFile';
import { cancelReminders, ensurePermission, scheduleDailyReminder } from '@/lib/notifications';
import { selectReminder } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

type ParseFailure = Extract<BackupParseResult, { success: false }>['reason'];

function messageFor(reason: ParseFailure): string {
  switch (reason) {
    case 'incompatible-version':
      return '앱 업데이트가 필요합니다. 더 최신 버전에서 만든 백업입니다.';
    case 'invalid-schema':
      return '백업 파일의 형식이 올바르지 않습니다.';
    default:
      return '올바른 백업 파일이 아닙니다.';
  }
}

export default function SettingsScreen() {
  const { color, font, space } = useTheme();
  // Only `replaceState` (a stable action) is subscribed. The full AppState is read lazily at
  // export time via getState() so this tab doesn't re-render on every unrelated state change.
  const replaceState = useAppStore((s) => s.replaceState);
  const reminder = useAppStore((s) => selectReminder(s.state));
  const setReminder = useAppStore((s) => s.setReminder);
  const [busy, setBusy] = useState(false);

  // Sync the OS schedule to the reminder config (layer separation: the store holds state, this
  // effect does the I/O). Enabling asks for permission; if denied, the toggle is reverted and
  // the user is told — the revert re-runs this effect on the disabled branch (just a cancel), so
  // there is no permission re-prompt loop. Re-running on mount keeps the schedule consistent
  // after an app restart (re-schedules if still enabled, clears if not).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!reminder.enabled) {
          await cancelReminders();
          return;
        }
        const granted = await ensurePermission();
        if (cancelled) return;
        if (!granted) {
          setReminder({ ...reminder, enabled: false });
          Alert.alert(
            '알림 권한이 필요합니다',
            '리마인더를 받으려면 설정에서 이 앱의 알림을 허용해주세요.',
          );
          return;
        }
        await scheduleDailyReminder(reminder.time);
      } catch {
        // The native schedule/cancel I/O failed (OS scheduling error, permission API throw).
        // Surface it instead of leaving an unhandled promise rejection. Do NOT mutate `reminder`
        // here: it is an effect dep, so flipping a field would re-run this effect and could loop.
        // The permission-denied revert above is a separate, intentional path and stays distinct.
        if (cancelled) return;
        Alert.alert('리마인더 설정 실패', '알림 예약 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reminder, setReminder]);

  const onExport = async () => {
    setBusy(true);
    try {
      await exportBackup(useAppStore.getState().state, todayKey());
    } catch (error) {
      Alert.alert('내보내기 실패', error instanceof Error ? error.message : '백업을 내보내지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const result = await pickBackup();
      if (result === null) return; // user cancelled the picker
      if (!result.success) {
        Alert.alert('가져오기 실패', messageFor(result.reason));
        return;
      }
      // Destructive whole-state replace — gate behind an explicit confirm (PRD 5.10.2 pattern).
      Alert.alert('백업 복원', '현재 모든 데이터를 이 백업으로 덮어씁니다. 계속할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '복원', style: 'destructive', onPress: () => replaceState(result.state) },
      ]);
    } catch (error) {
      Alert.alert('가져오기 실패', error instanceof Error ? error.message : '백업을 가져오지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.s5, gap: space.s4 }}>
        <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
          설정
        </Text>

        <Card style={{ gap: space.s4 }}>
          <View style={{ gap: space.s1 }}>
            <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
              백업 / 복원
            </Text>
            <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>
              전체 데이터를 JSON 파일로 내보내고, 기기 변경·재설치 시 가져옵니다. 복원은 현재 데이터를 덮어씁니다.
            </Text>
          </View>
          <SettingButton testID="settings-export" label="백업 내보내기" onPress={onExport} disabled={busy} />
          <SettingButton
            testID="settings-import"
            label="백업 가져오기"
            onPress={onImport}
            disabled={busy}
            variant="secondary"
          />
        </Card>

        <ReminderCard reminder={reminder} onChange={setReminder} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

function SettingButton({ testID, label, onPress, disabled, variant = 'primary' }: SettingButtonProps) {
  const { color, font, space, radius } = useTheme();
  const secondary = variant === 'secondary';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        backgroundColor: secondary
          ? color.surface
          : disabled
            ? color.chipIdleBg
            : pressed
              ? color.primaryPressed
              : color.primary,
        borderWidth: secondary ? 1 : 0,
        borderColor: color.border,
        paddingVertical: space.s4,
        borderRadius: radius.chip,
        alignItems: 'center',
        opacity: disabled ? 0.6 : 1,
      })}>
      <Text
        style={{
          color: secondary ? color.fg : '#FFFFFF',
          fontSize: font.body.size,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
