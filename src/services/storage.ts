import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createSeedData, SCHEMA_VERSION } from '../data/seed';
import { AppData } from '../types/domain';
import { RemoteSession } from './api';

const DATA_KEY = '@cemfit/data/v1';
const SESSION_KEY = '@cemfit/session/v1';

export const normalizeData = (data: AppData): AppData => ({
  ...data,
  appointments: Array.isArray(data.appointments)
    ? data.appointments.map((appointment) => ({ ...appointment, mode: appointment.mode === 'online' ? 'online' : 'in_person' }))
    : [],
  appointmentBlocks: Array.isArray(data.appointmentBlocks) ? data.appointmentBlocks : [],
  mealEntries: Array.isArray(data.mealEntries) ? data.mealEntries : [],
});

export const loadData = async (): Promise<AppData> => {
  const stored = await AsyncStorage.getItem(DATA_KEY);
  if (!stored) {
    const seed = await createSeedData();
    await saveData(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(stored) as AppData;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      const seed = await createSeedData();
      await saveData(seed);
      return seed;
    }
    return normalizeData(parsed);
  } catch {
    const seed = await createSeedData();
    await saveData(seed);
    return seed;
  }
};

export const saveData = (data: AppData) => AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));

export const loadSession = async (): Promise<RemoteSession | null> => {
  const stored = Platform.OS === 'web' ? await AsyncStorage.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as RemoteSession;
    return parsed.token && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
};

export const saveSession = async (session: RemoteSession | null) => {
  const value = session ? JSON.stringify(session) : null;
  if (Platform.OS === 'web') {
    if (value) await AsyncStorage.setItem(SESSION_KEY, value);
    else await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  if (value) await SecureStore.setItemAsync(SESSION_KEY, value);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
};

export const resetStoredData = async () => {
  const seed = await createSeedData();
  await saveData(seed);
  await saveSession(null);
  return seed;
};
