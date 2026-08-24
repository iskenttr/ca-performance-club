import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../constants';
import { useApp } from '../context/AppContext';
import { Student } from '../types/domain';
import { formatShortDate } from '../utils/date';
import { ProgressRing, TrendChart } from './graphics';
import { AppText, Card } from './ui';

const signed = (value: number, suffix: string) => `${value > 0 ? '+' : ''}${value.toFixed(1)} ${suffix}`;

export const ProgressReport = ({ student }: { student: Student }) => {
  const { data } = useApp();
  const report = useMemo(() => {
    const measurements = (data?.measurements.filter((item) => item.studentId === student.id) ?? []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = measurements[0];
    const latest = measurements.at(-1);
    const since = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const completions = data?.workoutCompletions.filter((item) => item.studentId === student.id && new Date(`${item.completedOn}T12:00:00`).getTime() >= since) ?? [];
    const activeDays = new Set(completions.map((item) => item.completedOn)).size;
    const workoutTarget = Math.max(student.weeklyGoal * 4, 1);
    const workoutRate = Math.min(100, Math.round((activeDays / workoutTarget) * 100));
    const lessons = data?.appointments.filter((item) => item.studentId === student.id && new Date(item.startAt).getTime() < Date.now()) ?? [];
    const completedLessons = lessons.filter((item) => item.status === 'completed').length;
    const cancelledLessons = lessons.filter((item) => item.status === 'cancelled').length;
    const lessonRate = completedLessons + cancelledLessons ? Math.round((completedLessons / (completedLessons + cancelledLessons)) * 100) : 0;
    const measurementRate = Math.min(100, measurements.length * 25);
    const scoreParts = [workoutRate, measurementRate, ...(completedLessons + cancelledLessons ? [lessonRate] : [])];
    const score = Math.round(scoreParts.reduce((sum, value) => sum + value, 0) / Math.max(scoreParts.length, 1));
    return { measurements, first, latest, activeDays, workoutTarget, workoutRate, completedLessons, lessonRate, score };
  }, [data, student]);

  const weightDelta = report.first && report.latest ? report.latest.weightKg - report.first.weightKg : undefined;
  const waistDelta = report.first?.waistCm != null && report.latest?.waistCm != null ? report.latest.waistCm - report.first.waistCm : undefined;
  const fatDelta = report.first?.bodyFatPercent != null && report.latest?.bodyFatPercent != null ? report.latest.bodyFatPercent - report.first.bodyFatPercent : undefined;

  return (
    <View style={styles.root}>
      <Card style={styles.hero}>
        <View style={styles.heroCopy}>
          <AppText style={styles.eyebrow}>SON 28 GÜN</AppText>
          <AppText style={styles.title}>Gelişim raporu</AppText>
          <AppText style={styles.muted}>{report.latest ? `Son ölçüm ${formatShortDate(report.latest.date)}` : 'İlk ölçüm bekleniyor'}</AppText>
          <TrendChart values={report.measurements.slice(-8).map((item) => item.weightKg)} height={72} />
        </View>
        <ProgressRing value={report.score} size={104} label="uyum" />
      </Card>

      <View style={styles.grid}>
        <ReportMetric icon="calendar-check-outline" label="Aktif gün" value={`${report.activeDays}/${report.workoutTarget}`} detail={`Program uyumu %${report.workoutRate}`} color={colors.successSoft} />
        <ReportMetric icon="account-check-outline" label="Tamamlanan ders" value={`${report.completedLessons}`} detail={report.completedLessons ? `Katılım %${report.lessonRate}` : 'Ders verisi bekleniyor'} color={colors.infoSoft} />
        <ReportMetric icon="scale-bathroom" label="Kilo değişimi" value={weightDelta == null ? '—' : signed(weightDelta, 'kg')} detail={`${report.measurements.length} ölçüm kaydı`} color={colors.primaryLight} />
        <ReportMetric icon="tape-measure" label="Bel değişimi" value={waistDelta == null ? '—' : signed(waistDelta, 'cm')} detail={fatDelta == null ? 'Yağ oranı verisi bekleniyor' : `Yağ oranı ${signed(fatDelta, 'puan')}`} color={colors.warningSoft} />
      </View>

      <Card style={styles.insight}>
        <View style={styles.insightIcon}><MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={23} color={colors.primary} /></View>
        <View style={styles.flex}>
          <AppText style={typography.bodyMedium}>Rapor özeti</AppText>
          <AppText style={styles.muted}>
            {report.activeDays >= report.workoutTarget
              ? 'Son dört haftalık antrenman hedefi tamamlandı. Düzen korunuyor.'
              : report.activeDays
                ? `Hedefe ulaşmak için bu dönemde ${Math.max(report.workoutTarget - report.activeDays, 0)} aktif gün daha gerekiyor.`
                : 'Antrenman tamamlamaları işaretlendikçe uyum raporu burada oluşacak.'}
          </AppText>
        </View>
      </Card>
      <AppText style={styles.disclaimer}>Rapor; uygulamadaki ölçüm, tamamlanan antrenman ve ders kayıtlarından oluşturulur. Tıbbi değerlendirme değildir.</AppText>
    </View>
  );
};

const ReportMetric = ({ icon, label, value, detail, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; detail: string; color: string }) => (
  <Card style={styles.metric}>
    <View style={[styles.metricIcon, { backgroundColor: color }]}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /></View>
    <AppText style={styles.metricLabel}>{label}</AppText>
    <AppText style={styles.metricValue}>{value}</AppText>
    <AppText style={styles.metricDetail}>{detail}</AppText>
  </Card>
);

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#0E1411', borderColor: '#35452D' },
  heroCopy: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.2 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.6 },
  muted: { ...typography.caption, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '46%', minWidth: 0, flexGrow: 1, gap: spacing.xs, padding: spacing.md, minHeight: 142 },
  metricIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  metricLabel: { ...typography.caption, color: colors.inkSoft },
  metricValue: { fontSize: 20, lineHeight: 24, fontWeight: '900' },
  metricDetail: { ...typography.caption, color: colors.inkSoft },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.primaryLight },
  insightIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  disclaimer: { ...typography.caption, color: colors.inkSoft, paddingHorizontal: spacing.sm, textAlign: 'center' },
});
