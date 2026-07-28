import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('maintenance', {
      name: 'Maintenance reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Re-plan all reminders from the current schedule (cap 20 to stay within OS limits).
export async function syncReminders(scheduleItems) {
  const ok = await ensurePermission();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!ok) return;

  // Include daysUntil === 0: a task due today still gets its 9 AM reminder when the
  // app is opened earlier that morning (past fire times are skipped below).
  const upcoming = scheduleItems.filter((i) => i.daysUntil >= 0).slice(0, 20);
  for (const item of upcoming) {
    // Fire at 09:00 on the due *calendar day*, built from its parts rather than from
    // the due instant, so the reminder lands on the same day the card calls "due today".
    const d = item.due;
    const fireAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
    if (fireAt <= new Date()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${item.icon} ${item.title}`,
        body: 'This home task is due today. Open HomeKept to see how.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: 'maintenance' },
    });
  }
}
