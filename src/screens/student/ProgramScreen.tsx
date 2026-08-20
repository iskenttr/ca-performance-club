import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Card, Chip, EmptyState, Page, SegmentedControl } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types/domain';
import { formatShortDate, toDateInput } from '../../utils/date';

type ProgramView = 'workout' | 'nutrition';

export const ProgramScreen = ({ onProfile }: { onProfile: () => void }) => {
  const { data, user, toggleExercise } = useApp();
  const student = user as Student;
  const [view, setView] = useState<ProgramView>('workout');
  const program = data?.workoutPrograms.find((item) => item.studentId === student.id);
  const nutrition = data?.nutritionPlans.find((item) => item.studentId === student.id);
  const [selectedDayId, setSelectedDayId] = useState(program?.days[0]?.id ?? '');
  const selectedDay = program?.days.find((item) => item.id === selectedDayId) ?? program?.days[0];
  const today = toDateInput();
  const completedIds = useMemo(
    () => new Set(data?.workoutCompletions.filter((item) => item.studentId === student.id && item.completedOn === today).map((item) => item.exerciseId) ?? []),
    [data?.workoutCompletions, student.id, today],
  );
  const completedCount = selectedDay?.exercises.filter((item) => completedIds.has(item.id)).length ?? 0;

  return (
    <View style={styles.root}>
      <TopBar eyebrow="Planım" title="Program" name={student.fullName} onProfile={onProfile} />
      <Page>
        <SegmentedControl<ProgramView>
          value={view}
          options={[{ value: 'workout', label: 'Antrenman' }, { value: 'nutrition', label: 'Beslenme' }]}
          onChange={setView}
        />

        {view === 'workout' ? (
          program ? (
            <>
              <ImageBackground source={require('../../../assets/premium/strength-detail.png')} style={styles.editorialHero} imageStyle={styles.editorialImage} resizeMode="cover">
                <LinearGradient colors={['rgba(5,8,7,0.08)', 'rgba(5,8,7,0.92)']} style={styles.editorialOverlay}>
                  <AppText style={styles.editorialEyebrow}>STRENGTH / {program.days.length} DAY SPLIT</AppText>
                  <AppText style={styles.editorialTitle}>Güç, disiplinle inşa edilir.</AppText>
                </LinearGradient>
              </ImageBackground>
              <Card style={styles.planHeader}>
                <View style={styles.planHeaderTop}>
                  <View style={styles.planIcon}><MaterialCommunityIcons name="dumbbell" size={25} color={colors.primary} /></View>
                  <View style={styles.flex}>
                    <AppText style={typography.h2}>{program.title}</AppText>
                    <AppText style={styles.updated}>Son güncelleme · {formatShortDate(program.updatedAt)}</AppText>
                  </View>
                </View>
                <AppText style={styles.description}>{program.description}</AppText>
                <View style={styles.planMeta}>
                  <View style={styles.metaItem}><MaterialCommunityIcons name="calendar-week" size={17} color={colors.inkSoft} /><AppText style={styles.metaText}>{program.days.length} gün / hafta</AppText></View>
                  <View style={styles.metaItem}><MaterialCommunityIcons name="account-check-outline" size={17} color={colors.inkSoft} /><AppText style={styles.metaText}>Cem Hoca tarafından</AppText></View>
                </View>
              </Card>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
                {program.days.map((day) => {
                  const selected = day.id === selectedDay?.id;
                  const dayCompleted = day.exercises.every((item) => completedIds.has(item.id));
                  return (
                    <Pressable key={day.id} onPress={() => setSelectedDayId(day.id)} style={[styles.dayTab, selected && styles.dayTabSelected]}>
                      <View style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                        {dayCompleted ? <MaterialCommunityIcons name="check" size={18} color={selected ? colors.primary : colors.success} /> : <AppText style={[styles.dayNumberText, selected && styles.dayNumberTextSelected]}>{day.label.split('.')[0]}</AppText>}
                      </View>
                      <AppText style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{day.label}</AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedDay ? (
                <View style={styles.workoutBlock}>
                  <View style={styles.workoutHeading}>
                    <View style={styles.flex}>
                      <AppText style={typography.h2}>{selectedDay.title}</AppText>
                      <AppText style={styles.workoutFocus}>{selectedDay.focus} · {selectedDay.durationMinutes} dk</AppText>
                    </View>
                    <Chip label={`${completedCount}/${selectedDay.exercises.length}`} tone={completedCount === selectedDay.exercises.length ? 'success' : 'info'} />
                  </View>
                  <View style={styles.exerciseList}>
                    {selectedDay.exercises.map((exercise, index) => {
                      const completed = completedIds.has(exercise.id);
                      return (
                        <Pressable key={exercise.id} onPress={() => toggleExercise(student.id, exercise.id)} style={({ pressed }) => [styles.exerciseCard, completed && styles.exerciseCardCompleted, pressed && styles.pressed]}>
                          <View style={[styles.exerciseIndex, completed && styles.exerciseIndexCompleted]}>
                            {completed ? <MaterialCommunityIcons name="check" size={19} color={colors.white} /> : <AppText style={styles.exerciseIndexText}>{index + 1}</AppText>}
                          </View>
                          <View style={styles.flex}>
                            <AppText style={[typography.bodyMedium, completed && styles.completedText]}>{exercise.name}</AppText>
                            <View style={styles.exerciseMetaRow}>
                              <AppText style={styles.exerciseMeta}>{exercise.sets} set × {exercise.reps}</AppText>
                              <View style={styles.dot} />
                              <AppText style={styles.exerciseMeta}>{exercise.restSeconds} sn dinlen</AppText>
                            </View>
                            {exercise.note ? <AppText style={styles.exerciseNote}>{exercise.note}</AppText> : null}
                          </View>
                          <MaterialCommunityIcons name={completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={25} color={completed ? colors.success : colors.border} />
                        </Pressable>
                      );
                    })}
                  </View>
                  {completedCount === selectedDay.exercises.length ? (
                    <View style={styles.successBanner}>
                      <View style={styles.successIcon}><MaterialCommunityIcons name="trophy-outline" size={23} color={colors.success} /></View>
                      <View style={styles.flex}><AppText style={typography.bodyMedium}>Antrenman tamamlandı!</AppText><AppText style={styles.successText}>Bugün için harika iş çıkardın.</AppText></View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <Card><EmptyState icon="clipboard-text-outline" title="Program hazırlanıyor" description="Cem Hoca programını atadığında burada tüm günleri ve hareketleri göreceksin." /></Card>
          )
        ) : nutrition ? (
          <>
            <ImageBackground source={require('../../../assets/premium/nutrition-detail.png')} style={styles.editorialHero} imageStyle={styles.editorialImage} resizeMode="cover">
              <LinearGradient colors={['rgba(5,8,7,0.10)', 'rgba(5,8,7,0.94)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.editorialOverlay}>
                <AppText style={styles.editorialEyebrow}>PERFORMANCE NUTRITION</AppText>
                <AppText style={styles.editorialTitle}>Yakıtın, performansın.</AppText>
              </LinearGradient>
            </ImageBackground>
            <Card style={styles.nutritionHeader}>
              <View style={styles.nutritionTop}>
                <View style={styles.nutritionIcon}><MaterialCommunityIcons name="food-apple-outline" size={27} color={colors.primary} /></View>
                <View style={styles.flex}><AppText style={typography.h2}>{nutrition.title}</AppText><AppText style={styles.updated}>Güncellendi · {formatShortDate(nutrition.updatedAt)}</AppText></View>
              </View>
              <View style={styles.waterRow}>
                <View style={styles.waterIcon}><MaterialCommunityIcons name="water-outline" size={21} color={colors.info} /></View>
                <View style={styles.flex}><AppText style={typography.bodyMedium}>Günlük su hedefi</AppText><AppText style={styles.updated}>Güne yayarak tüket</AppText></View>
                <AppText style={styles.waterValue}>{nutrition.dailyWaterLiters} L</AppText>
              </View>
            </Card>

            <View style={styles.mealsBlock}>
              <AppText style={typography.h2}>Günün öğünleri</AppText>
              {nutrition.meals.map((meal, index) => (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.timelineColumn}>
                    <View style={styles.timelineDot} />
                    {index < nutrition.meals.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <Card style={styles.mealCard}>
                    <View style={styles.mealTop}><AppText style={styles.mealTime}>{meal.time}</AppText><AppText style={typography.h3}>{meal.title}</AppText></View>
                    <View style={styles.foodList}>{meal.items.map((item) => <View key={item} style={styles.foodRow}><View style={styles.foodBullet} /><AppText style={styles.foodText}>{item}</AppText></View>)}</View>
                  </Card>
                </View>
              ))}
            </View>

            <Card style={styles.coachNote}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={colors.warning} />
              <View style={styles.flex}><AppText style={typography.bodyMedium}>Cem Hoca’nın notu</AppText><AppText style={styles.description}>{nutrition.note}</AppText></View>
            </Card>
            <View style={styles.disclaimer}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.inkSoft} />
              <AppText style={styles.disclaimerText}>Bu plan genel fitness desteğidir; tıbbi beslenme tedavisi yerine geçmez. Alerji veya sağlık durumunda uzman görüşü al.</AppText>
            </View>
          </>
        ) : (
          <Card><EmptyState icon="food-apple-outline" title="Beslenme planı hazırlanıyor" description="Cem Hoca planını atadığında öğünleri burada göreceksin." /></Card>
        )}
      </Page>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  editorialHero: { minHeight: 220, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.graphite },
  editorialImage: { borderRadius: radius.xl },
  editorialOverlay: { flex: 1, padding: spacing.xl, justifyContent: 'flex-end', gap: 4 },
  editorialEyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.4 },
  editorialTitle: { color: colors.white, fontSize: 29, lineHeight: 33, fontWeight: '900', letterSpacing: -0.9, maxWidth: 260 },
  planHeader: { gap: spacing.md },
  planHeaderTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  planIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  updated: { ...typography.caption, color: colors.inkSoft },
  description: { color: colors.inkSoft },
  planMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...typography.caption, color: colors.inkSoft },
  dayTabs: { gap: spacing.sm, paddingRight: spacing.lg },
  dayTab: { width: 82, padding: spacing.sm, alignItems: 'center', gap: 6, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayTabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  dayNumberSelected: { backgroundColor: colors.accent },
  dayNumberText: { ...typography.caption, fontWeight: '800' },
  dayNumberTextSelected: { color: colors.primary },
  dayLabel: { ...typography.caption, color: colors.inkSoft },
  dayLabelSelected: { color: colors.white },
  workoutBlock: { gap: spacing.md },
  workoutHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workoutFocus: { color: colors.inkSoft, marginTop: 2 },
  exerciseList: { gap: spacing.sm },
  exerciseCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'transparent' },
  exerciseCardCompleted: { backgroundColor: colors.successSoft, borderColor: '#285846' },
  exerciseIndex: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  exerciseIndexCompleted: { backgroundColor: colors.success },
  exerciseIndexText: { ...typography.bodyMedium },
  exerciseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  exerciseMeta: { ...typography.caption, color: colors.inkSoft },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.inkSoft },
  exerciseNote: { ...typography.caption, color: colors.primary, marginTop: 5 },
  completedText: { textDecorationLine: 'line-through', color: colors.inkSoft },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.successSoft, borderRadius: radius.lg, padding: spacing.md },
  successIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  successText: { ...typography.caption, color: colors.inkSoft },
  nutritionHeader: { gap: spacing.lg },
  nutritionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nutritionIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#29331C', alignItems: 'center', justifyContent: 'center' },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: spacing.md },
  waterIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  waterValue: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: colors.info },
  mealsBlock: { gap: spacing.md },
  mealRow: { flexDirection: 'row', gap: spacing.md },
  timelineColumn: { width: 15, alignItems: 'center' },
  timelineDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.primary, marginTop: spacing.lg },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 3 },
  mealCard: { flex: 1, marginBottom: spacing.xs, gap: spacing.md },
  mealTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mealTime: { ...typography.label, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
  foodList: { gap: spacing.sm },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  foodBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accentDark, marginTop: 8 },
  foodText: { flex: 1, color: colors.inkSoft },
  coachNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.warningSoft },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.md },
  disclaimerText: { flex: 1, ...typography.caption, color: colors.inkSoft },
  pressed: { opacity: 0.75 },
});
