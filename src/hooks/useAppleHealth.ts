import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  AppleHealthSnapshot,
  emptyAppleHealthSnapshot,
  isAppleHealthAvailable,
  readAppleHealthSnapshot,
  requestAppleHealthAccess,
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
      if (wasConnected === 'true') await refresh();
      else setStatus('available');
    };
    bootstrap().catch(() => setStatus('error'));
  }, [refresh]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    try {
      const requested = await requestAppleHealthAccess();
      if (!requested) {
        setStatus('available');
        return false;
      }
      await AsyncStorage.setItem(CONNECTION_KEY, 'true');
      await refresh();
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, [refresh]);

  return { status, snapshot, connect, refresh };
};
