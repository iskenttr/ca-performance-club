import {
  isHealthDataAvailable,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import type { AppleHealthSnapshot } from './appleHealth';

const readTypes = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKWorkoutTypeIdentifier',
] as const;

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const isAppleHealthAvailable = async () => isHealthDataAvailable();

export const requestAppleHealthAccess = async () => requestAuthorization({ toRead: readTypes });

export const readAppleHealthSnapshot = async (): Promise<AppleHealthSnapshot> => {
  const startDate = startOfToday();
  const filter = { date: { startDate, strictStartDate: true } };
  const [steps, energy, exercise, workouts] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter, unit: 'count' }),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter, unit: 'kcal' }),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierAppleExerciseTime', ['cumulativeSum'], { filter, unit: 'min' }),
    queryWorkoutSamples({ limit: 50, ascending: false, filter: { date: { startDate, strictStartDate: true } } }),
  ]);
  return {
    steps: Math.round(steps.sumQuantity?.quantity ?? 0),
    activeEnergyKcal: Math.round(energy.sumQuantity?.quantity ?? 0),
    exerciseMinutes: Math.round(exercise.sumQuantity?.quantity ?? 0),
    workoutCount: workouts.length,
    lastUpdated: new Date().toISOString(),
  };
};
