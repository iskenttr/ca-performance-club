import * as Crypto from 'expo-crypto';
import { Credential } from '../types/domain';

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase('tr-TR');

const digest = (password: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

export const createCredential = async (
  userId: string,
  email: string,
  password: string,
  fixedSalt?: string,
): Promise<Credential> => {
  const salt = fixedSalt ?? Crypto.randomUUID();
  return {
    userId,
    email: normalizeEmail(email),
    salt,
    passwordHash: await digest(password, salt),
  };
};

export const verifyCredential = async (credential: Credential, password: string) =>
  credential.passwordHash === (await digest(password, credential.salt));

export { normalizeEmail };

