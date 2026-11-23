// Verificarea datelor din Telegram Mini App (initData) pe server, după algoritmul oficial:
// secret = HMAC_SHA256("WebAppData", bot_token); hash = HMAC_SHA256(secret, data_check_string).
// Browserul nu poate falsifica utilizatorul fără tokenul botului, care stă doar în Vercel.
import crypto from 'node:crypto';

const MAX_AGE = 24 * 60 * 60; // initData mai vechi de 24 h nu se acceptă

export function verifyInitData(initData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData || typeof initData !== 'string' || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const calc = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hash, 'hex'))) return null;
  const authDate = Number(params.get('auth_date')) || 0;
  if (Date.now() / 1000 - authDate > MAX_AGE) return null;
  let user;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { return null; }
  if (!user || !Number.isSafeInteger(user.id)) return null;
  return {
    id: user.id,
    firstName: String(user.first_name || '').slice(0, 60),
    lastName: String(user.last_name || '').slice(0, 60),
    username: String(user.username || '').slice(0, 60),
  };
}
