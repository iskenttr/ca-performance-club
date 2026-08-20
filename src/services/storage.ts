import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createSeedData, SCHEMA_VERSION } from '../data/seed';
import { AppData } from '../types/domain';

const DATA_KEY = '@cemfit/data/v1';
const SESSION_KEY = '@cemfit/session/v1';

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
    return parsed;
  } catch {
    const seed = await createSeedData();
    await saveData(seed);
    return seed;
  }
};

export const saveData = (data: AppData) => AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));

export const loadSession = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem(SESSION_KEY);
  return SecureStore.getItemAsync(SESSION_KEY);
};

export const saveSession = async (userId: string | null) => {
  if (Platform.OS === 'web') {
    if (userId) await AsyncStorage.setItem(SESSION_KEY, userId);
    else await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  if (userId) await SecureStore.setItemAsync(SESSION_KEY, userId);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
};

export const resetStoredData = async () => {
  const seed = await createSeedData();
  await saveData(seed);
  await saveSession(null);
  return seed;
};

