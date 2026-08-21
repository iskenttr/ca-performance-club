import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { ExerciseGuide, findExerciseGuide } from '../data/exerciseLibrary';
import { ExerciseMotionMedia } from './ExerciseMotionMedia';
import { AppText, Button, Card, Chip, ModalSheet } from './ui';

export const ExerciseLibrary = ({ names }: { names: string[] }) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<ExerciseGuide | null>(null);
  const guides = useMemo(() => {
    const unique = new Map<string, ExerciseGuide>();
    names.forEach((name) => {
      const guide = findExerciseGuide(name);
      if (guide) unique.set(guide.id, guide);
    });
    return [...unique.values()];
  }, [names]);

  if (!guides.length) return null;

  return (
    <>
      <Card onPress={() => { setSelected(null); setVisible(true); }} style={styles.libraryCard}>
        <View style={styles.libraryIcon}><MaterialCommunityIcons name="book-open-page-variant-outline" size={25} color={colors.primary} /></View>
        <View style={styles.flex}><AppText style={typography.h3}>Hareket Kütüphanesi</AppText><AppText style={styles.muted}>{guides.length} hareket için uygulama ve form rehberi</AppText></View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.inkSoft} />
      </Card>
      <ModalSheet visible={visible} onClose={() => setVisible(false)} title={selected?.title ?? 'Hareket Kütüphanesi'} fullHeight>
        {selected ? (
          <>
            <View style={styles.guideHero}>
              <View style={styles.guideIcon}><MaterialCommunityIcons name="weight-lifter" size={31} color={colors.accent} /></View>
              <View style={styles.flex}><AppText style={styles.guideCategory}>{selected.category}</AppText><AppText style={typography.h2}>{selected.title}</AppText><AppText style={styles.muted}>{selected.equipment} · {selected.level}</AppText></View>
            </View>
            <ExerciseMotionMedia guideId={selected.id} />
            <View style={styles.chips}>{selected.muscles.map((muscle) => <Chip key={muscle} label={muscle} tone="success" />)}</View>
            <Card style={styles.guideSection}><AppText style={typography.h3}>Nasıl uygulanır?</AppText>{selected.steps.map((step, index) => <View key={step} style={styles.stepRow}><View style={styles.stepNumber}><AppText style={styles.stepNumberText}>{index + 1}</AppText></View><AppText style={styles.stepText}>{step}</AppText></View>)}</Card>
            <Card style={styles.guideSection}><AppText style={typography.h3}>Form ipuçları</AppText><View style={styles.cueGrid}>{selected.cues.map((cue) => <View key={cue} style={styles.cue}><MaterialCommunityIcons name="check-circle-outline" size={17} color={colors.success} /><AppText style={styles.cueText}>{cue}</AppText></View>)}</View></Card>
            <View style={styles.warning}><MaterialCommunityIcons name="alert-outline" size={21} color={colors.warning} /><AppText style={styles.warningText}>{selected.warning}</AppText></View>
            <Button label="Hareket listesine dön" icon="arrow-left" variant="secondary" onPress={() => setSelected(null)} />
          </>
        ) : (
          <>
            <AppText style={styles.muted}>Programındaki hareketlerin uygulama adımlarını ve hedef kaslarını incele.</AppText>
            {guides.map((guide) => (
              <Pressable key={guide.id} onPress={() => setSelected(guide)} style={({ pressed }) => [styles.guideRow, pressed && styles.pressed]}>
                <View style={styles.rowIcon}><MaterialCommunityIcons name="dumbbell" size={21} color={colors.primary} /></View>
                <View style={styles.flex}><AppText style={typography.bodyMedium}>{guide.title}</AppText><AppText style={styles.muted}>{guide.category} · {guide.muscles.join(', ')}</AppText></View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.inkSoft} />
              </Pressable>
            ))}
          </>
        )}
      </ModalSheet>
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  muted: { ...typography.caption, color: colors.inkSoft },
  libraryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#101914', borderColor: '#33452C' },
  libraryIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 72, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  guideHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#121B16', borderWidth: 1, borderColor: '#35452D' },
  guideIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  guideCategory: { ...typography.label, color: colors.accent, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  guideSection: { gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  stepNumberText: { ...typography.caption, color: colors.graphite, fontWeight: '900' },
  stepText: { flex: 1, color: colors.inkSoft },
  cueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cue: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.successSoft },
  cueText: { ...typography.caption, color: colors.success },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  warningText: { flex: 1, ...typography.caption, color: colors.warning },
  pressed: { opacity: 0.75 },
});
