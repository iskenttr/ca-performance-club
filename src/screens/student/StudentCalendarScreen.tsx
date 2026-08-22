import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Button, Card, Chip, EmptyState, ModalSheet, Page, SectionHeader, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentMode, Student } from '../../types/domain';
import { formatAppointment, formatDate, formatTime, toDateInput } from '../../utils/date';

const statusMeta: Record<Appointment['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'default' }> = {
  confirmed: { label: 'Onaylandı', tone: 'success' },
  pending: { label: 'Onay bekliyor', tone: 'warning' },
  completed: { label: 'Tamamlandı', tone: 'default' },
  cancelled: { label: 'İptal edildi', tone: 'danger' },
};

export const StudentCalendarScreen = ({ onProfile }: { onProfile: () => void }) => {
  const { data, user, getAppointmentAvailability, requestAppointment, updateAppointmentStatus } = useApp();
  const student = user as Student;
  const [modalOpen, setModalOpen] = useState(false);
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<AppointmentMode>('in_person');
  const [note, setNote] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

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

  const loadAvailableSlots = async (nextDuration: number) => {
    setLoadingSlots(true);
    setError('');
    setSelectedSlot('');
    try {
      setAvailableSlots(await getAppointmentAvailability(nextDuration));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Uygun saatler alınamadı.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const openBooking = () => {
    setModalOpen(true);
    void loadAvailableSlots(duration);
  };

  const changeDuration = (nextDuration: number) => {
    setDuration(nextDuration);
    void loadAvailableSlots(nextDuration);
  };

  const slotDays = useMemo(() => {
    const grouped = new Map<string, string[]>();
    availableSlots.forEach((slot) => {
      const key = toDateInput(new Date(slot));
      grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    });
    return [...grouped.entries()].slice(0, 7);
  }, [availableSlots]);

  const submitAppointment = async () => {
    if (!selectedSlot) {
      setError('Önce uygun bir saat seçmelisin.');
      return;
    }
    setBooking(true);
    setError('');
    try {
      await requestAppointment({
        studentId: student.id,
        startAt: selectedSlot,
        durationMinutes: duration,
        mode,
        note: note.trim() || (mode === 'online' ? 'Online PT dersi' : '1’e 1 PT dersi'),
      });
      setModalOpen(false);
      setSelectedSlot('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Randevu oluşturulamadı.');
      try {
        setAvailableSlots(await getAppointmentAvailability(duration));
      } catch {
        // Asıl rezervasyon hatasını koru.
      }
    } finally {
      setBooking(false);
    }
  };

  const cancelAppointment = (appointment: Appointment) => setCancelTarget(appointment);

  const applyCancellation = () => {
    if (!cancelTarget) return;
    updateAppointmentStatus(cancelTarget.id, 'cancelled');
    setCancelTarget(null);
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

        <Button label="Cem Hoca’dan PT randevusu al" icon="calendar-plus" variant="accent" onPress={openBooking} />

        <View style={styles.sectionBlock}>
          <SectionHeader title="Yaklaşan dersler" />
          {upcoming.length ? upcoming.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} onCancel={() => cancelAppointment(appointment)} />
          )) : <Card><EmptyState icon="calendar-blank-outline" title="Yaklaşan ders yok" description="Cem Hoca’dan uygun bir zaman istemek için yeni ders talebi oluşturabilirsin." /></Card>}
        </View>

        {past.length ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Geçmiş" />
            {past.slice(0, 6).map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} past />)}
          </View>
        ) : null}
      </Page>

      <ModalSheet visible={modalOpen} onClose={() => setModalOpen(false)} title="PT randevusu al">
        <View style={styles.coachBanner}>
          <View style={styles.coachIcon}><MaterialCommunityIcons name="whistle-outline" size={23} color={colors.primary} /></View>
          <View style={styles.flex}><AppText style={typography.bodyMedium}>Cem Arslanoğlu</AppText><AppText style={styles.muted}>Müsait bir saat seç; talebin anında Cem Hoca’nın takvimine düşsün.</AppText></View>
        </View>
        <View style={styles.durationBlock}>
          <AppText style={styles.fieldLabel}>Ders türü</AppText>
          <View style={styles.modeRow}>
            <Pressable onPress={() => setMode('in_person')} style={[styles.modeCard, mode === 'in_person' && styles.modeCardSelected]}>
              <MaterialCommunityIcons name="account-supervisor-outline" size={24} color={mode === 'in_person' ? colors.accent : colors.primary} />
              <View style={styles.flex}><AppText style={[typography.bodyMedium, mode === 'in_person' && styles.modeTextSelected]}>1’e 1 ders</AppText><AppText style={[styles.muted, mode === 'in_person' && styles.modeSubtextSelected]}>Cem Hoca ile yüz yüze</AppText></View>
            </Pressable>
            <Pressable onPress={() => setMode('online')} style={[styles.modeCard, mode === 'online' && styles.modeCardSelected]}>
              <MaterialCommunityIcons name="video-outline" size={24} color={mode === 'online' ? colors.accent : colors.primary} />
              <View style={styles.flex}><AppText style={[typography.bodyMedium, mode === 'online' && styles.modeTextSelected]}>Online ders</AppText><AppText style={[styles.muted, mode === 'online' && styles.modeSubtextSelected]}>Görüntülü PT seansı</AppText></View>
            </Pressable>
          </View>
        </View>
        <View style={styles.durationBlock}>
          <AppText style={styles.fieldLabel}>Ders süresi</AppText>
          <View style={styles.chipRow}>{[45, 60, 90].map((item) => <Chip key={item} label={`${item} dk`} selected={duration === item} onPress={() => changeDuration(item)} />)}</View>
        </View>
        <View style={styles.slotBlock}>
          <View style={styles.slotHeader}><AppText style={styles.fieldLabel}>Uygun saatler · İstanbul</AppText>{loadingSlots ? <Chip label="Yükleniyor" tone="info" /> : <Chip label={`${availableSlots.length} seçenek`} tone="success" />}</View>
          {!loadingSlots && !slotDays.length ? <Card><EmptyState icon="calendar-remove-outline" title="Uygun saat bulunamadı" description="Ders süresini değiştir veya daha sonra tekrar kontrol et." /></Card> : null}
          {slotDays.map(([day, slots]) => (
            <View key={day} style={styles.slotDay}>
              <AppText style={styles.slotDate}>{new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(slots[0]))}</AppText>
              <View style={styles.slotGrid}>
                {slots.slice(0, 10).map((slot) => <Chip key={slot} label={formatTime(slot)} selected={selectedSlot === slot} onPress={() => { setSelectedSlot(slot); setError(''); }} />)}
              </View>
            </View>
          ))}
        </View>
        <TextField label="Not" value={note} onChangeText={setNote} placeholder="Ders odağı veya kısa not" multiline />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button label={selectedSlot ? `${formatAppointment(selectedSlot)} için talep gönder` : 'Uygun bir saat seç'} icon="send-outline" loading={booking} disabled={!selectedSlot || loadingSlots} onPress={() => void submitAppointment()} />
      </ModalSheet>

      <ModalSheet visible={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Dersi iptal et">
        <View style={styles.confirmIcon}><MaterialCommunityIcons name="calendar-remove-outline" size={30} color={colors.danger} /></View>
        <AppText style={typography.h3}>Bu ders {cancelTarget?.status === 'pending' ? 'talebi' : 'kaydı'} iptal edilsin mi?</AppText>
        <AppText style={styles.confirmCopy}>İşlem Cem Hoca’nın takvimine de yansıyacak ve ders geçmiş bölümünde görünecek.</AppText>
        <View style={styles.confirmActions}>
          <Button label="Vazgeç" variant="secondary" onPress={() => setCancelTarget(null)} style={styles.confirmButton} />
          <Button label="Dersi iptal et" icon="close" variant="danger" onPress={applyCancellation} style={styles.confirmButton} />
        </View>
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
        <View style={styles.locationRow}><MaterialCommunityIcons name={appointment.mode === 'online' ? 'video-outline' : 'account-outline'} size={16} color={colors.inkSoft} /><AppText style={styles.muted}>{appointment.mode === 'online' ? 'Cem Arslanoğlu ile online' : 'Cem Arslanoğlu ile 1’e 1'}</AppText></View>
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
  confirmIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  confirmCopy: { color: colors.inkSoft },
  confirmActions: { flexDirection: 'row', gap: spacing.sm },
  confirmButton: { flex: 1 },
  coachBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  coachIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  durationBlock: { gap: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeCard: { flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  modeCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  modeTextSelected: { color: colors.white },
  modeSubtextSelected: { color: colors.white },
  slotBlock: { gap: spacing.md, paddingTop: spacing.xs },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  slotDay: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  slotDate: { ...typography.bodyMedium, textTransform: 'capitalize' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.inkSoft },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  error: { ...typography.caption, color: colors.danger, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md },
});
