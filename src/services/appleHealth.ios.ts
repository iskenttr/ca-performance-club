import {
  configureBackgroundTypes,
  isHealthDataAvailable,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  subscribeToChanges,
  UpdateFrequency,
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

export const configureAppleHealthBackgroundUpdates = async () =>
  configureBackgroundTypes([...readTypes], UpdateFrequency.immediate);

export const subscribeToAppleHealthChanges = (onChange: () => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subscriptions = readTypes.map((type) =>
    subscribeToChanges(type, ({ errorMessage }) => {
      if (errorMessage) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(onChange, 750);
    }),
  );
  return () => {
    if (timer) clearTimeout(timer);
    subscriptions.forEach((subscription) => subscription.remove());
  };
};

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
