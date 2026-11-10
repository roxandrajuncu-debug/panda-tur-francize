// Login simplu cu o parolă comună a echipei și cookie semnat HMAC.
import crypto from 'node:crypto';

const COOKIE = 'pt_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 zile

function secret() {
  return process.env.SESSION_SECRET || (process.env.VERCEL ? null : 'dev-secret-local');
}
export function adminPassword() {
  return process.env.ADMIN_PASSWORD || (process.env.VERCEL ? null : 'panda');
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function checkPassword(pw) {
  const expected = adminPassword();
  return Boolean(expected && secret() && safeEqual(pw || '', expected));
}

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const secure = process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function isAuthed(req) {
  if (!secret()) return false;
  const raw = req.headers.cookie || '';
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!m) return false;
  const [exp, sig] = m.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}
