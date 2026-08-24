import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { MealUpdateInput, resolveApiUrl } from '../services/api';
import { MealEntry, MealType, NutritionTargets } from '../types/domain';
import { formatDate, formatTime, toDateInput } from '../utils/date';
import { AppText, Button, Card, Chip, EmptyState, ModalSheet, SegmentedControl, TextField } from './ui';

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
      <View style={styles.targetNumbers}>
        <AppText style={styles.targetValue}>{value(amount)}{target ? ` / ${value(target)}` : ''} {unit}</AppText>
        {target ? <AppText style={styles.remaining}>{Math.max(0, Math.round(target - amount))} {unit} kaldı</AppText> : null}
      </View>
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
      {targets ? (
        <View style={styles.calorieProgressBlock}>
          <View style={styles.calorieTrack}><View style={[styles.calorieFill, { width: `${Math.min(100, totals.caloriesKcal / targets.caloriesKcal * 100)}%` }]} /></View>
          <View style={styles.calorieFooter}><AppText style={styles.muted}>Günlük hedefin %{Math.min(100, Math.round(totals.caloriesKcal / targets.caloriesKcal * 100))}&apos;i</AppText><AppText style={styles.calorieRemaining}>{value(Math.max(0, targets.caloriesKcal - totals.caloriesKcal))} kcal kaldı</AppText></View>
        </View>
      ) : null}
      <View style={styles.targets}>
        <TargetRow label="Protein" amount={totals.proteinG} target={targets?.proteinG} unit="g" />
        <TargetRow label="Karbonhidrat" amount={totals.carbsG} target={targets?.carbsG} unit="g" />
        <TargetRow label="Yağ" amount={totals.fatG} target={targets?.fatG} unit="g" />
      </View>
      {!targets ? <AppText style={styles.targetHint}>Günlük hedef henüz tanımlanmadı. Cem Hoca beslenme planından hedef ekleyebilir.</AppText> : null}
    </Card>
  );
};

type TrendMode = 'day' | 'week';

export const NutritionTrend = ({ entries, target }: { entries: MealEntry[]; target?: number }) => {
  const [mode, setMode] = useState<TrendMode>('week');
  const points = useMemo(() => {
    if (mode === 'day') {
      const today = toDateInput();
      return (Object.keys(mealTypeLabels) as MealType[]).map((mealType) => ({
        label: mealTypeLabels[mealType].slice(0, 3),
        amount: mealTotals(entries.filter((entry) => toDateInput(new Date(entry.eatenAt)) === today && entry.mealType === mealType)).caloriesKcal,
      }));
    }
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = toDateInput(date);
      return {
        label: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(date).slice(0, 2),
        amount: mealTotals(entries.filter((entry) => toDateInput(new Date(entry.eatenAt)) === key)).caloriesKcal,
      };
    });
  }, [entries, mode]);
  const max = Math.max(target ?? 0, ...points.map((point) => point.amount), 1);

  return (
    <Card style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View style={styles.flex}><AppText style={typography.h3}>Kalori görünümü</AppText><AppText style={styles.muted}>{mode === 'day' ? 'Bugünkü öğün dağılımı' : 'Son 7 gün'}</AppText></View>
        <View style={styles.trendToggle}><SegmentedControl value={mode} options={[{ value: 'day', label: 'Gün' }, { value: 'week', label: 'Hafta' }]} onChange={setMode} /></View>
      </View>
      <View style={styles.chart}>
        {points.map((point, index) => (
          <View key={`${point.label}-${index}`} style={styles.chartColumn}>
            <AppText style={styles.chartValue}>{point.amount ? value(point.amount) : '–'}</AppText>
            <View style={styles.chartTrack}><View style={[styles.chartBar, { height: `${Math.max(point.amount ? 8 : 2, point.amount / max * 100)}%` }]} /></View>
            <AppText style={styles.chartLabel}>{point.label}</AppText>
          </View>
        ))}
      </View>
      {target ? <View style={styles.targetLegend}><View style={styles.legendDot} /><AppText style={styles.muted}>Günlük hedef: {value(target)} kcal</AppText></View> : null}
    </Card>
  );
};

export const MealHistory = ({
  entries,
  emptyDescription,
  editable = false,
  onUpdate,
  onDelete,
  onRepeat,
}: {
  entries: MealEntry[];
  emptyDescription?: string;
  editable?: boolean;
  onUpdate?: (mealId: string, input: MealUpdateInput) => Promise<void>;
  onDelete?: (mealId: string) => Promise<void>;
  onRepeat?: (mealId: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'save' | 'delete' | 'repeat' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
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

  const openEditor = (entry: MealEntry) => {
    setEditing(entry);
    setDraft({
      name: entry.name,
      mealType: entry.mealType,
      portionGrams: entry.portionGrams ? `${entry.portionGrams}` : '',
      caloriesKcal: `${entry.caloriesKcal}`,
      proteinG: `${entry.proteinG}`,
      carbsG: `${entry.carbsG}`,
      fatG: `${entry.fatG}`,
    });
    setConfirmDelete(false);
    setError('');
  };

  const numberField = (key: string, optional = false) => {
    if (optional && !draft[key]?.trim()) return undefined;
    const parsed = Number((draft[key] ?? '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
  };

  const saveEdit = async () => {
    if (!editing || !onUpdate) return;
    const input: MealUpdateInput = {
      name: draft.name?.trim(),
      mealType: draft.mealType as MealType,
      caloriesKcal: numberField('caloriesKcal')!,
      proteinG: numberField('proteinG')!,
      carbsG: numberField('carbsG')!,
      fatG: numberField('fatG')!,
      portionGrams: numberField('portionGrams', true),
    };
    if (!input.name || !mealTypeLabels[input.mealType] || [input.caloriesKcal, input.proteinG, input.carbsG, input.fatG, input.portionGrams ?? 0].some((item) => !Number.isFinite(item))) {
      setError('Öğün adı, porsiyon, kalori ve makro değerlerini kontrol et.');
      return;
    }
    setBusy('save'); setError('');
    try { await onUpdate(editing.id, input); setEditing(null); } catch (next) { setError(next instanceof Error ? next.message : 'Öğün güncellenemedi.'); } finally { setBusy(null); }
  };

  const deleteEdit = async () => {
    if (!editing || !onDelete) return;
    setBusy('delete'); setError('');
    try { await onDelete(editing.id); setEditing(null); } catch (next) { setError(next instanceof Error ? next.message : 'Öğün silinemedi.'); } finally { setBusy(null); }
  };

  const repeatEntry = async (entry: MealEntry) => {
    if (!onRepeat) return;
    setBusy('repeat'); setError('');
    try { await onRepeat(entry.id); } catch (next) { setError(next instanceof Error ? next.message : 'Öğün tekrar eklenemedi.'); } finally { setBusy(null); }
  };

  if (!groups.length) {
    return <Card><EmptyState icon="food-variant" title="Henüz öğün yok" description={emptyDescription ?? 'Fotoğraftan analiz edilen öğünler burada görünecek.'} /></Card>;
  }

  return (
    <>
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
                  {editable ? <View style={styles.actions}><Button label="Düzenle" icon="pencil-outline" compact variant="ghost" onPress={() => openEditor(entry)} /><Button label="Tekrar ekle" icon="repeat" compact variant="ghost" loading={busy === 'repeat'} onPress={() => void repeatEntry(entry)} /></View> : null}
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </View>
    <ModalSheet visible={Boolean(editing)} onClose={() => !busy && setEditing(null)} title="Öğünü düzenle">
      <TextField label="Öğün adı" value={draft.name ?? ''} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} />
      <View style={styles.typeChips}>{(Object.keys(mealTypeLabels) as MealType[]).map((type) => <Chip key={type} label={mealTypeLabels[type]} selected={draft.mealType === type} onPress={() => setDraft((current) => ({ ...current, mealType: type }))} />)}</View>
      <View style={styles.editGrid}>
        <TextField containerStyle={styles.editField} label="Porsiyon (g)" value={draft.portionGrams ?? ''} onChangeText={(portionGrams) => setDraft((current) => ({ ...current, portionGrams }))} keyboardType="decimal-pad" />
        <TextField containerStyle={styles.editField} label="Kalori" value={draft.caloriesKcal ?? ''} onChangeText={(caloriesKcal) => setDraft((current) => ({ ...current, caloriesKcal }))} keyboardType="decimal-pad" />
        <TextField containerStyle={styles.editField} label="Protein (g)" value={draft.proteinG ?? ''} onChangeText={(proteinG) => setDraft((current) => ({ ...current, proteinG }))} keyboardType="decimal-pad" />
        <TextField containerStyle={styles.editField} label="Karbonhidrat (g)" value={draft.carbsG ?? ''} onChangeText={(carbsG) => setDraft((current) => ({ ...current, carbsG }))} keyboardType="decimal-pad" />
        <TextField containerStyle={styles.editField} label="Yağ (g)" value={draft.fatG ?? ''} onChangeText={(fatG) => setDraft((current) => ({ ...current, fatG }))} keyboardType="decimal-pad" />
      </View>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <Button label="Değişiklikleri Kaydet" icon="content-save-check-outline" variant="accent" loading={busy === 'save'} disabled={Boolean(busy)} onPress={() => void saveEdit()} />
      {confirmDelete ? <View style={styles.deleteConfirm}><AppText style={styles.deleteText}>Bu öğün ve fotoğrafı kalıcı olarak silinecek.</AppText><View style={styles.deleteActions}><Button label="Vazgeç" compact variant="ghost" onPress={() => setConfirmDelete(false)} /><Button label="Evet, sil" compact variant="danger" loading={busy === 'delete'} onPress={() => void deleteEdit()} /></View></View> : <Button label="Öğünü Sil" icon="trash-can-outline" variant="ghost" onPress={() => setConfirmDelete(true)} />}
    </ModalSheet>
    </>
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
  targetNumbers: { alignItems: 'flex-end' },
  targetLabel: { color: colors.inkSoft },
  targetValue: { ...typography.bodyMedium },
  remaining: { fontSize: 10, lineHeight: 13, color: colors.accent },
  track: { height: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },
  calorieProgressBlock: { gap: spacing.sm },
  calorieTrack: { height: 11, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  calorieFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },
  calorieFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  calorieRemaining: { ...typography.caption, color: colors.accent, fontWeight: '800' },
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
  trendCard: { gap: spacing.lg },
  trendHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trendToggle: { width: 150 },
  chart: { height: 180, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  chartColumn: { flex: 1, height: '100%', alignItems: 'center', gap: 5 },
  chartValue: { fontSize: 9, lineHeight: 12, color: colors.inkSoft },
  chartTrack: { flex: 1, width: '72%', justifyContent: 'flex-end', borderRadius: radius.sm, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  chartBar: { width: '100%', minHeight: 2, borderRadius: radius.sm, backgroundColor: colors.primary },
  chartLabel: { ...typography.caption, color: colors.inkSoft },
  targetLegend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -spacing.md },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editField: { width: '47%', flexGrow: 1 },
  error: { ...typography.caption, color: colors.danger },
  deleteConfirm: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  deleteText: { ...typography.caption, color: colors.danger },
  deleteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
