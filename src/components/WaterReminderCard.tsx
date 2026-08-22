import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import {
  requestWaterReminderPermission,
  showWaterReminder,
  syncWaterReminders,
  WaterReminderSettings,
} from '../services/waterReminder';
import { AppText, Button, Card, Chip } from './ui';

const DEFAULT_SETTINGS: WaterReminderSettings = {
  enabled: false,
  intervalMinutes: 120,
  startHour: 9,
  endHour: 21,
  dailyGoalLiters: 2.5,
};

export const WaterReminderCard = ({ studentId, dailyGoalLiters }: { studentId: string; dailyGoalLiters: number }) => {
  const storageKey = useMemo(() => `@ca-performance/water-reminder/${studentId}`, [studentId]);
  const lastShownKey = `${storageKey}/last-shown`;
  const [settings, setSettings] = useState<WaterReminderSettings>({ ...DEFAULT_SETTINGS, dailyGoalLiters });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        const stored = value ? JSON.parse(value) as Partial<WaterReminderSettings> : {};
        setSettings({ ...DEFAULT_SETTINGS, ...stored, dailyGoalLiters });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [dailyGoalLiters, storageKey]);

  useEffect(() => {
    if (!ready || !settings.enabled || Platform.OS !== 'web') return undefined;
    const tick = async () => {
      const now = new Date();
      if (now.getHours() < settings.startHour || now.getHours() > settings.endHour) return;
      const lastShown = Number(await AsyncStorage.getItem(lastShownKey) ?? 0);
      if (Date.now() - lastShown < settings.intervalMinutes * 60_000) return;
      if (await showWaterReminder(settings.dailyGoalLiters)) {
        await AsyncStorage.setItem(lastShownKey, String(Date.now()));
      }
    };
    const timer = setInterval(() => void tick(), 60_000);
    return () => clearInterval(timer);
  }, [lastShownKey, ready, settings]);

  const save = async (next: WaterReminderSettings) => {
    setSettings(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    await syncWaterReminders(next);
  };

  const toggle = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!settings.enabled) {
        const permission = await requestWaterReminderPermission();
        if (permission !== 'granted') {
          setMessage(permission === 'unsupported' ? 'Bu tarayıcı bildirimleri desteklemiyor.' : 'Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.');
          return;
        }
      }
      const next = { ...settings, enabled: !settings.enabled, dailyGoalLiters };
      await save(next);
      setMessage(next.enabled ? 'Hatırlatıcılar 09:00–21:00 arasında aktif.' : 'Su hatırlatıcıları kapatıldı.');
    } catch {
      setMessage('Hatırlatıcı ayarı kaydedilemedi. Tekrar deneyebilirsin.');
    } finally {
      setBusy(false);
    }
  };

  const changeInterval = async (intervalMinutes: number) => {
    const next = { ...settings, intervalMinutes, dailyGoalLiters };
    await save(next);
    setMessage(settings.enabled ? 'Bildirim aralığı güncellendi.' : 'Aralık kaydedildi; açtığında kullanılacak.');
  };

  const testNotification = async () => {
    setBusy(true);
    const permission = await requestWaterReminderPermission();
    if (permission === 'granted') {
      await showWaterReminder(dailyGoalLiters);
      setMessage('Test bildirimi gönderildi.');
    } else {
      setMessage('Test için bildirim izni gerekli.');
    }
    setBusy(false);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, settings.enabled && styles.iconActive]}>
          <MaterialCommunityIcons name="water-alert-outline" size={24} color={settings.enabled ? colors.primary : colors.info} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <AppText style={typography.h3}>Su hatırlatıcısı</AppText>
            <Chip label={settings.enabled ? 'Aktif' : 'Kapalı'} tone={settings.enabled ? 'success' : 'default'} />
          </View>
          <AppText style={styles.description}>09:00–21:00 arasında seçtiğin aralıkla su içmeni hatırlatır.</AppText>
        </View>
      </View>
      <View style={styles.intervalBlock}>
        <AppText style={styles.label}>Hatırlatma aralığı</AppText>
        <View style={styles.chips}>
          {[60, 90, 120].map((minutes) => (
            <Chip key={minutes} label={minutes === 60 ? 'Her saat' : `${minutes} dk`} selected={settings.intervalMinutes === minutes} onPress={() => void changeInterval(minutes)} />
          ))}
        </View>
      </View>
      {message ? <AppText style={styles.message}>{message}</AppText> : null}
      <View style={styles.actions}>
        <Button label={settings.enabled ? 'Hatırlatıcıyı kapat' : 'Bildirimleri aç'} icon={settings.enabled ? 'bell-off-outline' : 'bell-outline'} variant={settings.enabled ? 'secondary' : 'accent'} loading={busy} onPress={() => void toggle()} style={styles.flex} />
        <Button label="Test et" variant="secondary" compact disabled={busy} onPress={() => void testNotification()} />
      </View>
      {Platform.OS === 'web' ? <AppText style={styles.footnote}>Web bildirimi tarayıcı açıkken çalışır. Mobil uygulamada sistem tarafından planlanır.</AppText> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.md, borderColor: colors.info, backgroundColor: colors.infoSoft },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.accent },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  description: { ...typography.caption, color: colors.inkSoft, marginTop: 3 },
  intervalBlock: { gap: spacing.sm },
  label: { ...typography.caption, color: colors.inkSoft, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: { ...typography.caption, color: colors.info, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.sm },
  footnote: { fontSize: 10, lineHeight: 14, color: colors.inkSoft },
});
