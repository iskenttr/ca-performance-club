import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { buildNutritionTemplate, buildProgramTemplate, NutritionTemplateId, ProgramTemplateId } from '../data/templates';
import { demoAccounts } from '../data/seed';
import { createCredential, normalizeEmail, verifyCredential } from '../services/auth';
import { loadData, loadSession, resetStoredData, saveData, saveSession } from '../services/storage';
import {
  AppData,
  AppointmentInput,
  MeasurementInput,
  RegisterInput,
  Role,
  Student,
  TRAINER_ID,
  User,
  WorkoutDay,
} from '../types/domain';
import { toDateInput } from '../utils/date';

interface AppContextValue {
  isLoading: boolean;
  data: AppData | null;
  user: User | null;
  students: Student[];
  signIn: (email: string, password: string) => Promise<void>;
  demoSignIn: (role: Role) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userId: string, changes: Partial<User>) => void;
  assignProgram: (studentId: string, templateId: ProgramTemplateId) => void;
  updateWorkoutDay: (studentId: string, day: WorkoutDay) => void;
  assignNutrition: (studentId: string, templateId: NutritionTemplateId) => void;
  addMeasurement: (studentId: string, input: MeasurementInput) => void;
  addProgressPhoto: (studentId: string, uri: string, caption?: string) => void;
  removeProgressPhoto: (photoId: string) => void;
  addAppointment: (input: AppointmentInput, status?: 'pending' | 'confirmed') => void;
  updateAppointmentStatus: (appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') => void;
  sendMessage: (studentId: string, text: string) => void;
  markThreadRead: (studentId: string) => void;
  toggleExercise: (studentId: string, exerciseId: string) => void;
  deleteCurrentAccount: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [data, setData] = useState<AppData | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([loadData(), loadSession()])
      .then(([nextData, storedUserId]) => {
        if (!active) return;
        setData(nextData);
        if (storedUserId && nextData.users.some((item) => item.id === storedUserId)) {
          setSessionUserId(storedUserId);
        }
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const commit = (recipe: (current: AppData) => AppData) => {
    setData((current) => {
      if (!current) return current;
      const next = recipe(current);
      void saveData(next);
      return next;
    });
  };

  const openSession = async (userId: string) => {
    setSessionUserId(userId);
    await saveSession(userId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const signIn = async (email: string, password: string) => {
    if (!data) throw new Error('Veriler henüz hazır değil.');
    const credential = data.credentials.find((item) => item.email === normalizeEmail(email));
    if (!credential || !(await verifyCredential(credential, password))) {
      throw new Error('E-posta veya şifre hatalı.');
    }
    await openSession(credential.userId);
  };

  const demoSignIn = async (role: Role) => {
    const account = role === 'trainer' ? demoAccounts.trainer : demoAccounts.student;
    await signIn(account.email, account.password);
  };

  const register = async (input: RegisterInput) => {
    if (!data) throw new Error('Veriler henüz hazır değil.');
    const email = normalizeEmail(input.email);
    if (data.credentials.some((item) => item.email === email)) {
      throw new Error('Bu e-posta ile daha önce kayıt olunmuş.');
    }
    if (input.password.length < 8) throw new Error('Şifre en az 8 karakter olmalı.');

    const userId = `student-${Crypto.randomUUID()}`;
    const student: Student = {
      id: userId,
      role: 'student',
      trainerId: TRAINER_ID,
      status: 'new',
      fullName: input.fullName.trim(),
      email,
      phone: input.phone.trim(),
      goal: input.goal,
      level: input.level,
      weeklyGoal: input.weeklyGoal,
      createdAt: new Date().toISOString(),
    };
    const credential = await createCredential(userId, email, input.password);
    const now = new Date().toISOString();

    const next: AppData = {
      ...data,
      users: [...data.users, student],
      credentials: [...data.credentials, credential],
      messages: [
        ...data.messages,
        {
          id: `msg-${Crypto.randomUUID()}`,
          studentId: userId,
          senderId: TRAINER_ID,
          text: `CA Performance Club'a hoş geldin ${student.fullName.split(' ')[0]}! Profilini inceleyip programını birlikte netleştireceğiz.`,
          sentAt: now,
        },
      ],
    };
    setData(next);
    await saveData(next);
    await openSession(userId);
  };

  const signOut = async () => {
    setSessionUserId(null);
    await saveSession(null);
  };

  const updateUser = (userId: string, changes: Partial<User>) => {
    commit((current) => ({
      ...current,
      users: current.users.map((item) => (item.id === userId ? ({ ...item, ...changes, id: item.id, role: item.role } as User) : item)),
    }));
  };

  const assignProgram = (studentId: string, templateId: ProgramTemplateId) => {
    const program = buildProgramTemplate(templateId, studentId);
    commit((current) => ({
      ...current,
      users: current.users.map((item) =>
        item.id === studentId && item.role === 'student' ? { ...item, status: 'active' as const } : item,
      ),
      workoutPrograms: [...current.workoutPrograms.filter((item) => item.studentId !== studentId), program],
      workoutCompletions: current.workoutCompletions.filter((item) => item.studentId !== studentId),
    }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const assignNutrition = (studentId: string, templateId: NutritionTemplateId) => {
    const plan = buildNutritionTemplate(templateId, studentId);
    commit((current) => ({
      ...current,
      nutritionPlans: [...current.nutritionPlans.filter((item) => item.studentId !== studentId), plan],
    }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateWorkoutDay = (studentId: string, day: WorkoutDay) => {
    commit((current) => {
      const existing = current.workoutPrograms.find((item) => item.studentId === studentId);
      if (!existing) return current;
      const nextDays = existing.days.map((item) => (item.id === day.id ? day : item));
      const allowedExerciseIds = new Set(nextDays.flatMap((item) => item.exercises.map((exercise) => exercise.id)));
      return {
        ...current,
        workoutPrograms: current.workoutPrograms.map((item) =>
          item.studentId === studentId ? { ...item, days: nextDays, updatedAt: new Date().toISOString() } : item,
        ),
        workoutCompletions: current.workoutCompletions.filter(
          (item) => item.studentId !== studentId || allowedExerciseIds.has(item.exerciseId),
        ),
      };
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addMeasurement = (studentId: string, input: MeasurementInput) => {
    commit((current) => ({
      ...current,
      measurements: [
        ...current.measurements,
        {
          ...input,
          id: `measurement-${Crypto.randomUUID()}`,
          studentId,
          date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
        },
      ],
    }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addProgressPhoto = (studentId: string, uri: string, caption = 'Gelişim fotoğrafı') => {
    commit((current) => ({
      ...current,
      progressPhotos: [
        ...current.progressPhotos,
        { id: `photo-${Crypto.randomUUID()}`, studentId, uri, caption, date: new Date().toISOString() },
      ],
    }));
  };

  const removeProgressPhoto = (photoId: string) => {
    commit((current) => ({
      ...current,
      progressPhotos: current.progressPhotos.filter((item) => item.id !== photoId),
    }));
  };

  const addAppointment = (input: AppointmentInput, status: 'pending' | 'confirmed' = 'confirmed') => {
    commit((current) => ({
      ...current,
      appointments: [
        ...current.appointments,
        {
          id: `appointment-${Crypto.randomUUID()}`,
          trainerId: TRAINER_ID,
          ...input,
          status,
        },
      ],
    }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateAppointmentStatus = (
    appointmentId: string,
    status: 'confirmed' | 'completed' | 'cancelled',
  ) => {
    commit((current) => ({
      ...current,
      appointments: current.appointments.map((item) => (item.id === appointmentId ? { ...item, status } : item)),
    }));
  };

  const sendMessage = (studentId: string, text: string) => {
    if (!sessionUserId || !text.trim()) return;
    commit((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: `message-${Crypto.randomUUID()}`,
          studentId,
          senderId: sessionUserId,
          text: text.trim(),
          sentAt: new Date().toISOString(),
        },
      ],
    }));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const markThreadRead = (studentId: string) => {
    if (!sessionUserId) return;
    const now = new Date().toISOString();
    commit((current) => ({
      ...current,
      messages: current.messages.map((item) =>
        item.studentId === studentId && item.senderId !== sessionUserId && !item.readAt
          ? { ...item, readAt: now }
          : item,
      ),
    }));
  };

  const toggleExercise = (studentId: string, exerciseId: string) => {
    const completedOn = toDateInput();
    commit((current) => {
      const existing = current.workoutCompletions.find(
        (item) => item.studentId === studentId && item.exerciseId === exerciseId && item.completedOn === completedOn,
      );
      return {
        ...current,
        workoutCompletions: existing
          ? current.workoutCompletions.filter((item) => item.id !== existing.id)
          : [
              ...current.workoutCompletions,
              { id: `completion-${Crypto.randomUUID()}`, studentId, exerciseId, completedOn },
            ],
      };
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteCurrentAccount = async () => {
    if (!data || !sessionUserId) return;
    const target = data.users.find((item) => item.id === sessionUserId);
    if (!target || target.role !== 'student') throw new Error('Eğitmen hesabı bu demo içinden silinemez.');
    const next: AppData = {
      ...data,
      users: data.users.filter((item) => item.id !== sessionUserId),
      credentials: data.credentials.filter((item) => item.userId !== sessionUserId),
      workoutPrograms: data.workoutPrograms.filter((item) => item.studentId !== sessionUserId),
      nutritionPlans: data.nutritionPlans.filter((item) => item.studentId !== sessionUserId),
      measurements: data.measurements.filter((item) => item.studentId !== sessionUserId),
      progressPhotos: data.progressPhotos.filter((item) => item.studentId !== sessionUserId),
      appointments: data.appointments.filter((item) => item.studentId !== sessionUserId),
      messages: data.messages.filter((item) => item.studentId !== sessionUserId),
      workoutCompletions: data.workoutCompletions.filter((item) => item.studentId !== sessionUserId),
    };
    setData(next);
    setSessionUserId(null);
    await Promise.all([saveData(next), saveSession(null)]);
  };

  const resetDemo = async () => {
    setIsLoading(true);
    const seed = await resetStoredData();
    setData(seed);
    setSessionUserId(null);
    setIsLoading(false);
  };

  const user = data?.users.find((item) => item.id === sessionUserId) ?? null;
  const students = useMemo(
    () => (data?.users.filter((item): item is Student => item.role === 'student' && item.trainerId === TRAINER_ID) ?? []),
    [data],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      isLoading,
      data,
      user,
      students,
      signIn,
      demoSignIn,
      register,
      signOut,
      updateUser,
      assignProgram,
      updateWorkoutDay,
      assignNutrition,
      addMeasurement,
      addProgressPhoto,
      removeProgressPhoto,
      addAppointment,
      updateAppointmentStatus,
      sendMessage,
      markThreadRead,
      toggleExercise,
      deleteCurrentAccount,
      resetDemo,
    }),
    [data, isLoading, students, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};
