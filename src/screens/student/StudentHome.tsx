import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { ActivityRings, ProgressRing, TrendChart } from '../../components/graphics';
import { AppText, Avatar, Button, Card, Chip, Page, SectionHeader } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { useAppleHealth } from '../../hooks/useAppleHealth';
import { Student } from '../../types/domain';
import { formatAppointment, formatShortDate, relativeDay, toDateInput } from '../../utils/date';
import type { StudentRoute } from './StudentApp';

export const StudentHome = ({ onNavigate }: { onNavigate: (route: StudentRoute) => void }) => {
  const { data, user } = useApp();
  const { status: healthStatus, snapshot: health, connect: connectHealth, refresh: refreshHealth } = useAppleHealth();
  const student = user as Student;
  const program = data?.workoutPrograms.find((item) => item.studentId === student.id);
  const measurements = (data?.measurements.filter((item) => item.studentId === student.id) ?? []).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const latestMeasurement = measurements.at(-1);
  const firstMeasurement = measurements[0];
  const weightDelta = latestMeasurement && firstMeasurement ? latestMeasurement.weightKg - firstMeasurement.weightKg : 0;
  const appointments = (data?.appointments.filter((item) => item.studentId === student.id && item.status !== 'cancelled' && new Date(item.startAt) >= new Date()) ?? []).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const nextAppointment = appointments[0];
  const firstName = student.fullName.split(' ')[0];
  const today = toDateInput();
  const day = program?.days[0];
  const completed = day?.exercises.filter((exercise) => data?.workoutCompletions.some((item) => item.studentId === student.id && item.exerciseId === exercise.id && item.completedOn === today)).length ?? 0;
  const total = day?.exercises.length ?? 0;
  const completionPercent = total ? Math.round((completed / total) * 100) : 0;
  const healthConnected = healthStatus === 'connected';
  const connectAppleHealth = async () => {
    if (healthStatus === 'unavailable') {
      Alert.alert('iPhone gerekli', 'Apple Health bağlantısı gerçek bir iPhone’daki CA Performance Club geliştirme veya App Store sürümünde açılır.');
      return;
    }
    await connectHealth();
  };

  const modules: Array<{ title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; route: StudentRoute }> = [
    { title: 'Beslenme planım', subtitle: data?.nutritionPlans.find((item) => item.studentId === student.id)?.title ?? 'Plan bekleniyor', icon: 'food-apple-outline', color: '#29331C', route: 'program' },
    { title: 'Ölçümlerim', subtitle: latestMeasurement ? `${latestMeasurement.weightKg.toFixed(1)} kg · ${formatShortDate(latestMeasurement.date)}` : 'İlk ölçümünü ekle', icon: 'chart-line', color: '#1A273D', route: 'progress' },
    { title: 'Gelişim fotoğrafları', subtitle: `${data?.progressPhotos.filter((item) => item.studentId === student.id).length ?? 0} fotoğraf`, icon: 'image-multiple-outline', color: '#30251F', route: 'progress' },
    { title: 'Cem Hoca’ya yaz', subtitle: 'Sorunu veya durumunu paylaş', icon: 'message-text-outline', color: '#173329', route: 'messages' },
  ];

  return (
    <View style={styles.root}>
      <TopBar eyebrow="CA PERFORMANCE CLUB" title={`Merhaba, ${firstName}`} name={student.fullName} onProfile={() => onNavigate('profile')} />
      <Page>
        <ImageBackground source={require('../../../assets/premium/athlete-hero.png')} style={styles.workoutHero} imageStyle={styles.workoutImage} resizeMode="cover">
        <LinearGradient colors={['rgba(5,8,7,0.12)', 'rgba(5,8,7,0.66)', '#090D0B']} locations={[0, 0.54, 1]} style={styles.heroOverlay}>
          <View style={styles.heroTop}>
            <Chip label={completed ? `${completed}/${total} tamamlandı` : 'Bugünün antrenmanı'} selected />
            <View style={styles.durationPill}>
              <MaterialCommunityIcons name="clock-outline" size={15} color={colors.white} />
              <AppText style={styles.durationText}>{day?.durationMinutes ?? 0} dk</AppText>
            </View>
          </View>
          <View style={styles.heroBody}>
            <AppText style={styles.heroEyebrow}>{day?.label ?? 'Program bekleniyor'}</AppText>
            <AppText style={styles.heroTitle}>{day?.title ?? 'Cem Hoca planını hazırlıyor'}</AppText>
            <AppText style={styles.heroDescription}>{day?.focus ?? 'Program atandığında burada göreceksin.'}</AppText>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completionPercent}%` }]} /></View>
            <AppText style={styles.progressText}>%{completionPercent}</AppText>
          </View>
          <Pressable onPress={() => onNavigate('program')} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
            <AppText style={styles.heroButtonText}>{completed ? 'Antrenmanına devam et' : 'Antrenmanı aç'}</AppText>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.primary} />
          </Pressable>
        </LinearGradient>
        </ImageBackground>

        <Card style={styles.performanceCard}>
          <View style={styles.performanceCopy}>
            <AppText style={styles.performanceEyebrow}>PERFORMANS ÖZETİ</AppText>
            <AppText style={styles.performanceTitle}>Ritmini koru.</AppText>
            <AppText style={styles.performanceBody}>Son ölçümler ve bugünkü antrenman verin tek görünümde.</AppText>
            <TrendChart values={measurements.slice(-6).map((item) => item.weightKg)} height={72} />
          </View>
          <ProgressRing value={completionPercent} size={104} label="bugün" />
        </Card>

        <Card style={styles.appleCard}>
          <View style={styles.appleHeader}>
            <View style={styles.appleBrand}>
              <View style={styles.appleIcon}><MaterialCommunityIcons name="apple" size={25} color={colors.white} /></View>
              <View><AppText style={styles.appleEyebrow}>APPLE HEALTH</AppText><AppText style={styles.appleTitle}>Fitness verilerin</AppText></View>
            </View>
            <Chip label={healthConnected ? 'BAĞLI' : 'HAZIR'} tone={healthConnected ? 'success' : 'default'} />
          </View>
          <View style={styles.appleBody}>
            <ActivityRings move={(health.activeEnergyKcal / 600) * 100} exercise={(health.exerciseMinutes / 30) * 100} steps={(health.steps / 8000) * 100} size={104} />
            <View style={styles.appleMetrics}>
              <HealthMetric color="#FF375F" value={healthConnected ? `${health.activeEnergyKcal}` : '—'} label="aktif kcal" />
              <HealthMetric color="#D7FF45" value={healthConnected ? `${health.exerciseMinutes}` : '—'} label="egzersiz dk" />
              <HealthMetric color="#45D5A2" value={healthConnected ? health.steps.toLocaleString('tr-TR') : '—'} label="adım" />
            </View>
          </View>
          <AppText style={styles.applePrivacy}>{healthConnected ? `${health.workoutCount} antrenman bugün · Veriler yalnızca cihazından okunur.` : 'Adım, aktif kalori, egzersiz süresi ve antrenmanlarını izin verdiğinde gösterir.'}</AppText>
          {healthConnected ? <Button label="Verileri yenile" icon="refresh" variant="secondary" compact onPress={refreshHealth} /> : <Button label={healthStatus === 'connecting' ? 'Apple Health açılıyor…' : 'Apple Health’e bağlan'} icon="apple" variant="accent" loading={healthStatus === 'connecting'} onPress={connectAppleHealth} />}
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.infoSoft }]}><MaterialCommunityIcons name="scale-bathroom" size={21} color={colors.info} /></View>
            <AppText style={styles.statValue}>{latestMeasurement ? latestMeasurement.weightKg.toFixed(1) : '—'} <AppText style={styles.statUnit}>kg</AppText></AppText>
            <AppText style={styles.statLabel}>{weightDelta ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg toplam` : 'Güncel kilo'}</AppText>
          </Card>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}><MaterialCommunityIcons name="target" size={21} color={colors.success} /></View>
            <AppText style={styles.statValue}>{student.weeklyGoal} <AppText style={styles.statUnit}>gün</AppText></AppText>
            <AppText style={styles.statLabel}>Haftalık hedef</AppText>
          </Card>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="Sıradaki ders" action="Takvim" onAction={() => onNavigate('calendar')} />
          {nextAppointment ? (
            <Card onPress={() => onNavigate('calendar')} style={styles.appointmentCard}>
              <View style={styles.dateBox}>
                <AppText style={styles.dateDay}>{new Date(nextAppointment.startAt).getDate()}</AppText>
                <AppText style={styles.dateMonth}>{new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(new Date(nextAppointment.startAt)).replace('.', '').toLocaleUpperCase('tr-TR')}</AppText>
              </View>
              <View style={styles.flex}>
                <View style={styles.appointmentTitleRow}>
                  <AppText style={typography.bodyMedium}>{relativeDay(nextAppointment.startAt)} · Birebir ders</AppText>
                  <Chip label={nextAppointment.status === 'confirmed' ? 'Onaylandı' : 'Bekliyor'} tone={nextAppointment.status === 'confirmed' ? 'success' : 'warning'} />
                </View>
                <AppText style={styles.appointmentMeta}>{formatAppointment(nextAppointment.startAt)} · {nextAppointment.durationMinutes} dk</AppText>
                <AppText style={styles.appointmentNote}>{nextAppointment.note}</AppText>
              </View>
            </Card>
          ) : (
            <Card><AppText style={styles.muted}>Yaklaşan dersin bulunmuyor. Takvimden talep oluşturabilirsin.</AppText></Card>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="Her şey tek yerde" />
          <View style={styles.moduleGrid}>
            {modules.map((module) => (
              <Pressable key={module.title} onPress={() => onNavigate(module.route)} style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}>
                <View style={[styles.moduleIcon, { backgroundColor: module.color }]}>
                  <MaterialCommunityIcons name={module.icon} size={25} color={colors.primary} />
                </View>
                <AppText style={styles.moduleTitle}>{module.title}</AppText>
                <AppText style={styles.moduleSubtitle} numberOfLines={2}>{module.subtitle}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <Card style={styles.coachCard} onPress={() => onNavigate('messages')}>
          <Avatar name="Cem Arslanoğlu" size={58} accent />
          <View style={styles.flex}>
            <AppText style={typography.h3}>Cem Arslanoğlu</AppText>
            <AppText style={styles.coachTitle}>Personal Trainer · Sana özel takip</AppText>
            <View style={styles.coachOnline}><View style={styles.onlineDot} /><AppText style={styles.onlineText}>Mesaj gönderebilirsin</AppText></View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.inkSoft} />
        </Card>
      </Page>
    </View>
  );
};

const HealthMetric = ({ color, value, label }: { color: string; value: string; label: string }) => (
  <View style={styles.healthMetric}>
    <View style={[styles.healthDot, { backgroundColor: color }]} />
    <View><AppText style={styles.healthValue}>{value}</AppText><AppText style={styles.healthLabel}>{label}</AppText></View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  workoutHero: { borderRadius: radius.xl, minHeight: 430, overflow: 'hidden', backgroundColor: colors.graphite, justifyContent: 'flex-end' },
  workoutImage: { borderRadius: radius.xl },
  heroOverlay: { flex: 1, padding: spacing.xl, paddingTop: spacing.lg, justifyContent: 'space-between', gap: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  durationPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  durationText: { ...typography.caption, color: colors.white },
  heroBody: { gap: 4, zIndex: 1 },
  heroEyebrow: { ...typography.label, color: colors.accent, textTransform: 'uppercase' },
  heroTitle: { fontSize: 35, lineHeight: 38, fontWeight: '900', color: colors.white, letterSpacing: -1.2, maxWidth: 300 },
  heroDescription: { color: '#C8D8D3' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, zIndex: 1 },
  progressTrack: { flex: 1, height: 7, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
  progressText: { ...typography.caption, color: colors.white, minWidth: 32, textAlign: 'right' },
  heroButton: { minHeight: 52, backgroundColor: colors.accent, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, zIndex: 1 },
  heroButtonText: { ...typography.bodyMedium, color: colors.graphite },
  decorCircle: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 28, borderColor: 'rgba(255,255,255,0.035)', right: -55, top: 38 },
  performanceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: '#0E1411', borderColor: '#314035' },
  performanceCopy: { flex: 1, gap: 4 },
  performanceEyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.3 },
  performanceTitle: { fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.7 },
  performanceBody: { ...typography.caption, color: colors.inkSoft, maxWidth: 210 },
  appleCard: { gap: spacing.lg, backgroundColor: '#0D100F', borderColor: '#343B38' },
  appleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  appleBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appleIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#353A38' },
  appleEyebrow: { ...typography.label, color: colors.inkSoft, letterSpacing: 1.2 },
  appleTitle: { ...typography.h3, marginTop: 1 },
  appleBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  appleMetrics: { flex: 1, gap: spacing.md },
  healthMetric: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthValue: { fontSize: 19, lineHeight: 21, fontWeight: '900', letterSpacing: -0.4 },
  healthLabel: { ...typography.caption, color: colors.inkSoft, marginTop: 1 },
  applePrivacy: { ...typography.caption, color: colors.inkSoft, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.sm, padding: spacing.md },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 21, lineHeight: 25, fontWeight: '800' },
  statUnit: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
  statLabel: { ...typography.caption, color: colors.inkSoft },
  sectionBlock: { gap: spacing.md },
  appointmentCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  dateBox: { width: 58, height: 64, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 24, lineHeight: 27, fontWeight: '800', color: colors.white },
  dateMonth: { ...typography.label, color: colors.accent },
  appointmentTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  appointmentMeta: { ...typography.caption, color: colors.inkSoft, marginTop: 4 },
  appointmentNote: { ...typography.caption, color: colors.ink, marginTop: 3 },
  muted: { color: colors.inkSoft },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  moduleCard: { width: '48%', flexGrow: 1, minHeight: 160, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  moduleIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  moduleTitle: { ...typography.bodyMedium },
  moduleSubtitle: { ...typography.caption, color: colors.inkSoft },
  coachCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  coachTitle: { ...typography.caption, color: colors.inkSoft, marginTop: 2 },
  coachOnline: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { ...typography.caption, color: colors.success },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
