import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { ExerciseLibrary } from '../../components/ExerciseLibrary';
import { DailyNutritionSummary, MealHistory } from '../../components/MealTracking';
import { ProgressReport } from '../../components/ProgressReport';
import { AppText, Avatar, Button, Card, Chip, EmptyState, ModalSheet, Page, SegmentedControl, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { nutritionTemplateOptions, NutritionTemplateId, programTemplateOptions, ProgramTemplateId } from '../../data/templates';
import { Exercise, NutritionPlan, Student, WorkoutDay } from '../../types/domain';
import { formatAppointment, formatDate, formatShortDate, toDateInput } from '../../utils/date';

type DetailTab = 'overview' | 'workout' | 'nutrition' | 'progress';
type ProgressTab = 'report' | 'measurements' | 'photos';

export const StudentDetailScreen = ({
  studentId,
  onBack,
  onMessage,
  onCalendar,
}: {
  studentId: string;
  onBack: () => void;
  onMessage: () => void;
  onCalendar: () => void;
}) => {
  const { data, students, assignProgram, assignNutrition, updateNutritionPlan, updateUser, updateWorkoutDay } = useApp();
  const student = students.find((item) => item.id === studentId);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [progressTab, setProgressTab] = useState<ProgressTab>('report');
  const [programModal, setProgramModal] = useState(false);
  const [nutritionModal, setNutritionModal] = useState(false);
  const [nutritionEditModal, setNutritionEditModal] = useState(false);
  const [notesModal, setNotesModal] = useState(false);
  const [packageModal, setPackageModal] = useState(false);
  const [exerciseModal, setExerciseModal] = useState(false);
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null);
  const [exerciseError, setExerciseError] = useState('');
  const [nutritionError, setNutritionError] = useState('');
  const [editingNutrition, setEditingNutrition] = useState<NutritionPlan | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<ProgramTemplateId>('balanced3');
  const [selectedNutrition, setSelectedNutrition] = useState<NutritionTemplateId>('balanced');
  const [notes, setNotes] = useState(student?.notes ?? '');
  const [packageTotal, setPackageTotal] = useState(`${student?.lessonPackage?.totalLessons ?? 8}`);
  const [packageRemaining, setPackageRemaining] = useState(`${student?.lessonPackage?.remainingLessons ?? 8}`);
  const [packageExpiry, setPackageExpiry] = useState(student?.lessonPackage?.expiresAt?.slice(0, 10) ?? '');
  const [packageError, setPackageError] = useState('');

  const program = data?.workoutPrograms.find((item) => item.studentId === studentId);
  const nutrition = data?.nutritionPlans.find((item) => item.studentId === studentId);
  const mealEntries = data?.mealEntries.filter((item) => item.studentId === studentId) ?? [];
  const todayMealEntries = mealEntries.filter((item) => toDateInput(new Date(item.eatenAt)) === toDateInput());
  const measurements = useMemo(
    () => (data?.measurements.filter((item) => item.studentId === studentId) ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data?.measurements, studentId],
  );
  const photos = useMemo(
    () => (data?.progressPhotos.filter((item) => item.studentId === studentId) ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data?.progressPhotos, studentId],
  );
  const appointments = (data?.appointments.filter((item) => item.studentId === studentId && item.status !== 'cancelled').sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()) ?? []);
  const nextAppointment = appointments.find((item) => new Date(item.startAt) >= new Date() && item.status !== 'completed');
  const latest = measurements[0];
  const oldest = measurements.at(-1);
  const weightChange = latest && oldest ? latest.weightKg - oldest.weightKg : 0;

  if (!student) {
    return <View style={styles.root}><TopBar title="Öğrenci bulunamadı" onBack={onBack} /><Page><Card><EmptyState icon="account-alert-outline" title="Kayıt bulunamadı" description="Öğrenci kaydı silinmiş veya erişim dışında olabilir." /></Card></Page></View>;
  }

  const saveNotes = () => {
    updateUser(student.id, { notes } as Partial<Student>);
    setNotesModal(false);
  };

  const openLessonPackage = () => {
    setPackageTotal(`${student.lessonPackage?.totalLessons ?? 8}`);
    setPackageRemaining(`${student.lessonPackage?.remainingLessons ?? 8}`);
    setPackageExpiry(student.lessonPackage?.expiresAt?.slice(0, 10) ?? '');
    setPackageError('');
    setPackageModal(true);
  };

  const saveLessonPackage = () => {
    const totalLessons = Number(packageTotal.replace(/[^0-9]/g, ''));
    const remainingLessons = Number(packageRemaining.replace(/[^0-9]/g, ''));
    const expiresAt = new Date(`${packageExpiry}T23:59:59`);
    if (!Number.isInteger(totalLessons) || totalLessons < 1 || totalLessons > 500) {
      setPackageError('Toplam ders sayısı 1–500 arasında olmalı.');
      return;
    }
    if (!Number.isInteger(remainingLessons) || remainingLessons < 0 || remainingLessons > totalLessons) {
      setPackageError('Kalan ders sayısı toplam ders sayısından fazla olamaz.');
      return;
    }
    if (Number.isNaN(expiresAt.getTime())) {
      setPackageError('Geçerli bir paket bitiş tarihi gir.');
      return;
    }
    updateUser(student.id, { lessonPackage: { totalLessons, remainingLessons, expiresAt: expiresAt.toISOString(), updatedAt: new Date().toISOString() } } as Partial<Student>);
    setPackageError('');
    setPackageModal(false);
  };

  const setStatus = (status: Student['status']) => updateUser(student.id, { status } as Partial<Student>);

  const openExerciseEditor = (day: WorkoutDay) => {
    setEditingDay({ ...day, exercises: day.exercises.map((exercise) => ({ ...exercise })) });
    setExerciseError('');
    setExerciseModal(true);
  };

  const changeExercise = (exerciseId: string, changes: Partial<Exercise>) => {
    setEditingDay((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...changes } : exercise),
    } : current);
  };

  const addExercise = () => {
    const exercise: Exercise = { id: `exercise-${Crypto.randomUUID()}`, name: '', sets: 3, reps: '10', restSeconds: 60, note: '' };
    setEditingDay((current) => current ? { ...current, exercises: [...current.exercises, exercise] } : current);
  };

  const removeExercise = (exerciseId: string) => {
    setEditingDay((current) => current ? { ...current, exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId) } : current);
  };

  const saveExercises = () => {
    if (!editingDay) return;
    if (!editingDay.exercises.length) {
      setExerciseError('Antrenman gününde en az bir hareket olmalı.');
      return;
    }
    if (editingDay.exercises.some((exercise) => !exercise.name.trim() || exercise.sets < 1 || !exercise.reps.trim() || exercise.restSeconds < 0)) {
      setExerciseError('Hareket adı, set, tekrar ve dinlenme alanlarını kontrol et.');
      return;
    }
    updateWorkoutDay(student.id, {
      ...editingDay,
      exercises: editingDay.exercises.map((exercise) => ({ ...exercise, name: exercise.name.trim(), reps: exercise.reps.trim(), note: exercise.note?.trim() })),
    });
    setExerciseModal(false);
    setEditingDay(null);
  };

  const openNutritionEditor = () => {
    if (!nutrition) return;
    setEditingNutrition({
      ...nutrition,
      meals: nutrition.meals.map((meal) => ({ ...meal, items: [...meal.items] })),
    });
    setNutritionError('');
    setNutritionEditModal(true);
  };

  const changeMeal = (mealId: string, changes: Partial<NutritionPlan['meals'][number]>) => {
    setEditingNutrition((current) => current ? {
      ...current,
      meals: current.meals.map((meal) => meal.id === mealId ? { ...meal, ...changes } : meal),
    } : current);
  };

  const addMeal = () => {
    setEditingNutrition((current) => current ? {
      ...current,
      meals: [...current.meals, { id: `meal-${Crypto.randomUUID()}`, time: '12:00', title: 'Yeni öğün', items: [''] }],
    } : current);
  };

  const removeMeal = (mealId: string) => {
    setEditingNutrition((current) => current ? { ...current, meals: current.meals.filter((meal) => meal.id !== mealId) } : current);
  };

  const changeNutritionTarget = (key: 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG', value: string) => {
    const amount = Number(value.replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
    setEditingNutrition((current) => current ? {
      ...current,
      targets: {
        caloriesKcal: current.targets?.caloriesKcal ?? 0,
        proteinG: current.targets?.proteinG ?? 0,
        carbsG: current.targets?.carbsG ?? 0,
        fatG: current.targets?.fatG ?? 0,
        [key]: amount,
      },
    } : current);
  };

  const saveNutrition = () => {
    if (!editingNutrition) return;
    const cleanedMeals = editingNutrition.meals.map((meal) => ({
      ...meal,
      time: meal.time.trim(),
      title: meal.title.trim(),
      items: meal.items.map((item) => item.trim()).filter(Boolean),
    }));
    if (!editingNutrition.title.trim() || editingNutrition.dailyWaterLiters <= 0 || editingNutrition.dailyWaterLiters > 12) {
      setNutritionError('Plan adı ve 0–12 litre arasındaki su hedefini kontrol et.');
      return;
    }
    if (!cleanedMeals.length || cleanedMeals.some((meal) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time) || !meal.title || !meal.items.length)) {
      setNutritionError('En az bir öğün olmalı; saat 09:30 biçiminde, başlık ve içerik dolu olmalı.');
      return;
    }
    const targets = editingNutrition.targets;
    const targetValues = targets ? [targets.caloriesKcal, targets.proteinG, targets.carbsG, targets.fatG] : [];
    const hasAnyTarget = targetValues.some((item) => item > 0);
    if (hasAnyTarget && (
      targetValues.some((item) => item <= 0)
      || targets!.caloriesKcal > 10000
      || targets!.proteinG > 1000
      || targets!.carbsG > 1500
      || targets!.fatG > 500
    )) {
      setNutritionError('Beslenme hedeflerinin tamamını pozitif ve geçerli değerlerle doldur veya hepsini boş bırak.');
      return;
    }
    updateNutritionPlan(student.id, {
      ...editingNutrition,
      title: editingNutrition.title.trim(),
      note: editingNutrition.note.trim(),
      meals: cleanedMeals,
      targets: hasAnyTarget ? targets : undefined,
    });
    setNutritionEditModal(false);
    setEditingNutrition(null);
  };

  return (
    <View style={styles.root}>
      <TopBar eyebrow="Öğrenci profili" title={student.fullName} onBack={onBack} />
      <Page>
        <Card style={styles.profileHeader}>
          <View style={styles.profileTop}>
            <Avatar name={student.fullName} size={66} accent={student.status === 'new'} />
            <View style={styles.flex}>
              <AppText style={typography.h2}>{student.fullName}</AppText>
              <AppText style={styles.muted}>{student.email}</AppText>
              <View style={styles.statusRow}>
                <Chip label={student.status === 'new' ? 'Yeni öğrenci' : student.status === 'active' ? 'Aktif' : 'Ara verdi'} tone={student.status === 'new' ? 'warning' : student.status === 'active' ? 'success' : 'default'} />
                <AppText style={styles.joined}>· {formatShortDate(student.createdAt)} tarihinde katıldı</AppText>
              </View>
            </View>
          </View>
          <View style={styles.quickActions}>
            <Button label="Mesaj" icon="message-text-outline" compact variant="accent" onPress={onMessage} style={styles.quickButton} />
            <Button label="Ders ekle" icon="calendar-plus" compact variant="secondary" onPress={onCalendar} style={styles.quickButton} />
          </View>
        </Card>

        <SegmentedControl<DetailTab>
          value={tab}
          options={[
            { value: 'overview', label: 'Özet' },
            { value: 'workout', label: 'Program' },
            { value: 'nutrition', label: 'Beslenme' },
            { value: 'progress', label: 'Gelişim' },
          ]}
          onChange={setTab}
        />

        {tab === 'overview' ? (
          <>
            <View style={styles.metricGrid}>
              <Metric icon="scale-bathroom" label="Kilo" value={latest ? `${latest.weightKg.toFixed(1)} kg` : '—'} detail={weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg değişim` : 'Ölçüm bekleniyor'} />
              <Metric icon="human-male-height" label="Boy" value={student.heightCm ? `${student.heightCm} cm` : '—'} detail={student.level} />
              <Metric icon="target" label="Hedef" value={`${student.weeklyGoal} gün / hafta`} detail={student.goal} />
              <Metric icon="calendar-check-outline" label="Ders" value={`${appointments.filter((item) => item.status === 'completed').length}`} detail="Tamamlanan" />
            </View>

            <Card style={styles.goalCard}>
              <View style={styles.goalIcon}><MaterialCommunityIcons name="bullseye-arrow" size={25} color={colors.primary} /></View>
              <View style={styles.flex}><AppText style={styles.cardLabel}>ANA HEDEF</AppText><AppText style={typography.h3}>{student.goal}</AppText><AppText style={styles.muted}>{student.level} seviye · haftada {student.weeklyGoal} gün</AppText></View>
            </Card>

            <Card style={styles.packageCard}>
              <View style={styles.packageIcon}><MaterialCommunityIcons name="ticket-confirmation-outline" size={25} color={colors.primary} /></View>
              <View style={styles.flex}>
                <AppText style={styles.cardLabel}>DERS PAKETİ</AppText>
                <AppText style={typography.h3}>{student.lessonPackage ? `${student.lessonPackage.remainingLessons} / ${student.lessonPackage.totalLessons} ders kaldı` : 'Paket bilgisi girilmedi'}</AppText>
                <AppText style={styles.muted}>{student.lessonPackage ? `${formatDate(student.lessonPackage.expiresAt)} tarihinde sona erer` : 'Kalan ders ve bitiş tarihini takip etmek için paket ekle.'}</AppText>
              </View>
              <Button label={student.lessonPackage ? 'Güncelle' : 'Paket ekle'} icon="pencil-outline" compact variant="secondary" onPress={openLessonPackage} />
            </Card>

            <Card style={styles.notesCard}>
              <View style={styles.cardTitleRow}><View style={styles.cardTitleIcon}><MaterialCommunityIcons name="note-text-outline" size={21} color={colors.primary} /></View><AppText style={typography.h3}>PT notları</AppText><Pressable onPress={() => setNotesModal(true)}><AppText style={styles.editText}>Düzenle</AppText></Pressable></View>
              <AppText style={student.notes ? styles.noteText : styles.muted}>{student.notes || 'Bu öğrenci için henüz özel not eklenmedi.'}</AppText>
            </Card>

            {nextAppointment ? (
              <Card style={styles.nextLesson} onPress={onCalendar}>
                <View style={styles.lessonIcon}><MaterialCommunityIcons name="calendar-clock" size={23} color={colors.info} /></View>
                <View style={styles.flex}><AppText style={styles.cardLabel}>SONRAKİ DERS</AppText><AppText style={typography.bodyMedium}>{formatAppointment(nextAppointment.startAt)}</AppText><AppText style={styles.muted}>{nextAppointment.note}</AppText></View>
                <Chip label={nextAppointment.status === 'pending' ? 'Bekliyor' : 'Onaylı'} tone={nextAppointment.status === 'pending' ? 'warning' : 'success'} />
              </Card>
            ) : null}

            <Card style={styles.statusCard}>
              <AppText style={typography.h3}>Öğrenci durumu</AppText>
              <View style={styles.statusButtons}>
                <Chip label="Yeni" selected={student.status === 'new'} onPress={() => setStatus('new')} />
                <Chip label="Aktif" selected={student.status === 'active'} onPress={() => setStatus('active')} />
                <Chip label="Ara verdi" selected={student.status === 'paused'} onPress={() => setStatus('paused')} />
              </View>
            </Card>
          </>
        ) : null}

        {tab === 'workout' ? (
          <>
            <View style={styles.sectionTop}><View><AppText style={typography.h2}>Antrenman programı</AppText><AppText style={styles.muted}>Öğrencinin uygulamasında anında görünür.</AppText></View><Button label={program ? 'Değiştir' : 'Ata'} icon="clipboard-edit-outline" compact variant="accent" onPress={() => setProgramModal(true)} /></View>
            {program ? (
              <>
                <Card style={styles.programHeader}>
                  <View style={styles.programIcon}><MaterialCommunityIcons name="dumbbell" size={26} color={colors.primary} /></View>
                  <View style={styles.flex}><AppText style={typography.h2}>{program.title}</AppText><AppText style={styles.muted}>{program.description}</AppText><AppText style={styles.updated}>Güncellendi · {formatDate(program.updatedAt)}</AppText></View>
                </Card>
                <ExerciseLibrary
                  names={program.days.flatMap((programDay) =>
                    programDay.exercises.map((exercise) => exercise.name),
                  )}
                />
                {program.days.map((day) => (
                  <Card key={day.id} style={styles.dayCard}>
                    <View style={styles.dayHeader}><View style={styles.dayBadge}><AppText style={styles.dayBadgeText}>{day.label.split('.')[0]}</AppText></View><View style={styles.flex}><AppText style={typography.h3}>{day.title}</AppText><AppText style={styles.muted}>{day.focus} · {day.durationMinutes} dk</AppText></View><Button label="Düzenle" icon="pencil-outline" compact variant="secondary" onPress={() => openExerciseEditor(day)} /></View>
                    <View style={styles.exerciseCountRow}><Chip label={`${day.exercises.length} hareket`} tone="info" /><AppText style={styles.muted}>Set · tekrar · dinlenme · not</AppText></View>
                    <View style={styles.exerciseSummary}>{day.exercises.map((exercise) => <View key={exercise.id} style={styles.exerciseRow}><View style={styles.exerciseBullet} /><AppText style={styles.exerciseName}>{exercise.name}</AppText><AppText style={styles.exerciseSets}>{exercise.sets} × {exercise.reps}</AppText></View>)}</View>
                  </Card>
                ))}
              </>
            ) : <Card><EmptyState icon="clipboard-text-outline" title="Program atanmadı" description="Hazır şablonlardan birini seçerek öğrencinin programını oluştur." /></Card>}
          </>
        ) : null}

        {tab === 'nutrition' ? (
          <>
            <View style={styles.sectionTop}><View style={styles.flex}><AppText style={typography.h2}>Beslenme planı</AppText><AppText style={styles.muted}>Genel fitness beslenme rehberliği.</AppText></View><Button label={nutrition ? 'Şablon' : 'Ata'} icon="food-apple-outline" compact variant="accent" onPress={() => setNutritionModal(true)} /></View>
            <DailyNutritionSummary entries={todayMealEntries} targets={nutrition?.targets} title={`${student.fullName} · Bugün`} />
            <View style={styles.historyBlock}>
              <AppText style={typography.h2}>Fotoğraflı beslenme geçmişi</AppText>
              <MealHistory entries={mealEntries} emptyDescription="Öğrenci fotoğraftan öğün kaydettiğinde kalori, makro ve fotoğraflar burada görünecek." />
            </View>
            {nutrition ? (
              <>
                <Card style={styles.programHeader}>
                  <View style={[styles.programIcon, styles.nutritionIcon]}><MaterialCommunityIcons name="food-apple-outline" size={26} color={colors.primary} /></View>
                  <View style={styles.flex}><AppText style={typography.h2}>{nutrition.title}</AppText><AppText style={styles.muted}>{nutrition.dailyWaterLiters} litre günlük su hedefi</AppText><AppText style={styles.updated}>Güncellendi · {formatDate(nutrition.updatedAt)}</AppText></View>
                  <Button label="Düzenle" icon="pencil-outline" compact variant="secondary" onPress={openNutritionEditor} />
                </Card>
                {nutrition.meals.map((meal) => (
                  <Card key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealTime}><AppText style={styles.mealTimeText}>{meal.time}</AppText></View>
                    <View style={styles.flex}><AppText style={typography.h3}>{meal.title}</AppText><AppText style={styles.muted}>{meal.items.join(' · ')}</AppText></View>
                  </Card>
                ))}
                <Card style={styles.coachNote}><MaterialCommunityIcons name="lightbulb-on-outline" size={23} color={colors.warning} /><View style={styles.flex}><AppText style={typography.bodyMedium}>Plan notu</AppText><AppText style={styles.muted}>{nutrition.note}</AppText></View></Card>
              </>
            ) : <Card><EmptyState icon="food-apple-outline" title="Beslenme planı atanmadı" description="Hazır planlardan birini seçerek öğrencinin beslenme rehberini oluştur." /></Card>}
          </>
        ) : null}

        {tab === 'progress' ? (
          <>
            <SegmentedControl<ProgressTab> value={progressTab} options={[{ value: 'report', label: 'Rapor' }, { value: 'measurements', label: `Ölçüm (${measurements.length})` }, { value: 'photos', label: `Fotoğraf (${photos.length})` }]} onChange={setProgressTab} />
            {progressTab === 'report' ? (
              <ProgressReport student={student} />
            ) : progressTab === 'measurements' ? measurements.length ? (
              <>
                <View style={styles.metricGrid}>
                  <Metric icon="scale-bathroom" label="Güncel kilo" value={`${latest?.weightKg.toFixed(1)} kg`} detail={`${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg toplam`} />
                  <Metric icon="percent-outline" label="Yağ oranı" value={latest?.bodyFatPercent ? `%${latest.bodyFatPercent}` : '—'} detail="Güncel ölçüm" />
                  <Metric icon="tape-measure" label="Bel" value={latest?.waistCm ? `${latest.waistCm} cm` : '—'} detail="Güncel ölçüm" />
                  <Metric icon="human-handsup" label="Kalça" value={latest?.hipCm ? `${latest.hipCm} cm` : '—'} detail="Güncel ölçüm" />
                </View>
                {measurements.map((measurement, index) => (
                  <Card key={measurement.id} style={styles.measurementRow}>
                    <View style={[styles.measurementIcon, index === 0 && styles.measurementIconLatest]}><MaterialCommunityIcons name="chart-line" size={21} color={colors.primary} /></View>
                    <View style={styles.flex}><View style={styles.measurementTop}><AppText style={typography.bodyMedium}>{measurement.weightKg.toFixed(1)} kg</AppText>{index === 0 ? <Chip label="Güncel" tone="success" /> : null}</View><AppText style={styles.muted}>{formatDate(measurement.date)}</AppText></View>
                    <View style={styles.measurementRight}>{measurement.waistCm ? <AppText style={styles.muted}>Bel {measurement.waistCm}</AppText> : null}{measurement.bodyFatPercent ? <AppText style={styles.muted}>Yağ %{measurement.bodyFatPercent}</AppText> : null}</View>
                  </Card>
                ))}
              </>
            ) : <Card><EmptyState icon="chart-line" title="Ölçüm bulunmuyor" description="Öğrenci ilk ölçümünü eklediğinde burada görebilirsin." /></Card> : photos.length ? (
              <View style={styles.photoGrid}>{photos.map((photo) => <View key={photo.id} style={styles.photoCard}><Image source={{ uri: photo.uri }} style={styles.photo} /><View style={styles.photoDate}><AppText style={styles.photoDateText}>{formatShortDate(photo.date)}</AppText></View></View>)}</View>
            ) : <Card><EmptyState icon="image-multiple-outline" title="Fotoğraf bulunmuyor" description="Öğrenci gelişim fotoğrafı eklediğinde yalnızca kendisi ve sen görebilirsiniz." /></Card>}
          </>
        ) : null}
      </Page>

      <ModalSheet visible={programModal} onClose={() => setProgramModal(false)} title="Program ata">
        <AppText style={styles.muted}>Bir temel şablon seç. Atama öğrencinin mevcut programını ve tamamlanma işaretlerini yeniler.</AppText>
        {programTemplateOptions.map((option) => (
          <Pressable key={option.id} onPress={() => setSelectedProgram(option.id)} style={[styles.templateCard, selectedProgram === option.id && styles.templateCardSelected]}>
            <View style={[styles.templateRadio, selectedProgram === option.id && styles.templateRadioSelected]}>{selectedProgram === option.id ? <View style={styles.templateRadioDot} /> : null}</View>
            <View style={styles.flex}><AppText style={typography.bodyMedium}>{option.title}</AppText><AppText style={styles.muted}>{option.description}</AppText></View>
            <Chip label={`${option.days} gün`} tone="info" />
          </Pressable>
        ))}
        <Button label="Programı ata" icon="check" onPress={() => { assignProgram(student.id, selectedProgram); setProgramModal(false); }} />
      </ModalSheet>

      <ModalSheet visible={nutritionModal} onClose={() => setNutritionModal(false)} title="Beslenme planı ata">
        <AppText style={styles.muted}>Planlar tıbbi tedavi değil, genel fitness beslenme rehberliğidir.</AppText>
        {nutritionTemplateOptions.map((option) => (
          <Pressable key={option.id} onPress={() => setSelectedNutrition(option.id)} style={[styles.templateCard, selectedNutrition === option.id && styles.templateCardSelected]}>
            <View style={[styles.templateRadio, selectedNutrition === option.id && styles.templateRadioSelected]}>{selectedNutrition === option.id ? <View style={styles.templateRadioDot} /> : null}</View>
            <View style={styles.flex}><AppText style={typography.bodyMedium}>{option.title}</AppText><AppText style={styles.muted}>{option.description}</AppText></View>
          </Pressable>
        ))}
        <Button label="Planı ata" icon="check" onPress={() => { assignNutrition(student.id, selectedNutrition); setNutritionModal(false); }} />
      </ModalSheet>

      <ModalSheet visible={nutritionEditModal} onClose={() => setNutritionEditModal(false)} title="Beslenme planını düzenle" fullHeight>
        <View style={styles.editorIntro}>
          <MaterialCommunityIcons name="food-apple-outline" size={23} color={colors.accent} />
          <View style={styles.flex}><AppText style={typography.bodyMedium}>Beslenme Editörü</AppText><AppText style={styles.muted}>Kaydettiğinde öğrencinin planı ortak sistemde güncellenir.</AppText></View>
        </View>
        {editingNutrition ? (
          <>
            <Card style={styles.nutritionEditorHeader}>
              <TextField label="Plan adı" value={editingNutrition.title} onChangeText={(title) => setEditingNutrition((current) => current ? { ...current, title } : current)} placeholder="Örn. Dengeli Beslenme" />
              <TextField label="Günlük su hedefi (litre)" value={`${editingNutrition.dailyWaterLiters}`} onChangeText={(value) => setEditingNutrition((current) => current ? { ...current, dailyWaterLiters: Number(value.replace(',', '.').replace(/[^0-9.]/g, '')) || 0 } : current)} keyboardType="decimal-pad" placeholder="2.5" />
              <TextField label="Cem Hoca'nın plan notu" value={editingNutrition.note} onChangeText={(note) => setEditingNutrition((current) => current ? { ...current, note } : current)} multiline placeholder="Öğrencinin göreceği genel not" />
              <AppText style={styles.targetTitle}>Günlük kalori ve makro hedefleri (isteğe bağlı)</AppText>
              <View style={styles.targetFields}>
                <TextField containerStyle={styles.targetField} label="Kalori (kcal)" value={editingNutrition.targets?.caloriesKcal ? `${editingNutrition.targets.caloriesKcal}` : ''} onChangeText={(value) => changeNutritionTarget('caloriesKcal', value)} keyboardType="decimal-pad" placeholder="2200" />
                <TextField containerStyle={styles.targetField} label="Protein (g)" value={editingNutrition.targets?.proteinG ? `${editingNutrition.targets.proteinG}` : ''} onChangeText={(value) => changeNutritionTarget('proteinG', value)} keyboardType="decimal-pad" placeholder="160" />
                <TextField containerStyle={styles.targetField} label="Karbonhidrat (g)" value={editingNutrition.targets?.carbsG ? `${editingNutrition.targets.carbsG}` : ''} onChangeText={(value) => changeNutritionTarget('carbsG', value)} keyboardType="decimal-pad" placeholder="220" />
                <TextField containerStyle={styles.targetField} label="Yağ (g)" value={editingNutrition.targets?.fatG ? `${editingNutrition.targets.fatG}` : ''} onChangeText={(value) => changeNutritionTarget('fatG', value)} keyboardType="decimal-pad" placeholder="70" />
              </View>
            </Card>
            {editingNutrition.meals.map((meal, index) => (
              <Card key={meal.id} style={styles.exerciseEditorCard}>
                <View style={styles.editorCardHeader}>
                  <View style={styles.editorIndex}><AppText style={styles.editorIndexText}>{index + 1}</AppText></View>
                  <AppText style={[typography.h3, styles.flex]}>{meal.title || 'Yeni öğün'}</AppText>
                  <Button label="Kaldır" icon="trash-can-outline" compact variant="ghost" onPress={() => removeMeal(meal.id)} />
                </View>
                <View style={styles.mealEditorRow}>
                  <TextField containerStyle={styles.mealTimeField} label="Saat" value={meal.time} onChangeText={(time) => changeMeal(meal.id, { time })} placeholder="09:30" keyboardType="numbers-and-punctuation" />
                  <TextField containerStyle={styles.flex} label="Öğün başlığı" value={meal.title} onChangeText={(title) => changeMeal(meal.id, { title })} placeholder="Kahvaltı" />
                </View>
                <TextField label="İçerikler (her satıra bir ürün)" value={meal.items.join('\n')} onChangeText={(value) => changeMeal(meal.id, { items: value.split('\n') })} multiline placeholder={'Yumurta\nYulaf\nYoğurt'} />
              </Card>
            ))}
          </>
        ) : null}
        {nutritionError ? <View style={styles.editorError}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.danger} /><AppText style={styles.editorErrorText}>{nutritionError}</AppText></View> : null}
        <Button label="Yeni öğün ekle" icon="plus" variant="secondary" onPress={addMeal} />
        <Button label="Beslenme planını kaydet" icon="content-save-check-outline" variant="accent" onPress={saveNutrition} />
      </ModalSheet>

      <ModalSheet visible={notesModal} onClose={() => setNotesModal(false)} title="PT notları">
        <TextField label="Özel not" value={notes} onChangeText={setNotes} multiline placeholder="Sakatlık geçmişi, hareket kısıtı veya takip notu" />
        <AppText style={styles.muted}>Bu not yalnızca Cem Hoca panelinde görünür.</AppText>
        <Button label="Notu kaydet" icon="check" onPress={saveNotes} />
      </ModalSheet>

      <ModalSheet visible={packageModal} onClose={() => setPackageModal(false)} title="Ders paketini yönet">
        <View style={styles.editorIntro}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={23} color={colors.accent} />
          <View style={styles.flex}><AppText style={typography.bodyMedium}>{student.fullName}</AppText><AppText style={styles.muted}>Paket azaldığında Cem Hoca yönetim panelinde uyarı görünür.</AppText></View>
        </View>
        <View style={styles.editorFieldRow}>
          <TextField containerStyle={styles.editorField} label="Toplam ders" value={packageTotal} onChangeText={setPackageTotal} keyboardType="number-pad" placeholder="8" />
          <TextField containerStyle={styles.editorField} label="Kalan ders" value={packageRemaining} onChangeText={setPackageRemaining} keyboardType="number-pad" placeholder="8" />
        </View>
        <TextField label="Paket bitiş tarihi" value={packageExpiry} onChangeText={setPackageExpiry} placeholder="YYYY-AA-GG" icon="calendar-outline" />
        {packageError ? <View style={styles.editorError}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.danger} /><AppText style={styles.editorErrorText}>{packageError}</AppText></View> : null}
        <Button label="Paketi kaydet" icon="content-save-check-outline" variant="accent" onPress={saveLessonPackage} />
      </ModalSheet>

      <ModalSheet visible={exerciseModal} onClose={() => setExerciseModal(false)} title={`${editingDay?.label ?? ''} hareketleri`} fullHeight>
        <View style={styles.editorIntro}>
          <MaterialCommunityIcons name="account-edit-outline" size={23} color={colors.accent} />
          <View style={styles.flex}><AppText style={typography.bodyMedium}>Program Editörü</AppText><AppText style={styles.muted}>Kaydettiğinde öğrencinin programı anında güncellenir.</AppText></View>
        </View>
        {editingDay?.exercises.map((exercise, index) => (
          <Card key={exercise.id} style={styles.exerciseEditorCard}>
            <View style={styles.editorCardHeader}>
              <View style={styles.editorIndex}><AppText style={styles.editorIndexText}>{index + 1}</AppText></View>
              <AppText style={[typography.h3, styles.flex]}>{exercise.name || 'Yeni hareket'}</AppText>
              <Button label="Kaldır" icon="trash-can-outline" compact variant="ghost" onPress={() => removeExercise(exercise.id)} />
            </View>
            <TextField label="Hareket adı" value={exercise.name} onChangeText={(name) => changeExercise(exercise.id, { name })} placeholder="Örn. Goblet Squat" />
            <View style={styles.editorFieldRow}>
              <TextField containerStyle={styles.editorField} label="Set" value={`${exercise.sets}`} onChangeText={(value) => changeExercise(exercise.id, { sets: Number(value.replace(/[^0-9]/g, '')) || 0 })} keyboardType="number-pad" />
              <TextField containerStyle={styles.editorField} label="Tekrar" value={exercise.reps} onChangeText={(reps) => changeExercise(exercise.id, { reps })} placeholder="10-12" />
              <TextField containerStyle={styles.editorField} label="Dinlenme" value={`${exercise.restSeconds}`} onChangeText={(value) => changeExercise(exercise.id, { restSeconds: Number(value.replace(/[^0-9]/g, '')) || 0 })} keyboardType="number-pad" />
            </View>
            <TextField label="Cem Hoca'nın notu" value={exercise.note ?? ''} onChangeText={(note) => changeExercise(exercise.id, { note })} placeholder="Tempo, form veya ağırlık notu" />
          </Card>
        ))}
        {exerciseError ? <View style={styles.editorError}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.danger} /><AppText style={styles.editorErrorText}>{exerciseError}</AppText></View> : null}
        <Button label="Yeni hareket ekle" icon="plus" variant="secondary" onPress={addExercise} />
        <Button label="Değişiklikleri kaydet" icon="content-save-check-outline" variant="accent" onPress={saveExercises} />
      </ModalSheet>
    </View>
  );
};

const Metric = ({ icon, label, value, detail }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; detail: string }) => (
  <Card style={styles.metricCard}><View style={styles.metricIcon}><MaterialCommunityIcons name={icon} size={21} color={colors.primary} /></View><AppText style={styles.metricLabel}>{label}</AppText><AppText style={styles.metricValue}>{value}</AppText><AppText style={styles.metricDetail} numberOfLines={2}>{detail}</AppText></Card>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  muted: { ...typography.caption, color: colors.inkSoft },
  profileHeader: { gap: spacing.md },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.sm },
  joined: { ...typography.caption, color: colors.inkSoft },
  quickActions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  quickButton: { flex: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: { width: '47%', flexGrow: 1, gap: spacing.xs, padding: spacing.md, minHeight: 145 },
  metricIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  metricLabel: { ...typography.caption, color: colors.inkSoft },
  metricValue: { fontSize: 19, lineHeight: 23, fontWeight: '800' },
  metricDetail: { ...typography.caption, color: colors.inkSoft },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#29331C' },
  goalIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  packageCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  packageIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.warningSoft, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { ...typography.label, color: colors.inkSoft },
  notesCard: { gap: spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitleIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  editText: { ...typography.bodyMedium, color: colors.primary },
  noteText: { color: colors.inkSoft },
  nextLesson: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lessonIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.infoSoft, alignItems: 'center', justifyContent: 'center' },
  statusCard: { gap: spacing.md },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  programHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  programIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nutritionIcon: { backgroundColor: '#29331C' },
  updated: { ...typography.caption, color: colors.success, marginTop: spacing.sm },
  dayCard: { gap: spacing.md },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exerciseCountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { ...typography.bodyMedium, color: colors.white },
  exerciseSummary: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accentDark },
  exerciseName: { flex: 1, ...typography.caption },
  exerciseSets: { ...typography.caption, color: colors.inkSoft },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  mealTime: { width: 52, height: 42, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  mealTimeText: { ...typography.caption, fontWeight: '800', color: colors.primary },
  historyBlock: { gap: spacing.md },
  coachNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.warningSoft },
  measurementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  measurementIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  measurementIconLatest: { backgroundColor: colors.accent },
  measurementTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  measurementRight: { alignItems: 'flex-end' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoCard: { width: '47%', flexGrow: 1, aspectRatio: 0.75, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  photo: { width: '100%', height: '100%' },
  photoDate: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, backgroundColor: 'rgba(16,38,34,0.75)', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  photoDateText: { ...typography.caption, color: colors.white },
  templateCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  templateCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  templateRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  templateRadioSelected: { borderColor: colors.primary },
  templateRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  editorIntro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#182018', borderWidth: 1, borderColor: '#354329', borderRadius: radius.lg, padding: spacing.md },
  exerciseEditorCard: { gap: spacing.md, padding: spacing.md, backgroundColor: '#0E1411' },
  editorCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  editorIndex: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  editorIndexText: { ...typography.bodyMedium, color: colors.graphite, fontWeight: '900' },
  editorFieldRow: { flexDirection: 'row', gap: spacing.sm },
  editorField: { flex: 1 },
  nutritionEditorHeader: { gap: spacing.md, backgroundColor: '#0E1411' },
  targetTitle: { ...typography.bodyMedium, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  targetFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  targetField: { width: '47%', flexGrow: 1, minWidth: 130 },
  mealEditorRow: { flexDirection: 'row', gap: spacing.sm },
  mealTimeField: { width: 96, minWidth: 0 },
  editorError: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md },
  editorErrorText: { flex: 1, ...typography.caption, color: colors.danger },
});
