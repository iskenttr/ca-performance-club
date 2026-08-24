import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildNutritionTemplate, buildProgramTemplate, NutritionTemplateId, ProgramTemplateId } from '../data/templates';
import { demoAccounts } from '../data/seed';
import { normalizeEmail, verifyCredential } from '../services/auth';
import {
  analyzeMealPhoto as analyzeMealPhotoRequest,
  customizeMealAnalysis as customizeMealAnalysisRequest,
  deleteMeal as deleteMealRequest,
  deleteRemoteAccount,
  fetchRemoteData,
  MealPhotoPayload,
  MealUpdateInput,
  migrateLegacyAccount,
  recalculateMealAnalysis as recalculateMealAnalysisRequest,
  repeatMeal as repeatMealRequest,
  remoteRegister,
  remoteSignIn,
  saveAnalyzedMeal as saveAnalyzedMealRequest,
  saveRemoteData,
  updateMeal as updateMealRequest,
} from '../services/api';
import { loadData, loadSession, normalizeData, resetStoredData, saveData, saveSession } from '../services/storage';
import {
  AppData,
  AppointmentInput,
  MeasurementInput,
  MealAnalysis,
  MealType,
  NutritionPlan,
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
  updateNutritionPlan: (studentId: string, plan: NutritionPlan) => void;
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
  analyzeMealPhoto: (photo: MealPhotoPayload) => Promise<MealAnalysis>;
  recalculateMealAnalysis: (analysisToken: string, portionGrams: number) => Promise<MealAnalysis>;
  customizeMealAnalysis: (analysisToken: string, foods: { name: string; removed: boolean }[]) => Promise<MealAnalysis>;
  saveAnalyzedMeal: (input: MealPhotoPayload & { analysisToken: string; mealType: MealType; eatenAt: string }) => Promise<void>;
  updateMeal: (mealId: string, input: MealUpdateInput) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  repeatMeal: (mealId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [data, setData] = useState<AppData | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([loadData(), loadSession()])
      .then(async ([localData, storedSession]) => {
        if (!active) return;
        if (storedSession) {
          try {
            const remoteData = await fetchRemoteData(storedSession.token);
            if (!active) return;
            setData(normalizeData(remoteData));
            setSessionUserId(storedSession.userId);
            setSessionToken(storedSession.token);
            await saveData(normalizeData(remoteData));
            return;
          } catch {
            await saveSession(null);
          }
        }
        setData(normalizeData(localData));
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionToken) return undefined;
    const refresh = () => {
      void fetchRemoteData(sessionToken).then((next) => {
        const normalized = normalizeData(next);
        setData(normalized);
        void saveData(normalized);
      }).catch(() => undefined);
    };
    const timer = setInterval(refresh, 12000);
    return () => clearInterval(timer);
  }, [sessionToken]);

  const commit = useCallback((recipe: (current: AppData) => AppData) => {
    setData((current) => {
      if (!current) return current;
      const next = recipe(current);
      void saveData(next);
      if (sessionToken) void saveRemoteData(next, sessionToken);
      return next;
    });
  }, [sessionToken]);

  const openSession = async (userId: string, token: string) => {
    setSessionUserId(userId);
    setSessionToken(token);
    await saveSession({ userId, token });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const signIn = async (email: string, password: string) => {
    if (!data) throw new Error('Veriler henüz hazır değil.');
    const localCredential = data.credentials.find((item) => item.email === normalizeEmail(email));
    if (localCredential && (await verifyCredential(localCredential, password))) {
      try {
        const migrated = await migrateLegacyAccount(data, email, password);
        const next = normalizeData(migrated.data);
        setData(next);
        await saveData(next);
        await openSession(migrated.userId, migrated.token);
        return;
      } catch {
        // Hesap daha önce sunucuya aktarılmışsa normal giriş akışına devam et.
      }
    }
    try {
      const result = await remoteSignIn(email, password);
      const next = normalizeData(result.data);
      setData(next);
      await saveData(next);
      await openSession(result.userId, result.token);
      return;
    } catch (remoteError) {
      if (!localCredential || !(await verifyCredential(localCredential, password))) throw remoteError;
      const result = await migrateLegacyAccount(data, email, password);
      const next = normalizeData(result.data);
      setData(next);
      await saveData(next);
      await openSession(result.userId, result.token);
    }
  };

  const demoSignIn = async (role: Role) => {
    const account = role === 'trainer' ? demoAccounts.trainer : demoAccounts.student;
    await signIn(account.email, account.password);
  };

  const register = async (input: RegisterInput) => {
    if (input.password.length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
    const result = await remoteRegister(input);
    const next = normalizeData(result.data);
    setData(next);
    await saveData(next);
    await openSession(result.userId, result.token);
  };

  const signOut = async () => {
    setSessionUserId(null);
    setSessionToken(null);
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

  const updateNutritionPlan = (studentId: string, plan: NutritionPlan) => {
    commit((current) => ({
      ...current,
      nutritionPlans: current.nutritionPlans.map((item) =>
        item.studentId === studentId
          ? { ...plan, id: item.id, studentId, updatedAt: new Date().toISOString() }
          : item,
      ),
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

  const markThreadRead = useCallback((studentId: string) => {
    if (!sessionUserId) return;
    const now = new Date().toISOString();
    commit((current) => {
      const hasUnread = current.messages.some((item) => item.studentId === studentId && item.senderId !== sessionUserId && !item.readAt);
      if (!hasUnread) return current;
      return {
        ...current,
        messages: current.messages.map((item) =>
        item.studentId === studentId && item.senderId !== sessionUserId && !item.readAt
          ? { ...item, readAt: now }
          : item,
        ),
      };
    });
  }, [commit, sessionUserId]);

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
    if (!data || !sessionUserId || !sessionToken) return;
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
      mealEntries: data.mealEntries.filter((item) => item.studentId !== sessionUserId),
    };
    setData(next);
    setSessionUserId(null);
    setSessionToken(null);
    await deleteRemoteAccount(sessionToken);
    await Promise.all([saveData(next), saveSession(null)]);
  };

  const resetDemo = async () => {
    setIsLoading(true);
    const seed = await resetStoredData();
    setData(seed);
    setSessionUserId(null);
    setSessionToken(null);
    setIsLoading(false);
  };

  const requireSessionToken = () => {
    if (!sessionToken) throw new Error('Öğün analizi için yeniden giriş yapmalısın.');
    return sessionToken;
  };

  const analyzeMealPhoto = (photo: MealPhotoPayload) =>
    analyzeMealPhotoRequest(photo, requireSessionToken());

  const recalculateMealAnalysis = (analysisToken: string, portionGrams: number) =>
    recalculateMealAnalysisRequest(analysisToken, portionGrams, requireSessionToken());

  const customizeMealAnalysis = (analysisToken: string, foods: { name: string; removed: boolean }[]) =>
    customizeMealAnalysisRequest(analysisToken, foods, requireSessionToken());

  const saveAnalyzedMeal = async (
    input: MealPhotoPayload & { analysisToken: string; mealType: MealType; eatenAt: string },
  ) => {
    const result = await saveAnalyzedMealRequest(input, requireSessionToken());
    const next = normalizeData(result.data);
    setData(next);
    await saveData(next);
  };

  const applyMealData = async (result: { data: AppData }) => {
    const next = normalizeData(result.data);
    setData(next);
    await saveData(next);
  };

  const updateMeal = async (mealId: string, input: MealUpdateInput) =>
    applyMealData(await updateMealRequest(mealId, input, requireSessionToken()));

  const deleteMeal = async (mealId: string) =>
    applyMealData(await deleteMealRequest(mealId, requireSessionToken()));

  const repeatMeal = async (mealId: string) =>
    applyMealData(await repeatMealRequest(mealId, requireSessionToken()));

  const user = data?.users.find((item) => item.id === sessionUserId) ?? null;
  const students = useMemo(
    () => (data?.users.filter((item): item is Student => item.role === 'student' && item.trainerId === TRAINER_ID) ?? []),
    [data],
  );

  const value: AppContextValue = {
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
      updateNutritionPlan,
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
      analyzeMealPhoto,
      recalculateMealAnalysis,
      customizeMealAnalysis,
      saveAnalyzedMeal,
      updateMeal,
      deleteMeal,
      repeatMeal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};
