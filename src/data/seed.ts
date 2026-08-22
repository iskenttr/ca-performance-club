import { createCredential } from '../services/auth';
import { AppData, Student, TRAINER_ID, Trainer } from '../types/domain';
import { dateWithOffset, toDateInput } from '../utils/date';
import { buildNutritionTemplate, buildProgramTemplate } from './templates';

export const SCHEMA_VERSION = 1;
export const DEMO_STUDENT_ID = 'student-deniz-kaya';
export const SECOND_STUDENT_ID = 'student-elif-yilmaz';

export const demoAccounts = {
  trainer: { email: 'cem@cemfit.app', password: 'Cem123!' },
  student: { email: 'ogrenci@cemfit.app', password: 'Ogrenci123!' },
} as const;

export const createSeedData = async (): Promise<AppData> => {
  const createdAt = dateWithOffset(-50, 9);
  const trainer: Trainer = {
    id: TRAINER_ID,
    role: 'trainer',
    fullName: 'Cem Arslanoğlu',
    email: demoAccounts.trainer.email,
    phone: '+90 532 000 00 00',
    title: 'Personal Trainer',
    bio: 'Sürdürülebilir kuvvet, doğru hareket ve düzenli ilerleme odaklı kişisel antrenörlük.',
    createdAt,
  };

  const deniz: Student = {
    id: DEMO_STUDENT_ID,
    role: 'student',
    trainerId: TRAINER_ID,
    fullName: 'Deniz Kaya',
    email: demoAccounts.student.email,
    phone: '+90 555 120 34 56',
    status: 'active',
    goal: 'Yağ kaybı & sıkılaşma',
    level: 'Orta',
    weeklyGoal: 3,
    heightCm: 168,
    biologicalSex: 'female',
    birthYear: 1996,
    createdAt,
  };

  const elif: Student = {
    id: SECOND_STUDENT_ID,
    role: 'student',
    trainerId: TRAINER_ID,
    fullName: 'Elif Yılmaz',
    email: 'elif@example.com',
    phone: '+90 555 441 82 10',
    status: 'new',
    goal: 'Kuvvet kazanımı',
    level: 'Başlangıç',
    weeklyGoal: 2,
    heightCm: 172,
    biologicalSex: 'female',
    birthYear: 1993,
    notes: 'Diz hassasiyeti; derin fleksiyonda dikkat.',
    createdAt: dateWithOffset(-5, 14),
  };

  const credentials = await Promise.all([
    createCredential(trainer.id, trainer.email, demoAccounts.trainer.password, 'cemfit-trainer-demo'),
    createCredential(deniz.id, deniz.email, demoAccounts.student.password, 'cemfit-student-demo'),
    createCredential(elif.id, elif.email, 'Elif123!', 'cemfit-second-demo'),
  ]);

  const denizProgram = buildProgramTemplate('balanced3', deniz.id, dateWithOffset(-8));
  const elifProgram = buildProgramTemplate('starter2', elif.id, dateWithOffset(-2));

  return {
    schemaVersion: SCHEMA_VERSION,
    users: [trainer, deniz, elif],
    credentials,
    workoutPrograms: [denizProgram, elifProgram],
    nutritionPlans: [
      buildNutritionTemplate('light', deniz.id, dateWithOffset(-8)),
      buildNutritionTemplate('balanced', elif.id, dateWithOffset(-2)),
    ],
    measurements: [
      { id: 'm-deniz-1', studentId: deniz.id, date: dateWithOffset(-42), weightKg: 72.4, bodyFatPercent: 28.1, waistCm: 82, hipCm: 103, chestCm: 91 },
      { id: 'm-deniz-2', studentId: deniz.id, date: dateWithOffset(-28), weightKg: 71.2, bodyFatPercent: 27.3, waistCm: 80, hipCm: 102, chestCm: 90 },
      { id: 'm-deniz-3', studentId: deniz.id, date: dateWithOffset(-14), weightKg: 70.6, bodyFatPercent: 26.8, waistCm: 79, hipCm: 101, chestCm: 90 },
      { id: 'm-deniz-4', studentId: deniz.id, date: dateWithOffset(-1), weightKg: 69.8, bodyFatPercent: 26.2, waistCm: 78, hipCm: 100, chestCm: 89 },
      { id: 'm-elif-1', studentId: elif.id, date: dateWithOffset(-4), weightKg: 64.1, waistCm: 73, hipCm: 96 },
    ],
    progressPhotos: [],
    appointments: [
      { id: 'a-1', trainerId: TRAINER_ID, studentId: deniz.id, startAt: dateWithOffset(1, 18, 30), durationMinutes: 60, mode: 'in_person', status: 'confirmed', note: 'Alt vücut teknik kontrolü' },
      { id: 'a-2', trainerId: TRAINER_ID, studentId: elif.id, startAt: dateWithOffset(2, 11), durationMinutes: 60, mode: 'online', status: 'pending', note: 'İlk değerlendirme' },
      { id: 'a-3', trainerId: TRAINER_ID, studentId: deniz.id, startAt: dateWithOffset(5, 19), durationMinutes: 60, mode: 'in_person', status: 'confirmed', note: 'Üst vücut antrenmanı' },
      { id: 'a-4', trainerId: TRAINER_ID, studentId: deniz.id, startAt: dateWithOffset(-4, 18), durationMinutes: 60, mode: 'in_person', status: 'completed', note: 'Tüm vücut' },
    ],
    appointmentBlocks: [],
    messages: [
      { id: 'msg-1', studentId: deniz.id, senderId: TRAINER_ID, text: 'Merhaba Deniz, bu haftaki programını güncelledim. İlk gün squat formuna odaklanalım.', sentAt: dateWithOffset(-2, 12) },
      { id: 'msg-2', studentId: deniz.id, senderId: deniz.id, text: 'Süper hocam, yarın başlıyorum. Belimdeki durum da oldukça iyi.', sentAt: dateWithOffset(-2, 12, 12), readAt: dateWithOffset(-2, 12, 20) },
      { id: 'msg-3', studentId: deniz.id, senderId: TRAINER_ID, text: 'Harika. Hareketlerde ağrı olursa zorlamadan bana yaz.', sentAt: dateWithOffset(-2, 12, 30), readAt: dateWithOffset(-1, 8) },
      { id: 'msg-4', studentId: elif.id, senderId: elif.id, text: 'Cem Hocam merhaba, ilk ders için spor ayakkabı dışında getirmem gereken bir şey var mı?', sentAt: dateWithOffset(-1, 15) },
    ],
    workoutCompletions: denizProgram.days[0].exercises.slice(0, 2).map((item, index) => ({
      id: `completion-${index + 1}`,
      studentId: deniz.id,
      exerciseId: item.id,
      completedOn: toDateInput(),
    })),
    mealEntries: [],
  };
};
