// Shared-password auth. The session cookie is an HMAC of the password,
// so changing FAMILY_PASSWORD logs everyone out automatically.
const COOKIE = 'grillsmas_session';
const enc = new TextEncoder();

export function normalizePassword(pw) {
  return (pw ?? '').toString().trim().toLowerCase();
}

export async function sessionToken(password) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(normalizePassword(password)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('grillsmas-elf-pass-v1'));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function readCookie(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === COOKIE) return part.slice(i + 1);
  }
  return null;
}

export async function isAuthed(request, password) {
  const token = readCookie(request);
  return !!token && safeEqual(token, await sessionToken(password));
}

export function sessionCookie(token, maxAgeSeconds) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
