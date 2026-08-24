/**
 * Session cookie.
 *
 * One shared password (DESK_PASSWORD). On a correct password we hand out a
 * signed, HTTP-only cookie containing nothing but an expiry timestamp and an
 * HMAC over it. There are no user accounts, so there is nothing else to store.
 *
 * Signing uses the Web Crypto API (not node:crypto) so the exact same code runs
 * both in the proxy/middleware layer and in server actions.
 */

export const SESSION_COOKIE = 'jvv_desk_session';

/** How long a login lasts. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Secret used to sign the cookie. SESSION_SECRET if set, otherwise the desk
 * password itself (so the app works with only DATABASE_URL + DESK_PASSWORD).
 * Changing either value invalidates every existing session, which is fine.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.DESK_PASSWORD;
  if (!secret) {
    throw new Error('Falta la variable de entorno DESK_PASSWORD (o SESSION_SECRET).');
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(signature);
}

/** Compare two strings without leaking where they diverge. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Token format: "<expiryMillis>.<hmac>". */
export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const expiresAt = String(now + SESSION_TTL_MS);
  return `${expiresAt}.${await sign(expiresAt, secret)}`;
}

export async function isValidSessionToken(
  token: string | undefined | null,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;

  const expiresAt = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) < now) return false;

  return timingSafeEqual(signature, await sign(expiresAt, secret));
}

/** Checks a submitted password against DESK_PASSWORD, in constant time. */
export function isCorrectPassword(submitted: string): boolean {
  const expected = process.env.DESK_PASSWORD;
  if (!expected) {
    throw new Error('Falta la variable de entorno DESK_PASSWORD.');
  }
  return timingSafeEqual(submitted, expected);
}
