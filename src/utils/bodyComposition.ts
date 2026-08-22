import { BiologicalSex, Measurement } from '../types/domain';

export const roundBodyValue = (value: number) => Math.round(value * 10) / 10;

export const calculateRfmPercent = (heightCm: number, waistCm: number, biologicalSex: BiologicalSex) =>
  roundBodyValue((biologicalSex === 'male' ? 64 : 76) - 20 * (heightCm / waistCm));

export const calculateBodyMasses = (weightKg: number, bodyFatPercent: number) => {
  const fatMassKg = roundBodyValue(weightKg * bodyFatPercent / 100);
  return { fatMassKg, leanMassKg: roundBodyValue(weightKg - fatMassKg) };
};

export const effectiveBodyFatPercent = (measurement?: Measurement) => measurement
  ? measurement.professionalBodyFatPercent ?? measurement.bodyFatPercent ?? measurement.rfmBodyFatPercent
  : undefined;

export const bodyMassesForMeasurement = (measurement?: Measurement) => {
  if (!measurement) return undefined;
  const bodyFatPercent = effectiveBodyFatPercent(measurement);
  if (bodyFatPercent == null) return undefined;
  if (measurement.fatMassKg != null && measurement.leanMassKg != null) {
    return { fatMassKg: measurement.fatMassKg, leanMassKg: measurement.leanMassKg };
  }
  return calculateBodyMasses(measurement.weightKg, bodyFatPercent);
};
