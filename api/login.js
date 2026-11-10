// /api/login — POST {password} setează sesiunea; DELETE o închide; GET spune dacă ești logat.
import { checkPassword, sessionCookie, clearCookie, isAuthed, adminPassword } from '../lib/auth.js';
import { send, readBody } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { authed: isAuthed(req) });
  if (req.method === 'DELETE') return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă' });

  if (!adminPassword() || !(process.env.SESSION_SECRET || !process.env.VERCEL)) {
    return send(res, 500, { error: 'Setează ADMIN_PASSWORD și SESSION_SECRET în Vercel → Settings → Environment Variables.' });
  }
  const { password } = await readBody(req);
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'Parolă greșită' });
  }
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie() });
}
