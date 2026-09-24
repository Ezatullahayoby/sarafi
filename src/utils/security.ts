/**
 * Security & Cryptography Utilities
 * Pure TypeScript implementation of SHA-256 & Salted Password Hashing
 * No external dependencies required.
 */

// Standard SHA-256 Implementation (FIPS 180-4)
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0; // Used as a counter across the whole file
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
  let hash: number[] = [];
  // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: { [n: number]: boolean } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80'; // Append '1' bit (plus zero padding)
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00'; // More zero padding
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check: only supports 8-bit
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  // process each chunk
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16)); // The message is expanded into 64 words
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      // Expand the message into 64 words
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      // Iterate
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + // S1
        ((e & hash[5]) ^ (~e & hash[6])) + // ch
        k[i] +
        // Expand the message schedule if needed
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + // s0
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | // s1
              0);
      // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadably slow
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + // S0
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

// Convert UTF-8 to escaped ASCII safe string for hashing
function toUtf8Bytes(str: string): string {
  return unescape(encodeURIComponent(str));
}

/**
 * Generate cryptographically strong random salt
 */
export function generateSalt(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let salt = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomVals = new Uint8Array(length);
    crypto.getRandomValues(randomVals);
    for (let i = 0; i < length; i++) {
      salt += chars[randomVals[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return salt;
}

/**
 * Hash password with salt using SHA-256
 */
export function hashPassword(password: string, salt: string): string {
  const payload = `sarafi_secure_${salt}___${password}`;
  return sha256Sync(toUtf8Bytes(payload));
}

/**
 * Verify password against stored hash & salt
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  if (!password || !salt || !storedHash) return false;
  const computedHash = hashPassword(password, salt);
  return computedHash === storedHash;
}

// Pre-generated initial salt and hash for adminsaraf / admin2026@
export const DEFAULT_ADMIN_SALT = 'saraf_sec_salt_2026';
export const DEFAULT_ADMIN_HASH = hashPassword('admin2026@', DEFAULT_ADMIN_SALT);

/**
 * Brute force protection tracker
 */
const LOCKOUT_KEY = 'sarafi_auth_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

export class BruteForceGuard {
  private static getState(): LockoutState {
    try {
      const raw = localStorage.getItem(LOCKOUT_KEY);
      if (!raw) return { attempts: 0, lockedUntil: null };
      return JSON.parse(raw);
    } catch {
      return { attempts: 0, lockedUntil: null };
    }
  }

  private static saveState(state: LockoutState): void {
    try {
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  }

  static isLocked(): { locked: boolean; remainingSeconds: number } {
    const state = this.getState();
    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }
    // If lockout expired, reset
    if (state.lockedUntil && state.lockedUntil <= now) {
      this.reset();
    }
    return { locked: false, remainingSeconds: 0 };
  }

  static recordFailedAttempt(): { locked: boolean; attemptsLeft: number; remainingSeconds: number } {
    const state = this.getState();
    const now = Date.now();

    // If currently locked
    if (state.lockedUntil && state.lockedUntil > now) {
      return {
        locked: true,
        attemptsLeft: 0,
        remainingSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      };
    }

    state.attempts += 1;
    if (state.attempts >= MAX_ATTEMPTS) {
      state.lockedUntil = now + LOCKOUT_DURATION_MS;
      this.saveState(state);
      return {
        locked: true,
        attemptsLeft: 0,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }

    this.saveState(state);
    return {
      locked: false,
      attemptsLeft: MAX_ATTEMPTS - state.attempts,
      remainingSeconds: 0,
    };
  }

  static reset(): void {
    try {
      localStorage.removeItem(LOCKOUT_KEY);
    } catch (e) {
      console.error(e);
    }
  }
}
