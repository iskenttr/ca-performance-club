import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { resolveApiUrl } from '../services/api';
import { MealEntry, MealType, NutritionTargets } from '../types/domain';
import { formatDate, formatTime, toDateInput } from '../utils/date';
import { AppText, Card, EmptyState } from './ui';

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle',
  dinner: 'Akşam',
  snack: 'Ara öğün',
};

export const mealTotals = (entries: MealEntry[]) => entries.reduce(
  (total, entry) => ({
    caloriesKcal: total.caloriesKcal + entry.caloriesKcal,
    proteinG: total.proteinG + entry.proteinG,
    carbsG: total.carbsG + entry.carbsG,
    fatG: total.fatG + entry.fatG,
  }),
  { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
);

const value = (amount: number) => Math.round(amount).toLocaleString('tr-TR');

const TargetRow = ({ label, amount, target, unit }: { label: string; amount: number; target?: number; unit: string }) => (
  <View style={styles.targetBlock}>
    <View style={styles.targetTop}>
      <AppText style={styles.targetLabel}>{label}</AppText>
      <AppText style={styles.targetValue}>{value(amount)}{target ? ` / ${value(target)}` : ''} {unit}</AppText>
    </View>
    {target ? (
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, amount / target * 100)}%` }]} /></View>
    ) : null}
  </View>
);

export const DailyNutritionSummary = ({ entries, targets, title = 'Bugün' }: { entries: MealEntry[]; targets?: NutritionTargets; title?: string }) => {
  const totals = useMemo(() => mealTotals(entries), [entries]);
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIcon}><MaterialCommunityIcons name="chart-donut" size={23} color={colors.accent} /></View>
        <View style={styles.flex}>
          <AppText style={typography.h2}>{title}</AppText>
          <AppText style={styles.muted}>{entries.length} kayıtlı öğün</AppText>
        </View>
      </View>
      <AppText style={styles.calories}>{value(totals.caloriesKcal)}{targets ? ` / ${value(targets.caloriesKcal)}` : ''} <AppText style={styles.calorieUnit}>kcal</AppText></AppText>
      <View style={styles.targets}>
        <TargetRow label="Protein" amount={totals.proteinG} target={targets?.proteinG} unit="g" />
        <TargetRow label="Karbonhidrat" amount={totals.carbsG} target={targets?.carbsG} unit="g" />
        <TargetRow label="Yağ" amount={totals.fatG} target={targets?.fatG} unit="g" />
      </View>
      {!targets ? <AppText style={styles.targetHint}>Günlük hedef henüz tanımlanmadı. Cem Hoca beslenme planından hedef ekleyebilir.</AppText> : null}
    </Card>
  );
};

export const MealHistory = ({ entries, emptyDescription }: { entries: MealEntry[]; emptyDescription?: string }) => {
  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt));
    return sorted.reduce<{ date: string; entries: MealEntry[] }[]>((all, entry) => {
      const date = toDateInput(new Date(entry.eatenAt));
      const current = all[all.length - 1];
      if (current?.date === date) current.entries.push(entry);
      else all.push({ date, entries: [entry] });
      return all;
    }, []);
  }, [entries]);

  if (!groups.length) {
    return <Card><EmptyState icon="food-variant" title="Henüz öğün yok" description={emptyDescription ?? 'Fotoğraftan analiz edilen öğünler burada görünecek.'} /></Card>;
  }

  return (
    <View style={styles.history}>
      {groups.map((group) => {
        const totals = mealTotals(group.entries);
        return (
          <View key={group.date} style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <AppText style={typography.h3}>{group.date === toDateInput() ? 'Bugün' : formatDate(`${group.date}T12:00:00`)}</AppText>
              <AppText style={styles.dayTotal}>{value(totals.caloriesKcal)} kcal</AppText>
            </View>
            {group.entries.map((entry) => (
              <Card key={entry.id} style={styles.mealCard}>
                <Image source={{ uri: resolveApiUrl(entry.photoUri) }} style={styles.photo} resizeMode="cover" />
                <View style={styles.mealContent}>
                  <View style={styles.mealMeta}>
                    <AppText style={styles.mealType}>{mealTypeLabels[entry.mealType]}</AppText>
                    <AppText style={styles.muted}>{formatTime(entry.eatenAt)}</AppText>
                  </View>
                  <AppText style={typography.bodyMedium} numberOfLines={2}>{entry.name}</AppText>
                  <AppText style={styles.muted}>{entry.portionGrams ? `${value(entry.portionGrams)} g · ` : ''}{value(entry.caloriesKcal)} kcal</AppText>
                  <AppText style={styles.macros}>P {value(entry.proteinG)} · K {value(entry.carbsG)} · Y {value(entry.fatG)} g</AppText>
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { ...typography.caption, color: colors.inkSoft },
  summaryCard: { gap: spacing.lg, backgroundColor: '#0D1511', borderColor: '#304035' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#29331C', alignItems: 'center', justifyContent: 'center' },
  calories: { fontSize: 29, lineHeight: 34, fontWeight: '900', color: colors.white },
  calorieUnit: { ...typography.bodyMedium, color: colors.inkSoft },
  targets: { gap: spacing.md },
  targetBlock: { gap: 6 },
  targetTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  targetLabel: { color: colors.inkSoft },
  targetValue: { ...typography.bodyMedium },
  track: { height: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },
  targetHint: { ...typography.caption, color: colors.warning },
  history: { gap: spacing.xl },
  dayGroup: { gap: spacing.sm },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTotal: { ...typography.bodyMedium, color: colors.primary },
  mealCard: { padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photo: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  mealContent: { flex: 1, minWidth: 0, gap: 3 },
  mealMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  mealType: { ...typography.label, color: colors.accent },
  macros: { ...typography.caption, color: colors.primary },
});
