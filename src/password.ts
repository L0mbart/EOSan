import { sha256 } from './sha256';

export function hashPassword(salt: string, password: string): string {
  return sha256(`${salt}:${password}`);
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
