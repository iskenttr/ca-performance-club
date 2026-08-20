import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Button, Card, Chip, EmptyState, ModalSheet, Page, SectionHeader, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Appointment, Student } from '../../types/domain';
import { formatAppointment, formatDate, formatTime, toDateInput } from '../../utils/date';

const statusMeta: Record<Appointment['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'default' }> = {
  confirmed: { label: 'Onaylandı', tone: 'success' },
  pending: { label: 'Onay bekliyor', tone: 'warning' },
  completed: { label: 'Tamamlandı', tone: 'default' },
  cancelled: { label: 'İptal edildi', tone: 'danger' },
};

export const StudentCalendarScreen = ({ onProfile }: { onProfile: () => void }) => {
  const { data, user, addAppointment, updateAppointmentStatus } = useApp();
  const student = user as Student;
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(toDateInput(new Date(Date.now() + 2 * 86_400_000)));
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState('Birebir antrenman');
  const [error, setError] = useState('');

  const appointments = useMemo(
    () => (data?.appointments.filter((item) => item.studentId === student.id) ?? []).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [data?.appointments, student.id],
  );
  const upcoming = appointments.filter((item) => item.status !== 'completed' && item.status !== 'cancelled' && new Date(item.startAt) >= new Date());
  const past = [...appointments.filter((item) => item.status === 'completed' || item.status === 'cancelled' || new Date(item.startAt) < new Date())].reverse();
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const value = new Date();
    value.setDate(value.getDate() + index);
    return value;
  });

  const requestAppointment = () => {
    const startAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
      setError('Gelecekte geçerli bir tarih ve saat seç.');
      return;
    }
    addAppointment({ studentId: student.id, startAt: startAt.toISOString(), durationMinutes: duration, note: note.trim() || 'Birebir antrenman' }, 'pending');
    setError('');
    setModalOpen(false);
  };

  const cancelAppointment = (id: string) => {
    Alert.alert('Ders talebi iptal edilsin mi?', 'Cem Hoca takviminde de iptal olarak görünecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal et', style: 'destructive', onPress: () => updateAppointmentStatus(id, 'cancelled') },
    ]);
  };

  return (
    <View style={styles.root}>
      <TopBar eyebrow="Derslerim" title="Takvim" name={student.fullName} onProfile={onProfile} />
      <Page>
        <Card style={styles.weekCard}>
          <View style={styles.weekHeader}><AppText style={typography.h3}>Önümüzdeki 7 gün</AppText><AppText style={styles.monthLabel}>{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date())}</AppText></View>
          <View style={styles.weekRow}>
            {weekDays.map((day, index) => {
              const dateKey = toDateInput(day);
              const hasAppointment = upcoming.some((item) => toDateInput(new Date(item.startAt)) === dateKey);
              return (
                <View key={dateKey} style={[styles.dayCell, index === 0 && styles.dayCellToday]}>
                  <AppText style={[styles.dayName, index === 0 && styles.dayTextToday]}>{new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(day).replace('.', '').slice(0, 2).toLocaleUpperCase('tr-TR')}</AppText>
                  <AppText style={[styles.dayNumber, index === 0 && styles.dayTextToday]}>{day.getDate()}</AppText>
                  <View style={[styles.eventDot, hasAppointment && styles.eventDotActive]} />
                </View>
              );
            })}
          </View>
        </Card>

        <Button label="Yeni ders talebi" icon="calendar-plus" variant="accent" onPress={() => setModalOpen(true)} />

        <View style={styles.sectionBlock}>
          <SectionHeader title="Yaklaşan dersler" />
          {upcoming.length ? upcoming.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} onCancel={() => cancelAppointment(appointment.id)} />
          )) : <Card><EmptyState icon="calendar-blank-outline" title="Yaklaşan ders yok" description="Cem Hoca’dan uygun bir zaman istemek için yeni ders talebi oluşturabilirsin." /></Card>}
        </View>

        {past.length ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Geçmiş" />
            {past.slice(0, 6).map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} past />)}
          </View>
        ) : null}
      </Page>

      <ModalSheet visible={modalOpen} onClose={() => setModalOpen(false)} title="Ders talep et">
        <View style={styles.coachBanner}>
          <View style={styles.coachIcon}><MaterialCommunityIcons name="whistle-outline" size={23} color={colors.primary} /></View>
          <View style={styles.flex}><AppText style={typography.bodyMedium}>Cem Arslanoğlu</AppText><AppText style={styles.muted}>Talebin Cem Hoca’nın onayına gönderilecek.</AppText></View>
        </View>
        <TextField label="Tarih" value={date} onChangeText={setDate} placeholder="YYYY-AA-GG" icon="calendar-outline" />
        <TextField label="Saat" value={time} onChangeText={setTime} placeholder="SS:DD" icon="clock-outline" />
        <View style={styles.durationBlock}>
          <AppText style={styles.fieldLabel}>Ders süresi</AppText>
          <View style={styles.chipRow}>{[45, 60, 90].map((item) => <Chip key={item} label={`${item} dk`} selected={duration === item} onPress={() => setDuration(item)} />)}</View>
        </View>
        <TextField label="Not" value={note} onChangeText={setNote} placeholder="Ders odağı veya kısa not" multiline />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button label="Talebi gönder" icon="send-outline" onPress={requestAppointment} />
      </ModalSheet>
    </View>
  );
};

const AppointmentCard = ({ appointment, past = false, onCancel }: { appointment: Appointment; past?: boolean; onCancel?: () => void }) => {
  const meta = statusMeta[appointment.status];
  return (
    <Card style={[styles.appointmentCard, past && styles.pastCard]}>
      <View style={[styles.timeBox, past && styles.timeBoxPast]}>
        <AppText style={[styles.time, past && styles.pastText]}>{formatTime(appointment.startAt)}</AppText>
        <AppText style={[styles.duration, past && styles.pastText]}>{appointment.durationMinutes} dk</AppText>
      </View>
      <View style={styles.flex}>
        <View style={styles.appointmentTop}><AppText style={typography.bodyMedium}>{formatDate(appointment.startAt)}</AppText><Chip label={meta.label} tone={meta.tone} /></View>
        <AppText style={styles.appointmentNote}>{appointment.note}</AppText>
        <View style={styles.locationRow}><MaterialCommunityIcons name="account-outline" size={16} color={colors.inkSoft} /><AppText style={styles.muted}>Cem Arslanoğlu ile birebir</AppText></View>
        {onCancel ? <Pressable onPress={onCancel} style={styles.cancelButton}><AppText style={styles.cancelText}>Dersi iptal et</AppText></Pressable> : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  weekCard: { gap: spacing.md, padding: spacing.md },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { ...typography.caption, color: colors.inkSoft },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 3 },
  dayCell: { flex: 1, minHeight: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayCellToday: { backgroundColor: colors.primary },
  dayName: { fontSize: 9, lineHeight: 11, fontWeight: '700', color: colors.inkSoft },
  dayNumber: { fontSize: 17, lineHeight: 20, fontWeight: '800' },
  dayTextToday: { color: colors.white },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  eventDotActive: { backgroundColor: colors.accent },
  sectionBlock: { gap: spacing.md },
  appointmentCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  pastCard: { opacity: 0.72 },
  timeBox: { width: 60, minHeight: 64, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  timeBoxPast: { backgroundColor: colors.surfaceMuted },
  time: { fontSize: 17, lineHeight: 20, fontWeight: '800', color: colors.primary },
  duration: { ...typography.caption, color: colors.primary },
  pastText: { color: colors.inkSoft },
  appointmentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  appointmentNote: { color: colors.inkSoft, marginTop: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  muted: { ...typography.caption, color: colors.inkSoft },
  cancelButton: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: 5 },
  cancelText: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  coachBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  coachIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  durationBlock: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.inkSoft },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  error: { ...typography.caption, color: colors.danger, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md },
});

