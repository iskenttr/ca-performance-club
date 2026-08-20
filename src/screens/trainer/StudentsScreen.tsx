import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Avatar, Card, Chip, EmptyState, Page, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { StudentStatus, Trainer } from '../../types/domain';
import { formatShortDate } from '../../utils/date';

type Filter = 'all' | StudentStatus;

export const StudentsScreen = ({ onProfile, onStudent }: { onProfile: () => void; onStudent: (studentId: string) => void }) => {
  const { data, user, students } = useApp();
  const trainer = user as Trainer;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = useMemo(() => students.filter((student) => {
    const matchesFilter = filter === 'all' || student.status === filter;
    const normalized = `${student.fullName} ${student.email} ${student.goal}`.toLocaleLowerCase('tr-TR');
    return matchesFilter && normalized.includes(query.trim().toLocaleLowerCase('tr-TR'));
  }), [filter, query, students]);

  return (
    <View style={styles.root}>
      <TopBar eyebrow={`${students.length} öğrenci`} title="Öğrencilerim" name={trainer.fullName} onProfile={onProfile} />
      <Page keyboardShouldPersistTaps="handled">
        <TextField value={query} onChangeText={setQuery} placeholder="Öğrenci ara" icon="magnify" />
        <View style={styles.filters}>
          <FilterChip label={`Tümü ${students.length}`} active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label={`Aktif ${students.filter((item) => item.status === 'active').length}`} active={filter === 'active'} onPress={() => setFilter('active')} />
          <FilterChip label={`Yeni ${students.filter((item) => item.status === 'new').length}`} active={filter === 'new'} onPress={() => setFilter('new')} />
          <FilterChip label="Ara veren" active={filter === 'paused'} onPress={() => setFilter('paused')} />
        </View>

        <View style={styles.list}>
          {filtered.length ? filtered.map((student) => {
            const program = data?.workoutPrograms.find((item) => item.studentId === student.id);
            const measurements = data?.measurements.filter((item) => item.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) ?? [];
            const latest = measurements[0];
            const nextLesson = data?.appointments.filter((item) => item.studentId === student.id && item.status !== 'cancelled' && new Date(item.startAt) >= new Date()).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
            const unread = data?.messages.filter((item) => item.studentId === student.id && item.senderId === student.id && !item.readAt).length ?? 0;
            return (
              <Card key={student.id} onPress={() => onStudent(student.id)} style={styles.studentCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarWrap}>
                    <Avatar name={student.fullName} size={54} accent={student.status === 'new'} />
                    {unread ? <View style={styles.unreadBadge}><AppText style={styles.unreadText}>{unread}</AppText></View> : null}
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.nameRow}><AppText style={typography.h3}>{student.fullName}</AppText><Chip label={student.status === 'new' ? 'Yeni' : student.status === 'active' ? 'Aktif' : 'Ara verdi'} tone={student.status === 'new' ? 'warning' : student.status === 'active' ? 'success' : 'default'} /></View>
                    <AppText style={styles.goal}>{student.goal} · {student.level}</AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.inkSoft} />
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}><AppText style={styles.metricLabel}>PROGRAM</AppText><AppText style={styles.metricValue} numberOfLines={1}>{program ? `${program.days.length} gün/hafta` : 'Atanmadı'}</AppText></View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metric}><AppText style={styles.metricLabel}>SON ÖLÇÜM</AppText><AppText style={styles.metricValue}>{latest ? `${latest.weightKg} kg` : '—'}</AppText></View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metric}><AppText style={styles.metricLabel}>SONRAKİ DERS</AppText><AppText style={styles.metricValue}>{nextLesson ? formatShortDate(nextLesson.startAt) : '—'}</AppText></View>
                </View>
              </Card>
            );
          }) : <Card><EmptyState icon="account-search-outline" title="Öğrenci bulunamadı" description="Arama kelimesini veya filtreyi değiştirerek tekrar dene." /></Card>}
        </View>
      </Page>
    </View>
  );
};

const FilterChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}><AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText></Pressable>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { ...typography.caption, color: colors.inkSoft },
  filterTextActive: { color: colors.white },
  list: { gap: spacing.md },
  studentCard: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarWrap: { position: 'relative' },
  unreadBadge: { position: 'absolute', right: -4, top: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 9, lineHeight: 11, color: colors.white, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  goal: { ...typography.caption, color: colors.inkSoft, marginTop: 4 },
  metricsRow: { flexDirection: 'row', alignItems: 'stretch', paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  metric: { flex: 1, gap: 4, paddingHorizontal: spacing.sm },
  metricLabel: { fontSize: 9, lineHeight: 11, fontWeight: '700', color: colors.inkSoft },
  metricValue: { ...typography.caption, color: colors.ink, fontWeight: '700' },
  metricDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

