// /api/telegram ‚Äî doar pentru echipƒÉ. GET: starea botului »ôi chat-urile care i-au scris. POST: mesaj de test.
import { isAuthed } from '../lib/auth.js';
import { send, handleError, queryParam } from '../lib/http.js';
import { tg, telegramReady } from '../lib/telegram.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesarƒÉ' });
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
    if (req.method === 'POST' && queryParam(req, 'action') === 'menu') {
      // Butonul de meniu al botului deschide Mini App (acela»ôi efect ca @BotFather ‚Üí Bot Settings ‚Üí Menu Button).
      if (!hasToken) return send(res, 400, { error: 'Lipse»ôte TELEGRAM_BOT_TOKEN √Ăn Vercel.' });
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const url = `https://${host}/tg`;
      await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Franciza', web_app: { url } } });
      await tg('setMyDescription', { description: 'Panda Tur Moldova ¬∑ franciza agen»õiei de turism. ApasƒÉ ‚ÄûFranciza‚Äù jos, alege pachetul »ôi lasƒÉ o cerere.' }).catch(() => {});
      return send(res, 200, { ok: true, url });
    }
    if (req.method === 'POST') {
      if (!telegramReady()) return send(res, 400, { error: 'Lipse»ôte TELEGRAM_BOT_TOKEN sau TELEGRAM_CHAT_ID √Ăn Vercel.' });
      await tg('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: '‚úÖ Test: notificƒÉrile pentru cererile de francizƒÉ func»õioneazƒÉ.' });
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: 'MetodƒÉ nepermisƒÉ' });
  } catch (err) {
    handleError(res, err);
  }
}
