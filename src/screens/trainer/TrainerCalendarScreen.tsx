import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Avatar, Button, Card, Chip, EmptyState, ModalSheet, Page, SegmentedControl, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentMode, Trainer } from '../../types/domain';
import { formatDate, formatTime, toDateInput } from '../../utils/date';

type CalendarFilter = 'upcoming' | 'pending' | 'history';

export const TrainerCalendarScreen = ({ onProfile, prefillStudentId }: { onProfile: () => void; prefillStudentId?: string }) => {
  const { data, user, students, addAppointment, addAppointmentBlock, removeAppointmentBlock, updateAppointmentStatus } = useApp();
  const trainer = user as Trainer;
  const [filter, setFilter] = useState<CalendarFilter>('upcoming');
  const [modalOpen, setModalOpen] = useState(Boolean(prefillStudentId));
  const [studentId, setStudentId] = useState(prefillStudentId ?? students[0]?.id ?? '');
  const [date, setDate] = useState(toDateInput(new Date(Date.now() + 86_400_000)));
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<AppointmentMode>('in_person');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(toDateInput(new Date(Date.now() + 86_400_000)));
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('14:00');
  const [blockNote, setBlockNote] = useState('Müsait değilim');
  const [blockError, setBlockError] = useState('');
  const now = new Date();
  const allAppointments = useMemo(
    () => [...(data?.appointments ?? [])].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [data?.appointments],
  );
  const futureBlocks = [...(data?.appointmentBlocks ?? [])]
    .filter((item) => new Date(item.endAt) > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const filtered = filter === 'upcoming'
    ? allAppointments.filter((item) => new Date(item.startAt) >= now && item.status !== 'cancelled' && item.status !== 'completed')
    : filter === 'pending'
      ? allAppointments.filter((item) => item.status === 'pending')
      : [...allAppointments.filter((item) => item.status === 'completed' || item.status === 'cancelled' || new Date(item.startAt) < now)].reverse();
  const grouped = filtered.reduce<Record<string, Appointment[]>>((acc, appointment) => {
    const key = toDateInput(new Date(appointment.startAt));
    acc[key] = [...(acc[key] ?? []), appointment];
    return acc;
  }, {});

  const saveAppointment = () => {
    const startAt = new Date(`${date}T${time}:00`);
    if (!studentId) { setError('Bir öğrenci seç.'); return; }
    if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) { setError('Gelecekte geçerli bir tarih ve saat seç.'); return; }
    addAppointment({ studentId, startAt: startAt.toISOString(), durationMinutes: duration, mode, note: note.trim() || (mode === 'online' ? 'Online PT dersi' : '1’e 1 PT dersi') }, 'confirmed');
    setError('');
    setModalOpen(false);
  };

  const saveAppointmentBlock = () => {
    const startAt = new Date(`${blockDate}T${blockStart}:00`);
    const endAt = new Date(`${blockDate}T${blockEnd}:00`);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setBlockError('Bitiş saati başlangıç saatinden sonra olmalı.');
      return;
    }
    if (endAt <= new Date()) {
      setBlockError('Gelecekte bir saat aralığı seç.');
      return;
    }
    const conflicts = allAppointments.some((item) => item.status !== 'cancelled' && item.status !== 'completed' && startAt < new Date(new Date(item.startAt).getTime() + item.durationMinutes * 60_000) && endAt > new Date(item.startAt));
    if (conflicts) {
      setBlockError('Bu saat aralığında mevcut bir ders var. Önce randevuyu değiştir veya iptal et.');
      return;
    }
    addAppointmentBlock({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), note: blockNote.trim() || 'Müsait değilim' });
    setBlockError('');
    setBlockModalOpen(false);
  };

  const confirmCancel = (appointment: Appointment) => setCancelTarget(appointment);

  const applyCancellation = () => {
    if (!cancelTarget) return;
    updateAppointmentStatus(cancelTarget.id, 'cancelled');
    setCancelTarget(null);
    setFilter('history');
  };

  return (
    <View style={styles.root}>
      <TopBar eyebrow="CA PERFORMANCE / COACH" title="Ders takvimi" name={trainer.fullName} onProfile={onProfile} right={<Button label="Ders ekle" icon="plus" compact variant="accent" onPress={() => setModalOpen(true)} />} />
      <Page>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIcon}><MaterialCommunityIcons name="calendar-month-outline" size={26} color={colors.primary} /></View>
          <View style={styles.flex}><AppText style={styles.summaryMonth}>{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date())}</AppText><AppText style={styles.muted}>{allAppointments.filter((item) => new Date(item.startAt) >= now && item.status !== 'cancelled').length} yaklaşan ders</AppText></View>
          <View style={styles.pendingStat}><AppText style={styles.pendingValue}>{allAppointments.filter((item) => item.status === 'pending').length}</AppText><AppText style={styles.pendingLabel}>talep</AppText></View>
        </Card>

        <Card style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <View style={styles.availabilityIcon}><MaterialCommunityIcons name="calendar-lock-outline" size={22} color={colors.primary} /></View>
            <View style={styles.flex}><AppText style={typography.bodyMedium}>Müsait olmadığım saatler</AppText><AppText style={styles.muted}>Eklediğin aralıklar öğrencilerin randevu seçeneklerinden kaldırılır.</AppText></View>
            <Button label="Saat ekle" icon="plus" compact variant="secondary" onPress={() => setBlockModalOpen(true)} />
          </View>
          {futureBlocks.length ? futureBlocks.slice(0, 5).map((block) => (
            <View key={block.id} style={styles.blockRow}>
              <View style={styles.flex}><AppText style={typography.bodyMedium}>{formatDate(block.startAt)} · {formatTime(block.startAt)}–{formatTime(block.endAt)}</AppText><AppText style={styles.muted}>{block.note}</AppText></View>
              <Pressable onPress={() => removeAppointmentBlock(block.id)} style={styles.removeBlock}><MaterialCommunityIcons name="close" size={18} color={colors.danger} /><AppText style={styles.cancelText}>Kaldır</AppText></Pressable>
            </View>
          )) : <AppText style={styles.muted}>Henüz kapatılmış bir saat aralığı yok.</AppText>}
        </Card>

        <SegmentedControl<CalendarFilter>
          value={filter}
          options={[{ value: 'upcoming', label: 'Yaklaşan' }, { value: 'pending', label: 'Talepler' }, { value: 'history', label: 'Geçmiş' }]}
          onChange={setFilter}
        />

        {Object.keys(grouped).length ? Object.entries(grouped).map(([dateKey, items]) => (
          <View key={dateKey} style={styles.dayGroup}>
            <View style={styles.dayHeading}>
              <View style={styles.dayDateBox}><AppText style={styles.dayDateNumber}>{new Date(`${dateKey}T12:00:00`).getDate()}</AppText><AppText style={styles.dayDateMonth}>{new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(new Date(`${dateKey}T12:00:00`)).replace('.', '').toLocaleUpperCase('tr-TR')}</AppText></View>
              <View><AppText style={typography.h3}>{new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }).format(new Date(`${dateKey}T12:00:00`))}</AppText><AppText style={styles.muted}>{items.length} ders</AppText></View>
            </View>
            {items.map((appointment) => {
              const student = students.find((item) => item.id === appointment.studentId);
              return (
                <Card key={appointment.id} style={[styles.lessonCard, appointment.status === 'cancelled' && styles.cancelledCard]}>
                  <View style={styles.timeColumn}><AppText style={styles.lessonTime}>{formatTime(appointment.startAt)}</AppText><AppText style={styles.muted}>{appointment.durationMinutes} dk</AppText></View>
                  <View style={styles.timeline}><View style={[styles.timelineDot, appointment.status === 'pending' && styles.timelineDotPending, appointment.status === 'cancelled' && styles.timelineDotCancelled]} /><View style={styles.timelineLine} /></View>
                  <View style={styles.lessonBody}>
                    <View style={styles.lessonTop}><View style={styles.studentInline}><Avatar name={student?.fullName ?? 'Öğrenci'} size={32} /><AppText style={typography.bodyMedium}>{student?.fullName ?? 'Silinmiş öğrenci'}</AppText></View><Chip label={appointment.status === 'pending' ? 'Talep' : appointment.status === 'confirmed' ? 'Onaylı' : appointment.status === 'completed' ? 'Tamamlandı' : 'İptal'} tone={appointment.status === 'pending' ? 'warning' : appointment.status === 'confirmed' ? 'success' : appointment.status === 'cancelled' ? 'danger' : 'default'} /></View>
                    <View style={styles.modeLabel}><MaterialCommunityIcons name={appointment.mode === 'online' ? 'video-outline' : 'account-supervisor-outline'} size={16} color={colors.primary} /><AppText style={styles.modeLabelText}>{appointment.mode === 'online' ? 'Online ders' : '1’e 1 ders'}</AppText></View>
                    <AppText style={styles.lessonNote}>{appointment.note}</AppText>
                    {appointment.status === 'pending' ? (
                      <View style={styles.actionRow}><Button label="Onayla" icon="check" compact variant="accent" onPress={() => updateAppointmentStatus(appointment.id, 'confirmed')} style={styles.actionButton} /><Button label="Reddet" compact variant="secondary" onPress={() => confirmCancel(appointment)} style={styles.actionButton} /></View>
                    ) : appointment.status === 'confirmed' ? (
                      <View style={styles.actionRow}><Button label="Tamamlandı" icon="check-circle-outline" compact variant="secondary" onPress={() => updateAppointmentStatus(appointment.id, 'completed')} style={styles.actionButton} /><Pressable onPress={() => confirmCancel(appointment)} style={styles.textAction}><AppText style={styles.cancelText}>İptal</AppText></Pressable></View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        )) : <Card><EmptyState icon="calendar-blank-outline" title="Bu görünüm boş" description={filter === 'pending' ? 'Bekleyen yeni ders talebi bulunmuyor.' : 'Gösterilecek ders bulunmuyor.'} /></Card>}
      </Page>

      <ModalSheet visible={modalOpen} onClose={() => setModalOpen(false)} title="Yeni ders ekle">
        <View style={styles.fieldBlock}><AppText style={styles.fieldLabel}>Öğrenci</AppText><View style={styles.studentChoices}>{students.map((student) => <Pressable key={student.id} onPress={() => setStudentId(student.id)} style={[styles.studentChoice, studentId === student.id && styles.studentChoiceSelected]}><Avatar name={student.fullName} size={36} accent={studentId === student.id} /><AppText style={[styles.studentChoiceText, studentId === student.id && styles.studentChoiceTextSelected]}>{student.fullName}</AppText>{studentId === student.id ? <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} /> : null}</Pressable>)}</View></View>
        <TextField label="Tarih" value={date} onChangeText={setDate} placeholder="YYYY-AA-GG" icon="calendar-outline" />
        <TextField label="Saat" value={time} onChangeText={setTime} placeholder="SS:DD" icon="clock-outline" />
        <View style={styles.fieldBlock}><AppText style={styles.fieldLabel}>Ders türü</AppText><View style={styles.chipRow}><Chip label="1’e 1 ders" selected={mode === 'in_person'} onPress={() => setMode('in_person')} /><Chip label="Online ders" selected={mode === 'online'} onPress={() => setMode('online')} /></View></View>
        <View style={styles.fieldBlock}><AppText style={styles.fieldLabel}>Süre</AppText><View style={styles.chipRow}>{[45, 60, 90].map((item) => <Chip key={item} label={`${item} dk`} selected={duration === item} onPress={() => setDuration(item)} />)}</View></View>
        <TextField label="Ders notu" value={note} onChangeText={setNote} multiline placeholder="Ders odağı" />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button label="Dersi takvime ekle" icon="calendar-check" onPress={saveAppointment} />
      </ModalSheet>

      <ModalSheet visible={blockModalOpen} onClose={() => setBlockModalOpen(false)} title="Müsait olmadığım saat">
        <View style={styles.confirmIcon}><MaterialCommunityIcons name="calendar-lock-outline" size={30} color={colors.primary} /></View>
        <AppText style={typography.h3}>Öğrencilerin seçemeyeceği zamanı belirle</AppText>
        <AppText style={styles.confirmCopy}>Bu aralık hem 1’e 1 hem online ders seçeneklerinde kapalı görünür.</AppText>
        <TextField label="Tarih" value={blockDate} onChangeText={setBlockDate} placeholder="YYYY-AA-GG" icon="calendar-outline" />
        <View style={styles.blockTimeRow}>
          <TextField label="Başlangıç" value={blockStart} onChangeText={setBlockStart} placeholder="SS:DD" icon="clock-outline" containerStyle={styles.flex} />
          <TextField label="Bitiş" value={blockEnd} onChangeText={setBlockEnd} placeholder="SS:DD" icon="clock-outline" containerStyle={styles.flex} />
        </View>
        <TextField label="Açıklama" value={blockNote} onChangeText={setBlockNote} placeholder="Özel program, izin..." />
        {blockError ? <AppText style={styles.error}>{blockError}</AppText> : null}
        <Button label="Bu saatleri kapat" icon="calendar-lock-outline" onPress={saveAppointmentBlock} />
      </ModalSheet>

      <ModalSheet visible={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title={cancelTarget?.status === 'pending' ? 'Talebi reddet' : 'Dersi iptal et'}>
        <View style={styles.confirmIcon}><MaterialCommunityIcons name={cancelTarget?.status === 'pending' ? 'calendar-remove-outline' : 'calendar-alert'} size={30} color={colors.danger} /></View>
        <AppText style={typography.h3}>{cancelTarget?.status === 'pending' ? 'Bu ders talebi reddedilsin mi?' : 'Bu ders iptal edilsin mi?'}</AppText>
        <AppText style={styles.confirmCopy}>İşlem öğrencinin takvimine de yansıyacak ve ders geçmiş bölümüne taşınacak.</AppText>
        <View style={styles.confirmActions}>
          <Button label="Vazgeç" variant="secondary" onPress={() => setCancelTarget(null)} style={styles.actionButton} />
          <Button label={cancelTarget?.status === 'pending' ? 'Talebi reddet' : 'Dersi iptal et'} icon="close" variant="danger" onPress={applyCancellation} style={styles.actionButton} />
        </View>
      </ModalSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  muted: { ...typography.caption, color: colors.inkSoft },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  availabilityCard: { gap: spacing.md },
  availabilityHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  availabilityIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  removeBlock: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: spacing.sm },
  blockTimeRow: { flexDirection: 'row', gap: spacing.sm },
  summaryIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  summaryMonth: { ...typography.h3, textTransform: 'capitalize' },
  pendingStat: { minWidth: 58, padding: spacing.sm, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.warningSoft },
  pendingValue: { fontSize: 19, lineHeight: 22, fontWeight: '800', color: colors.warning },
  pendingLabel: { fontSize: 10, lineHeight: 12, color: colors.warning },
  dayGroup: { gap: spacing.md },
  dayHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayDateBox: { width: 48, height: 52, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dayDateNumber: { fontSize: 19, lineHeight: 21, fontWeight: '800', color: colors.white },
  dayDateMonth: { fontSize: 9, lineHeight: 11, fontWeight: '800', color: colors.accent },
  lessonCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  cancelledCard: { opacity: 0.6 },
  timeColumn: { width: 50, alignItems: 'center', paddingTop: 3 },
  lessonTime: { ...typography.bodyMedium },
  timeline: { width: 10, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginTop: 7 },
  timelineDotPending: { backgroundColor: colors.warning },
  timelineDotCancelled: { backgroundColor: colors.danger },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  lessonBody: { flex: 1, gap: spacing.sm },
  lessonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  studentInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  lessonNote: { color: colors.inkSoft },
  modeLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  modeLabelText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  actionButton: { flex: 1 },
  textAction: { padding: spacing.sm },
  cancelText: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  confirmIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  confirmCopy: { color: colors.inkSoft },
  confirmActions: { flexDirection: 'row', gap: spacing.sm },
  fieldBlock: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.inkSoft },
  studentChoices: { gap: spacing.sm },
  studentChoice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, paddingRight: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  studentChoiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  studentChoiceText: { flex: 1, ...typography.bodyMedium },
  studentChoiceTextSelected: { color: colors.white },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  error: { ...typography.caption, color: colors.danger, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md },
});
