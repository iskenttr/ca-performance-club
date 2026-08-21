import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  AppleHealthSnapshot,
  configureAppleHealthBackgroundUpdates,
  emptyAppleHealthSnapshot,
  isAppleHealthAvailable,
  readAppleHealthSnapshot,
  requestAppleHealthAccess,
  subscribeToAppleHealthChanges,
} from '../services/appleHealth';

const CONNECTION_KEY = 'cemfit.apple-health.connected';
export type AppleHealthStatus = 'checking' | 'available' | 'connecting' | 'connected' | 'unavailable' | 'error';

export const useAppleHealth = () => {
  const [status, setStatus] = useState<AppleHealthStatus>('checking');
  const [snapshot, setSnapshot] = useState<AppleHealthSnapshot>(emptyAppleHealthSnapshot());

  const refresh = useCallback(async () => {
    try {
      const next = await readAppleHealthSnapshot();
      setSnapshot(next);
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const available = await isAppleHealthAvailable();
      if (!available) {
        setStatus('unavailable');
        return;
      }
      const wasConnected = await AsyncStorage.getItem(CONNECTION_KEY);
      if (wasConnected === 'true') {
        await configureAppleHealthBackgroundUpdates();
        await refresh();
      }
      else setStatus('available');
    };
    bootstrap().catch(() => setStatus('error'));
  }, [refresh]);

  useEffect(() => {
    if (status !== 'connected') return undefined;
    const unsubscribeHealth = subscribeToAppleHealthChanges(() => void refresh());
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    const interval = setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => {
      unsubscribeHealth();
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [refresh, status]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    try {
      const requested = await requestAppleHealthAccess();
      if (!requested) {
        setStatus('available');
        return false;
      }
      await AsyncStorage.setItem(CONNECTION_KEY, 'true');
      await configureAppleHealthBackgroundUpdates();
      await refresh();
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, [refresh]);

  return { status, snapshot, connect, refresh };
};
