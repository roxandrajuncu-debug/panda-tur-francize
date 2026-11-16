// /api/telegram — doar pentru echipă. GET: starea botului și chat-urile care i-au scris. POST: mesaj de test.
import { isAuthed } from '../lib/auth.js';
import { send, handleError } from '../lib/http.js';
import { tg, telegramReady } from '../lib/telegram.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const hasChat = Boolean(process.env.TELEGRAM_CHAT_ID);
  try {
    if (req.method === 'GET') {
      let bot = null, chats = [], error = '';
      if (hasToken) {
        try {
          bot = (await tg('getMe')).username;
          const updates = await tg('getUpdates', { limit: 50 });
          const seen = new Map();
          for (const u of updates) {
            const c = (u.message || u.channel_post || u.my_chat_member || {}).chat;
            if (c) seen.set(c.id, { id: c.id, name: c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || '' });
          }
          chats = [...seen.values()];
        } catch (e) { error = e.message; }
      }
      return send(res, 200, { hasToken, hasChat, ready: telegramReady(), bot, chats, error });
    }
    if (req.method === 'POST') {
      if (!telegramReady()) return send(res, 400, { error: 'Lipsește TELEGRAM_BOT_TOKEN sau TELEGRAM_CHAT_ID în Vercel.' });
      await tg('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: '✅ Test: notificările pentru cererile de franciză funcționează.' });
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: 'Metodă nepermisă' });
  } catch (err) {
    handleError(res, err);
  }
}
