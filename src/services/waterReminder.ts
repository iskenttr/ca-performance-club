import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type WaterReminderPermission = 'granted' | 'denied' | 'unsupported';

export interface WaterReminderSettings {
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
  dailyGoalLiters: number;
}

const IDS_KEY = '@ca-performance/water-notification-ids';
const CHANNEL_ID = 'water-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const clearScheduledWaterReminders = async () => {
  const stored = await AsyncStorage.getItem(IDS_KEY);
  const ids: string[] = stored ? JSON.parse(stored) : [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  await AsyncStorage.removeItem(IDS_KEY);
};

export const requestWaterReminderPermission = async (): Promise<WaterReminderPermission> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Su hatırlatıcıları',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted ? 'granted' : 'denied';
};

export const syncWaterReminders = async (settings: WaterReminderSettings) => {
  await clearScheduledWaterReminders();
  if (!settings.enabled) return;

  const ids: string[] = [];
  for (let minutes = settings.startHour * 60; minutes <= settings.endHour * 60; minutes += settings.intervalMinutes) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Su molası 💧',
        body: `Günlük ${settings.dailyGoalLiters} L hedefine yaklaşmak için bir bardak su içme zamanı.`,
        data: { type: 'water-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(minutes / 60),
        minute: minutes % 60,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
};

export const showWaterReminder = async (dailyGoalLiters: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Su molası 💧',
      body: `Günlük ${dailyGoalLiters} L hedefine yaklaşmak için bir bardak su içme zamanı.`,
    },
    trigger: null,
  });
  return true;
};

