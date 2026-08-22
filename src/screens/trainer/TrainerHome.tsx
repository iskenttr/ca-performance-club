import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { TrendChart } from '../../components/graphics';
import { AppText, Avatar, Card, Chip, Page, SectionHeader } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { TRAINER_ID, Trainer } from '../../types/domain';
import { formatAppointment, formatDate, formatTime, relativeDay } from '../../utils/date';
import type { TrainerRoute } from './TrainerApp';

export const TrainerHome = ({ onNavigate, onStudent }: { onNavigate: (route: TrainerRoute) => void; onStudent: (studentId: string) => void }) => {
  const { data, user, students } = useApp();
  const trainer = user as Trainer;
  const activeStudents = students.filter((item) => item.status === 'active').length;
  const newStudents = students.filter((item) => item.status === 'new');
  const unread = data?.messages.filter((item) => item.senderId !== TRAINER_ID && !item.readAt).length ?? 0;
  const upcoming = (data?.appointments.filter((item) => item.status !== 'cancelled' && item.status !== 'completed' && new Date(item.startAt) >= new Date()) ?? []).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const todayKey = new Date().toDateString();
  const todayLessons = upcoming.filter((item) => new Date(item.startAt).toDateString() === todayKey);
  const nextLessons = upcoming.slice(0, 3);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const weeklyLessons = data?.appointments.filter((item) => item.status !== 'cancelled' && new Date(item.startAt) >= weekStart && new Date(item.startAt) < weekEnd).length ?? 0;
  const recentCutoff = Date.now() - 7 * 86_400_000;
  const atRiskStudents = students.filter((student) => {
    if (student.status !== 'active' || !data?.workoutPrograms.some((item) => item.studentId === student.id)) return false;
    const completedDays = new Set(data.workoutCompletions.filter((item) => item.studentId === student.id && new Date(item.completedOn).getTime() >= recentCutoff).map((item) => item.completedOn));
    return completedDays.size < student.weeklyGoal;
  });
  const expiringPackages = students.filter((student) => student.lessonPackage && (
    student.lessonPackage.remainingLessons <= 2
    || new Date(student.lessonPackage.expiresAt).getTime() <= Date.now() + 14 * 86_400_000
  ));
  const notifications = [
    ...(data?.messages.filter((item) => item.senderId !== TRAINER_ID && !item.readAt).map((item) => ({ id: item.id, studentId: item.studentId, type: 'message' as const, at: item.sentAt, title: 'Yeni mesaj', detail: item.text })) ?? []),
    ...(data?.mealEntries.filter((item) => new Date(item.createdAt).getTime() >= recentCutoff).map((item) => ({ id: item.id, studentId: item.studentId, type: 'meal' as const, at: item.createdAt, title: 'Yeni öğün', detail: `${item.name} · ${Math.round(item.caloriesKcal)} kcal` })) ?? []),
    ...(data?.measurements.filter((item) => new Date(item.date).getTime() >= recentCutoff).map((item) => ({ id: item.id, studentId: item.studentId, type: 'measurement' as const, at: item.date, title: 'Yeni ölçüm', detail: `${item.weightKg.toFixed(1)} kg` })) ?? []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <View style={styles.root}>
      <TopBar eyebrow="CA PERFORMANCE / COACH" title="Kontrol merkezi" name={trainer.fullName} onProfile={() => onNavigate('profile')} />
      <Page>
        <ImageBackground source={require('../../../assets/premium/strength-detail.png')} style={styles.hero} imageStyle={styles.heroImage} resizeMode="cover">
        <LinearGradient colors={['rgba(3,5,4,0.20)', 'rgba(3,5,4,0.92)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.heroOverlay}>
          <View style={styles.heroIcon}><MaterialCommunityIcons name="whistle-outline" size={29} color={colors.primary} /></View>
          <View style={styles.flex}>
            <AppText style={styles.heroEyebrow}>GÜNAYDIN CEM HOCA</AppText>
            <AppText style={styles.heroTitle}>{todayLessons.length ? `Bugün ${todayLessons.length} birebir dersin var.` : 'Bugünkü takvimin sakin.'}</AppText>
            <AppText style={styles.heroSubtitle}>{upcoming.length} yaklaşan ders · {unread} okunmamış mesaj</AppText>
          </View>
          <Pressable onPress={() => onNavigate('calendar')} style={styles.heroArrow}><MaterialCommunityIcons name="arrow-right" size={22} color={colors.primary} /></Pressable>
        </LinearGradient>
        </ImageBackground>

        <Card style={styles.commandCard}>
          <View style={styles.commandHeader}>
            <View><AppText style={styles.commandEyebrow}>HAFTALIK TEMPO</AppText><AppText style={styles.commandValue}>{todayLessons.length + upcoming.length}<AppText style={styles.commandUnit}> temas noktası</AppText></AppText></View>
            <View style={styles.livePill}><View style={styles.liveDot} /><AppText style={styles.liveText}>CANLI</AppText></View>
          </View>
          <TrendChart values={[2, 4, 3, 6, 5, Math.max(6, upcoming.length), activeStudents]} height={84} />
          <View style={styles.commandMeta}><AppText style={styles.commandMetaText}>PZT</AppText><AppText style={styles.commandMetaText}>BUGÜN</AppText><AppText style={styles.commandMetaText}>PAZ</AppText></View>
        </Card>

        <View style={styles.statsGrid}>
          <StatCard icon="calendar-week-outline" value={`${weeklyLessons}`} label="Bu haftaki ders" color={colors.infoSoft} onPress={() => onNavigate('calendar')} />
          <StatCard icon="run-fast" value={`${atRiskStudents.length}`} label="Programı aksatan" color={colors.dangerSoft} onPress={() => onNavigate('students')} />
          <StatCard icon="ticket-confirmation-outline" value={`${expiringPackages.length}`} label="Paketi bitiyor" color={colors.warningSoft} onPress={() => onNavigate('students')} />
          <StatCard icon="bell-badge-outline" value={`${notifications.length}`} label="Yeni bildirim" color={colors.primaryLight} onPress={() => onNavigate('messages')} />
        </View>

        {(atRiskStudents.length || expiringPackages.length) ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Dikkat gereken öğrenciler" action="Öğrenciler" onAction={() => onNavigate('students')} />
            {[...new Set([...atRiskStudents, ...expiringPackages])].slice(0, 5).map((student) => {
              const atRisk = atRiskStudents.some((item) => item.id === student.id);
              const packageAlert = expiringPackages.some((item) => item.id === student.id);
              return (
                <Card key={student.id} onPress={() => onStudent(student.id)} style={styles.alertCard}>
                  <Avatar name={student.fullName} size={42} />
                  <View style={styles.flex}><AppText style={typography.bodyMedium}>{student.fullName}</AppText><AppText style={styles.studentGoal}>{atRisk ? `Son 7 günde hedefinin altında · ${student.weeklyGoal} gün hedef` : 'Antrenman düzeni iyi'}</AppText></View>
                  <View style={styles.alertChips}>{atRisk ? <Chip label="AKSATIYOR" tone="danger" /> : null}{packageAlert ? <Chip label={`${student.lessonPackage?.remainingLessons ?? 0} DERS`} tone="warning" /> : null}</View>
                </Card>
              );
            })}
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <SectionHeader title="Yeni öğrenci hareketleri" />
          {notifications.length ? notifications.slice(0, 6).map((event) => {
            const student = students.find((item) => item.id === event.studentId);
            const icon = event.type === 'meal' ? 'food-apple-outline' : event.type === 'measurement' ? 'scale-bathroom' : 'message-text-outline';
            return (
              <Card key={`${event.type}-${event.id}`} onPress={() => onStudent(event.studentId)} style={styles.activityCard}>
                <View style={styles.activityIcon}><MaterialCommunityIcons name={icon} size={21} color={colors.primary} /></View>
                <View style={styles.flex}><AppText style={typography.bodyMedium}>{event.title} · {student?.fullName ?? 'Öğrenci'}</AppText><AppText style={styles.studentGoal} numberOfLines={1}>{event.detail}</AppText></View>
                <AppText style={styles.activityDate}>{formatDate(event.at)}</AppText>
              </Card>
            );
          }) : <Card><AppText style={styles.emptyText}>Son 7 günde yeni öğün, ölçüm veya okunmamış mesaj yok.</AppText></Card>}
        </View>

        {newStudents.length ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Yeni kayıtlar" action="Tümü" onAction={() => onNavigate('students')} />
            {newStudents.slice(0, 2).map((student) => (
              <Card key={student.id} onPress={() => onStudent(student.id)} style={styles.studentCard}>
                <Avatar name={student.fullName} size={50} accent />
                <View style={styles.flex}>
                  <View style={styles.studentNameRow}><AppText style={typography.bodyMedium}>{student.fullName}</AppText><Chip label="YENİ" tone="warning" /></View>
                  <AppText style={styles.studentGoal}>{student.goal} · {student.weeklyGoal} gün/hafta</AppText>
                  <AppText style={styles.studentJoined}>Kayıt: {new Intl.RelativeTimeFormat('tr', { numeric: 'auto' }).format(-Math.max(1, Math.round((Date.now() - new Date(student.createdAt).getTime()) / 86_400_000)), 'day')}</AppText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.inkSoft} />
              </Card>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <SectionHeader title="Sıradaki dersler" action="Takvim" onAction={() => onNavigate('calendar')} />
          {nextLessons.length ? nextLessons.map((appointment, index) => {
            const student = students.find((item) => item.id === appointment.studentId);
            return (
              <Card key={appointment.id} onPress={() => student && onStudent(student.id)} style={styles.lessonCard}>
                <View style={[styles.lessonTime, index === 0 && styles.lessonTimeNext]}>
                  <AppText style={[styles.lessonTimeText, index === 0 && styles.lessonTimeTextNext]}>{formatTime(appointment.startAt)}</AppText>
                  <AppText style={[styles.lessonDay, index === 0 && styles.lessonTimeTextNext]}>{relativeDay(appointment.startAt)}</AppText>
                </View>
                <View style={styles.flex}>
                  <AppText style={typography.bodyMedium}>{student?.fullName ?? 'Öğrenci'}</AppText>
                  <AppText style={styles.studentGoal}>{appointment.note}</AppText>
                  <AppText style={styles.lessonMeta}>{formatAppointment(appointment.startAt)}</AppText>
                </View>
                <Chip label={appointment.status === 'pending' ? 'Onay bekliyor' : 'Onaylı'} tone={appointment.status === 'pending' ? 'warning' : 'success'} />
              </Card>
            );
          }) : <Card><AppText style={styles.emptyText}>Yaklaşan ders bulunmuyor.</AppText></Card>}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="Hızlı işlemler" />
          <View style={styles.quickRow}>
            <QuickAction icon="account-search-outline" label="Öğrenci bul" onPress={() => onNavigate('students')} />
            <QuickAction icon="calendar-plus" label="Ders ekle" onPress={() => onNavigate('calendar')} />
            <QuickAction icon="message-text-outline" label="Mesajlar" onPress={() => onNavigate('messages')} />
          </View>
        </View>
      </Page>
    </View>
  );
};

const StatCard = ({ icon, value, label, color, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string; color: string; onPress: () => void }) => (
  <Card style={styles.statCard} onPress={onPress}>
    <View style={[styles.statIcon, { backgroundColor: color }]}><MaterialCommunityIcons name={icon} size={23} color={colors.primary} /></View>
    <AppText style={styles.statValue}>{value}</AppText>
    <AppText style={styles.statLabel}>{label}</AppText>
  </Card>
);

const QuickAction = ({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
    <View style={styles.quickIcon}><MaterialCommunityIcons name={icon} size={24} color={colors.primary} /></View>
    <AppText style={styles.quickLabel}>{label}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: { minHeight: 245, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.graphite },
  heroImage: { borderRadius: radius.xl },
  heroOverlay: { flex: 1, padding: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  heroIcon: { width: 55, height: 55, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  heroEyebrow: { ...typography.label, color: colors.accent },
  heroTitle: { fontSize: 27, lineHeight: 31, fontWeight: '900', color: colors.white, marginTop: 4, letterSpacing: -0.8 },
  heroSubtitle: { ...typography.caption, color: '#C5D5D0', marginTop: 5 },
  heroArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  heroDecor: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 25, borderColor: 'rgba(255,255,255,0.04)', right: -40, top: -38 },
  commandCard: { gap: spacing.sm, backgroundColor: '#0E1411', borderColor: '#314035' },
  commandHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  commandEyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.3 },
  commandValue: { fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  commandUnit: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontSize: 9, lineHeight: 11, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
  commandMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  commandMetaText: { fontSize: 9, lineHeight: 11, color: colors.inkSoft, fontWeight: '700', letterSpacing: 0.8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { width: '47%', flexGrow: 1, gap: spacing.sm, padding: spacing.md },
  statIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 25, lineHeight: 29, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.inkSoft },
  sectionBlock: { gap: spacing.md },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  alertChips: { alignItems: 'flex-end', gap: 5 },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  activityIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  activityDate: { ...typography.caption, color: colors.inkSoft },
  studentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  studentNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  studentGoal: { ...typography.caption, color: colors.inkSoft, marginTop: 3 },
  studentJoined: { ...typography.caption, color: colors.success, marginTop: 4 },
  lessonCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  lessonTime: { width: 62, minHeight: 58, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  lessonTimeNext: { backgroundColor: colors.primary },
  lessonTimeText: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
  lessonTimeTextNext: { color: colors.white },
  lessonDay: { fontSize: 10, lineHeight: 13, color: colors.inkSoft },
  lessonMeta: { fontSize: 10, lineHeight: 13, color: colors.inkSoft, marginTop: 3 },
  emptyText: { color: colors.inkSoft, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quickAction: { flex: 1, minHeight: 106, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg },
  quickIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { ...typography.caption, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
