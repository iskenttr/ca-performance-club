export const TRAINER_ID = 'trainer-cem-arslanoglu';

export type Role = 'student' | 'trainer';
export type StudentStatus = 'new' | 'active' | 'paused';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface BaseUser {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  avatarUri?: string;
  createdAt: string;
}

export interface Trainer extends BaseUser {
  role: 'trainer';
  title: string;
  bio: string;
}

export interface Student extends BaseUser {
  role: 'student';
  trainerId: typeof TRAINER_ID;
  status: StudentStatus;
  goal: string;
  level: 'Başlangıç' | 'Orta' | 'İleri';
  weeklyGoal: number;
  heightCm?: number;
  birthYear?: number;
  notes?: string;
}

export type User = Student | Trainer;

export interface Credential {
  userId: string;
  email: string;
  salt: string;
  passwordHash: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  note?: string;
}

export interface WorkoutDay {
  id: string;
  label: string;
  title: string;
  focus: string;
  durationMinutes: number;
  exercises: Exercise[];
}

export interface WorkoutProgram {
  id: string;
  studentId: string;
  title: string;
  description: string;
  updatedAt: string;
  days: WorkoutDay[];
}

export interface Meal {
  id: string;
  time: string;
  title: string;
  items: string[];
}

export interface NutritionPlan {
  id: string;
  studentId: string;
  title: string;
  dailyWaterLiters: number;
  note: string;
  updatedAt: string;
  meals: Meal[];
  targets?: NutritionTargets;
}

export interface NutritionTargets {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface AnalyzedFoodItem {
  name: string;
  logMealDishId?: number;
  confidence?: number;
  portionGrams?: number;
  ingredients: { name: string; quantity?: number; unit?: string }[];
}

export interface MealAnalysis {
  analysisToken: string;
  logMealImageId: number;
  name: string;
  foods: AnalyzedFoodItem[];
  portionGrams?: number;
  portionEditable?: boolean;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealEntry {
  id: string;
  studentId: string;
  eatenAt: string;
  mealType: MealType;
  photoUri: string;
  name: string;
  foods: AnalyzedFoodItem[];
  portionGrams?: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  logMealImageId: number;
  logMealDishIds: number[];
  createdAt: string;
}

export interface Measurement {
  id: string;
  studentId: string;
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  waistCm?: number;
  chestCm?: number;
  hipCm?: number;
  armCm?: number;
}

export interface ProgressPhoto {
  id: string;
  studentId: string;
  date: string;
  uri: string;
  caption: string;
}

export interface Appointment {
  id: string;
  trainerId: typeof TRAINER_ID;
  studentId: string;
  startAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  note: string;
}

export interface ChatMessage {
  id: string;
  studentId: string;
  senderId: string;
  text: string;
  sentAt: string;
  readAt?: string;
}

export interface WorkoutCompletion {
  id: string;
  studentId: string;
  exerciseId: string;
  completedOn: string;
}

export interface AppData {
  schemaVersion: number;
  users: User[];
  credentials: Credential[];
  workoutPrograms: WorkoutProgram[];
  nutritionPlans: NutritionPlan[];
  measurements: Measurement[];
  progressPhotos: ProgressPhoto[];
  appointments: Appointment[];
  messages: ChatMessage[];
  workoutCompletions: WorkoutCompletion[];
  mealEntries: MealEntry[];
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  goal: string;
  level: Student['level'];
  weeklyGoal: number;
}

export type MeasurementInput = Omit<Measurement, 'id' | 'studentId' | 'date'> & {
  date?: string;
};

export type AppointmentInput = Pick<Appointment, 'studentId' | 'startAt' | 'durationMinutes' | 'note'>;
