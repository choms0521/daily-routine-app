/**
 * Reminder settings card (B1, spec b1 §4/§5). Presentational: it renders the current reminder
 * config and reports changes via onChange; the settings screen owns the store subscription and
 * the schedule/cancel I/O effect (layer separation — this card holds no I/O).
 *
 * Time picker: a plain hour/minute stepper. Chosen over a native datetime picker so it works in
 * Expo Go with zero extra native dependency (spec b1 §6 leaves the picker to development).
 */
import { Pressable, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import type { Reminder } from '@/types/schema';

interface ReminderCardProps {
  reminder: Reminder;
  onChange: (next: Reminder) => void;
}

/** Wrap an hour into [0, 23] and a minute into [0, 59] so stepping past the edges rolls over. */
function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/** Re-pad to 'HH:MM' so the stored value always matches the schema regex. */
function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function ReminderCard({ reminder, onChange }: ReminderCardProps) {
  const { color, font, space } = useTheme();
  const { hour, minute } = parseTime(reminder.time);

  const setHour = (delta: number) =>
    onChange({ ...reminder, time: formatTime(wrap(hour + delta, 24), minute) });
  const setMinute = (delta: number) =>
    onChange({ ...reminder, time: formatTime(hour, wrap(minute + delta, 60)) });

  return (
    <Card style={{ gap: space.s4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: space.s1, paddingRight: space.s3 }}>
          <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
            운동 리마인더
          </Text>
          <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>
            매일 정해진 시각에 알림을 보내 체크를 잊지 않도록 도와줍니다.
          </Text>
        </View>
        <Switch
          testID="reminder-toggle"
          value={reminder.enabled}
          onValueChange={(enabled) => onChange({ ...reminder, enabled })}
          trackColor={{ false: color.chipIdleBg, true: color.primary }}
          thumbColor={color.surfaceElevated}
        />
      </View>

      {reminder.enabled ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.s5,
          }}>
          <TimeStepper
            testID="reminder-hour"
            label="시"
            value={String(hour).padStart(2, '0')}
            onIncrement={() => setHour(1)}
            onDecrement={() => setHour(-1)}
          />
          <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
            :
          </Text>
          <TimeStepper
            testID="reminder-minute"
            label="분"
            value={String(minute).padStart(2, '0')}
            onIncrement={() => setMinute(5)}
            onDecrement={() => setMinute(-5)}
          />
        </View>
      ) : null}
    </Card>
  );
}

interface TimeStepperProps {
  testID: string;
  label: string;
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

function TimeStepper({ testID, label, value, onIncrement, onDecrement }: TimeStepperProps) {
  const { color, font, space } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.s2 }}>
      <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>{label}</Text>
      <StepButton testID={`${testID}-up`} label="＋" accessibilityLabel={`${label} 늘리기`} onPress={onIncrement} />
      <Text
        style={{
          color: color.fg,
          fontSize: font.display.size,
          fontWeight: font.display.weight,
          ...font.numeric,
          minWidth: 56,
          textAlign: 'center',
        }}>
        {value}
      </Text>
      <StepButton testID={`${testID}-down`} label="－" accessibilityLabel={`${label} 줄이기`} onPress={onDecrement} />
    </View>
  );
}

function StepButton({
  testID,
  label,
  accessibilityLabel,
  onPress,
}: {
  testID: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { color, font, space, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.primaryWeak : color.chipIdleBg,
        paddingVertical: space.s2,
        paddingHorizontal: space.s4,
        borderRadius: radius.chip,
      })}>
      <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
