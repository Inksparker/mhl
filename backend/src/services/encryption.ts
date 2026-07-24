import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

function getMasterKey(): Buffer {
  const hexKey = config.encryption.key;
  if (!hexKey || hexKey.length < 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Derive a data-specific key from the master key + a salt.
 * This ensures different data items get different encryption keys.
 */
export function deriveKey(salt: Buffer): Buffer {
  const masterKey = getMasterKey();
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data using AES-256-GCM.
 * Returns: iv + authTag + ciphertext (all concatenated)
 */
export function encrypt(plaintext: Buffer, salt?: Buffer): { encrypted: Buffer; salt: Buffer } {
  const usedSalt = salt || crypto.randomBytes(32);
  const key = deriveKey(usedSalt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: salt(32) + iv(16) + authTag(16) + ciphertext
  const result = Buffer.concat([usedSalt, iv, authTag, encrypted]);

  return { encrypted: result, salt: usedSalt };
}

/**
 * Decrypt data encrypted with encrypt().
 * Expects: salt(32) + iv(16) + authTag(16) + ciphertext
 */
export function decrypt(data: Buffer): Buffer {
  const salt = data.subarray(0, 32);
  const iv = data.subarray(32, 32 + IV_LENGTH);
  const authTag = data.subarray(32 + IV_LENGTH, 32 + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(32 + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypt a string. Returns base64-encoded encrypted data.
 */
export function encryptString(plaintext: string): string {
  const { encrypted } = encrypt(Buffer.from(plaintext, 'utf-8'));
  return encrypted.toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string.
 */
export function decryptString(encryptedBase64: string): string {
  const data = Buffer.from(encryptedBase64, 'base64');
  return decrypt(data).toString('utf-8');
}

/**
 * Encrypt JSON-serializable data.
 */
export function encryptJson(obj: unknown): string {
  return encryptString(JSON.stringify(obj));
}

/**
 * Decrypt JSON-encrypted data.
 */
export function decryptJson<T = unknown>(encryptedBase64: string): T {
  return JSON.parse(decryptString(encryptedBase64));
}

/**
 * Generate a new random encryption key (useful for per-org keys).
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Stream encryption for large files.
 */
export function createEncryptStream(salt?: Buffer): { stream: crypto.CipherGCM; salt: Buffer } {
  const usedSalt = salt || crypto.randomBytes(32);
  const key = deriveKey(usedSalt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  return { stream: cipher, salt: usedSalt };
}

/**
 * Stream decryption for large files.
 */
export function createDecryptStream(salt: Buffer, iv: Buffer, authTag: Buffer): crypto.DecipherGCM {
  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher;
}
