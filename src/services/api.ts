import { AppData, RegisterInput } from '../types/domain';

export interface RemoteSession {
  token: string;
  userId: string;
}

interface AuthResult extends RemoteSession {
  data: AppData;
}

const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error ?? 'Sunucu işlemi tamamlanamadı.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
};

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const remoteSignIn = (email: string, password: string) =>
  request<AuthResult>('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const remoteRegister = (input: RegisterInput) =>
  request<AuthResult>('/api/register', { method: 'POST', body: JSON.stringify(input) });

export const migrateLegacyAccount = (data: AppData, email: string, password: string) =>
  request<AuthResult>('/api/migrate', { method: 'POST', body: JSON.stringify({ data, email, password }) });

export const fetchRemoteData = (token: string) =>
  request<AppData>('/api/state', { headers: authHeaders(token) });

export const saveRemoteData = (data: AppData, token: string) =>
  request<{ ok: true }>('/api/state', { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });

export const deleteRemoteAccount = (token: string) =>
  request<{ ok: true }>('/api/account', { method: 'DELETE', headers: authHeaders(token) });
