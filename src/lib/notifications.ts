/**
 * Local notification I/O (B1) — the platform shell around expo-notifications. Like
 * src/lib/backupFile.ts, this is a thin native boundary jest can't meaningfully exercise
 * (permission prompts, OS scheduling), so it stays thin and holds no business logic: the pure
 * parts (time format, "needs reminder" judgment) live in domain. The native I/O here is NOT
 * covered by jest and has not been verified on a device yet — exercise schedule/fire/permission
 * flows on a real device before relying on it.
 *
 * Local-only scope (spec b1 range gate): scheduled local notifications only — no remote push,
 * no EAS push token, no projectId. Local scheduling works in Expo Go.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'daily-reminder';

/**
 * Serialize every schedule/cancel op onto a single queue. expo-notifications calls are async I/O
 * with no ordering guarantee, so a rapid toggle/time change can interleave two in-flight runs
 * (each does a cancel + schedule) and leave an older time as the final scheduled reminder.
 * Chaining each op after the previous one settles makes the last-submitted op the last to run,
 * so the latest reminder config always wins.
 */
let opQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(op: () => Promise<T>): Promise<T> {
  // Run `op` once the prior op settles, regardless of whether it resolved or rejected.
  const run = opQueue.then(op, op);
  // Keep the queue tail from rejecting so one failed op can't break the ones after it; the
  // caller still observes this op's own outcome through the returned `run`.
  opQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Ensure the app may post notifications. iOS shows the permission prompt; Android needs a
 * channel before scheduling (and the OS-level POST_NOTIFICATIONS prompt on 13+). Returns
 * whether permission is granted so the caller can keep the toggle off when the user declined.
 */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: '운동 리마인더',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedule a single daily reminder at `time` ('HH:MM'). Cancels existing reminders first so a
 * time/toggle change never leaves a stale duplicate. The daily trigger fires once per day when
 * the local clock matches hour:minute.
 */
export async function scheduleDailyReminder(time: string): Promise<void> {
  return enqueue(async () => {
    const [hour, minute] = time.split(':').map(Number);
    await cancelRemindersInternal();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '오늘의 운동',
        body: '오늘 루틴을 아직 체크하지 않았어요. 지금 확인해보세요.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  });
}

/** Cancel all scheduled reminders (the app schedules only this one daily reminder). */
export async function cancelReminders(): Promise<void> {
  return enqueue(cancelRemindersInternal);
}

/**
 * The cancel I/O itself, called directly inside a queued op (scheduleDailyReminder cancels
 * first) rather than re-entering the queue — re-entering would await the op already running and
 * deadlock. Only the exported wrappers enqueue.
 */
async function cancelRemindersInternal(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
