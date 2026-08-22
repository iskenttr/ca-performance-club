export type WaterReminderPermission = 'granted' | 'denied' | 'unsupported';

export interface WaterReminderSettings {
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
  dailyGoalLiters: number;
}

export const requestWaterReminderPermission = async (): Promise<WaterReminderPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
};

export const syncWaterReminders = async (_settings: WaterReminderSettings) => undefined;

export const showWaterReminder = async (dailyGoalLiters: number) => {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  new Notification('Su molası 💧', {
    body: `Günlük ${dailyGoalLiters} L hedefine yaklaşmak için bir bardak su içme zamanı.`,
    icon: '/favicon.png',
    tag: 'ca-water-reminder',
  });
  return true;
};

