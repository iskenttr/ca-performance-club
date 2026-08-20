export interface AppleHealthSnapshot {
  steps: number;
  activeEnergyKcal: number;
  exerciseMinutes: number;
  workoutCount: number;
  lastUpdated: string;
}

export const emptyAppleHealthSnapshot = (): AppleHealthSnapshot => ({
  steps: 0,
  activeEnergyKcal: 0,
  exerciseMinutes: 0,
  workoutCount: 0,
  lastUpdated: new Date().toISOString(),
});

export const isAppleHealthAvailable = async () => false;
export const requestAppleHealthAccess = async () => false;
export const readAppleHealthSnapshot = async () => emptyAppleHealthSnapshot();
