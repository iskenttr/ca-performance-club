import { NutritionPlan, WorkoutDay, WorkoutProgram } from '../types/domain';

export type ProgramTemplateId = 'starter2' | 'balanced3' | 'strength4';
export type NutritionTemplateId = 'balanced' | 'performance' | 'light';

export const programTemplateOptions: Array<{
  id: ProgramTemplateId;
  title: string;
  description: string;
  days: number;
}> = [
  { id: 'starter2', title: 'Temel Başlangıç', description: 'Tüm vücut odaklı, sürdürülebilir başlangıç', days: 2 },
  { id: 'balanced3', title: 'Dengeli Gelişim', description: 'Kuvvet, kondisyon ve mobilite dengesi', days: 3 },
  { id: 'strength4', title: 'Kuvvet 4 Gün', description: 'Üst/alt vücut bölünmüş yoğun plan', days: 4 },
];

export const nutritionTemplateOptions: Array<{
  id: NutritionTemplateId;
  title: string;
  description: string;
}> = [
  { id: 'balanced', title: 'Dengeli Beslenme', description: 'Gün boyu dengeli protein, lif ve karbonhidrat' },
  { id: 'performance', title: 'Performans Desteği', description: 'Antrenman çevresinde enerji ve toparlanma odağı' },
  { id: 'light', title: 'Hafif & Düzenli', description: 'Porsiyon kontrolü ve yüksek tokluk odağı' },
];

const exercise = (
  prefix: string,
  order: number,
  name: string,
  sets: number,
  reps: string,
  restSeconds: number,
  note?: string,
) => ({ id: `${prefix}-ex-${order}`, name, sets, reps, restSeconds, note });

const day = (
  prefix: string,
  order: number,
  label: string,
  title: string,
  focus: string,
  durationMinutes: number,
  exercises: WorkoutDay['exercises'],
): WorkoutDay => ({ id: `${prefix}-day-${order}`, label, title, focus, durationMinutes, exercises });

export const buildProgramTemplate = (
  templateId: ProgramTemplateId,
  studentId: string,
  updatedAt = new Date().toISOString(),
): WorkoutProgram => {
  const prefix = `${studentId}-${templateId}`;

  if (templateId === 'starter2') {
    return {
      id: `program-${studentId}`,
      studentId,
      title: 'Temel Başlangıç · 2 Gün',
      description: 'Tekniği oturtan ve düzen kazandıran tüm vücut programı.',
      updatedAt,
      days: [
        day(prefix, 1, '1. Gün', 'Tüm Vücut A', 'Temel hareketler', 45, [
          exercise(prefix, 1, 'Goblet Squat', 3, '10', 75, 'Kontrollü iniş'),
          exercise(prefix, 2, 'Dumbbell Bench Press', 3, '10', 75),
          exercise(prefix, 3, 'Seated Row', 3, '12', 60),
          exercise(prefix, 4, 'Glute Bridge', 3, '12', 60),
          exercise(prefix, 5, 'Dead Bug', 3, '8 / taraf', 45),
        ]),
        day(prefix, 2, '2. Gün', 'Tüm Vücut B', 'Denge ve kondisyon', 45, [
          exercise(prefix, 6, 'Romanian Deadlift', 3, '10', 75),
          exercise(prefix, 7, 'Lat Pulldown', 3, '10', 60),
          exercise(prefix, 8, 'Split Squat', 3, '8 / bacak', 75),
          exercise(prefix, 9, 'Shoulder Press', 3, '10', 60),
          exercise(prefix, 10, 'Farmer Carry', 4, '30 sn', 45),
        ]),
      ],
    };
  }

  if (templateId === 'strength4') {
    return {
      id: `program-${studentId}`,
      studentId,
      title: 'Kuvvet Odaklı · 4 Gün',
      description: 'Üst ve alt vücut günleriyle kademeli kuvvet gelişimi.',
      updatedAt,
      days: [
        day(prefix, 1, '1. Gün', 'Alt Vücut · Kuvvet', 'Squat odağı', 65, [
          exercise(prefix, 1, 'Back Squat', 5, '5', 150),
          exercise(prefix, 2, 'Romanian Deadlift', 4, '8', 90),
          exercise(prefix, 3, 'Walking Lunge', 3, '10 / bacak', 75),
          exercise(prefix, 4, 'Standing Calf Raise', 4, '12', 60),
        ]),
        day(prefix, 2, '2. Gün', 'Üst Vücut · İtiş', 'Göğüs ve omuz', 60, [
          exercise(prefix, 5, 'Bench Press', 5, '5', 150),
          exercise(prefix, 6, 'Overhead Press', 4, '8', 90),
          exercise(prefix, 7, 'Incline Dumbbell Press', 3, '10', 75),
          exercise(prefix, 8, 'Cable Triceps Pushdown', 3, '12', 60),
        ]),
        day(prefix, 3, '3. Gün', 'Alt Vücut · Hacim', 'Kalça ve arka bacak', 60, [
          exercise(prefix, 9, 'Deadlift', 4, '5', 150),
          exercise(prefix, 10, 'Leg Press', 4, '10', 90),
          exercise(prefix, 11, 'Hip Thrust', 4, '10', 90),
          exercise(prefix, 12, 'Leg Curl', 3, '12', 60),
        ]),
        day(prefix, 4, '4. Gün', 'Üst Vücut · Çekiş', 'Sırt ve kol', 60, [
          exercise(prefix, 13, 'Assisted Pull-up', 4, '6–8', 90),
          exercise(prefix, 14, 'Barbell Row', 4, '8', 90),
          exercise(prefix, 15, 'Face Pull', 3, '15', 60),
          exercise(prefix, 16, 'Dumbbell Curl', 3, '12', 60),
        ]),
      ],
    };
  }

  return {
    id: `program-${studentId}`,
    studentId,
    title: 'Dengeli Gelişim · 3 Gün',
    description: 'Kuvvet, kondisyon ve hareket kalitesini birlikte geliştiren plan.',
    updatedAt,
    days: [
      day(prefix, 1, '1. Gün', 'Alt Vücut', 'Bacak & core', 55, [
        exercise(prefix, 1, 'Back Squat', 4, '8', 90, 'Son iki tekrar zorlayıcı olmalı'),
        exercise(prefix, 2, 'Romanian Deadlift', 3, '10', 75),
        exercise(prefix, 3, 'Reverse Lunge', 3, '10 / bacak', 60),
        exercise(prefix, 4, 'Leg Curl', 3, '12', 60),
        exercise(prefix, 5, 'Plank', 3, '40 sn', 45),
      ]),
      day(prefix, 2, '2. Gün', 'Üst Vücut', 'Sırt & göğüs', 50, [
        exercise(prefix, 6, 'Dumbbell Bench Press', 4, '8', 90),
        exercise(prefix, 7, 'Lat Pulldown', 4, '10', 75),
        exercise(prefix, 8, 'Seated Shoulder Press', 3, '10', 60),
        exercise(prefix, 9, 'Cable Row', 3, '12', 60),
        exercise(prefix, 10, 'Face Pull', 3, '15', 45),
      ]),
      day(prefix, 3, '3. Gün', 'Atletik Tüm Vücut', 'Kondisyon & mobilite', 45, [
        exercise(prefix, 11, 'Kettlebell Deadlift', 4, '10', 75),
        exercise(prefix, 12, 'Push-up', 4, 'Maks. - 2', 60),
        exercise(prefix, 13, 'Step-up', 3, '10 / bacak', 60),
        exercise(prefix, 14, 'Battle Rope', 6, '20 sn', 40),
        exercise(prefix, 15, 'Hip Mobility Flow', 2, '5 dk', 30),
      ]),
    ],
  };
};

export const buildNutritionTemplate = (
  templateId: NutritionTemplateId,
  studentId: string,
  updatedAt = new Date().toISOString(),
): NutritionPlan => {
  const prefix = `${studentId}-${templateId}`;

  if (templateId === 'performance') {
    return {
      id: `nutrition-${studentId}`,
      studentId,
      title: 'Performans Desteği',
      dailyWaterLiters: 3,
      note: 'Antrenman günlerinde karbonhidratı antrenman öncesi ve sonrasına yay.',
      updatedAt,
      meals: [
        { id: `${prefix}-1`, time: '08:00', title: 'Kahvaltı', items: ['3 yumurtalı omlet', 'Yulaf + muz', '1 bardak kefir'] },
        { id: `${prefix}-2`, time: '11:00', title: 'Ara öğün', items: ['Yoğurt', '1 avuç çiğ badem'] },
        { id: `${prefix}-3`, time: '13:30', title: 'Öğle', items: ['150 g tavuk veya hindi', 'Bulgur pilavı', 'Bol salata'] },
        { id: `${prefix}-4`, time: '17:00', title: 'Antrenman öncesi', items: ['Muz', '2 pirinç patlağı', 'Sade kahve (isteğe bağlı)'] },
        { id: `${prefix}-5`, time: '20:00', title: 'Akşam', items: ['Izgara balık veya et', 'Patates / pirinç', 'Sebze'] },
      ],
    };
  }

  if (templateId === 'light') {
    return {
      id: `nutrition-${studentId}`,
      studentId,
      title: 'Hafif & Düzenli',
      dailyWaterLiters: 2.5,
      note: 'Öğünleri yavaş ye; tabağın yarısını sebzelerle doldur.',
      updatedAt,
      meals: [
        { id: `${prefix}-1`, time: '08:30', title: 'Kahvaltı', items: ['2 yumurta', 'Domates, salatalık ve yeşillik', '1 dilim tam tahıllı ekmek'] },
        { id: `${prefix}-2`, time: '12:30', title: 'Öğle', items: ['Proteinli büyük salata', '1 kase yoğurt'] },
        { id: `${prefix}-3`, time: '16:00', title: 'Ara öğün', items: ['1 porsiyon meyve', '10 çiğ badem'] },
        { id: `${prefix}-4`, time: '19:30', title: 'Akşam', items: ['Izgara protein', 'Zeytinyağlı sebze', '1 küçük kase çorba'] },
      ],
    };
  }

  return {
    id: `nutrition-${studentId}`,
    studentId,
    title: 'Dengeli Beslenme',
    dailyWaterLiters: 2.5,
    note: 'Açlık ve performans durumuna göre porsiyonları Cem Hoca ile birlikte güncelle.',
    updatedAt,
    meals: [
      { id: `${prefix}-1`, time: '08:00', title: 'Kahvaltı', items: ['2 yumurta', 'Peynir ve yeşillik', '1–2 dilim tam tahıllı ekmek'] },
      { id: `${prefix}-2`, time: '11:00', title: 'Ara öğün', items: ['1 porsiyon meyve', '1 avuç çiğ kuruyemiş'] },
      { id: `${prefix}-3`, time: '13:30', title: 'Öğle', items: ['120–150 g protein', 'Bulgur veya pirinç', 'Salata / sebze'] },
      { id: `${prefix}-4`, time: '16:30', title: 'Ara öğün', items: ['Yoğurt veya kefir', 'Yulaf'] },
      { id: `${prefix}-5`, time: '19:30', title: 'Akşam', items: ['120–150 g protein', 'Bol sebze', 'İhtiyaca göre kompleks karbonhidrat'] },
    ],
  };
};

