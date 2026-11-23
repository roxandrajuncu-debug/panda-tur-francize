// /api/tg-app ‚Äî backend-ul pentru Telegram Mini App (pagina /tg).
// Utilizatorul se identificƒÉ DOAR din initData verificat pe server (antetul X-Telegram-Init-Data).
// FƒÉrƒÉ initData valid (ex. pagina deschisƒÉ √Ăn browser obi»ônuit) nu se √Ăntoarce nimic personal.
import { send, readBody, newId, handleError } from '../lib/http.js';
import { verifyInitData } from '../lib/tgauth.js';
import { cleanLead, withHistory } from '../lib/lead.js';
import { saveLead, listLeadsByTelegram } from '../lib/store.js';
import { notifyNewLead, tg } from '../lib/telegram.js';
import { PACKAGE_LIST, PACKAGE_TITLE } from '../lib/packages.js';

const STAGE_LABEL = { nou: 'PrimitƒÉ', apel: 'Te sunƒÉm', intalnire: '√ént√¢lnire programatƒÉ', contract: 'Contract √Ăn pregƒÉtire', achitat: 'FrancizƒÉ achitatƒÉ', respins: '√énchisƒÉ' };

async function botUsername() {
  try { return (await tg('getMe')).username; } catch { return ''; }
}

export default async function handler(req, res) {
  try {
    const user = verifyInitData(req.headers['x-telegram-init-data']);
    if (!user) {
      return send(res, 401, { error: 'Deschide aplica»õia din Telegram.', bot: req.method === 'GET' ? await botUsername() : '' });
    }
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Utilizator Telegram';

    if (req.method === 'GET') {
      const mine = await listLeadsByTelegram(user.id);
      return send(res, 200, {
        user: { firstName: user.firstName || fullName, name: fullName },
        packages: PACKAGE_LIST,
        myLeads: mine.map((l) => ({ createdAt: l.createdAt, package: PACKAGE_TITLE[l.package] || '', status: STAGE_LABEL[l.stage] || '' })),
      });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const mine = await listLeadsByTelegram(user.id);
      const today = mine.filter((l) => Date.now() - new Date(l.createdAt) < 86400_000);
      if (today.length >= 3) return send(res, 429, { error: 'Ai trimis deja 3 cereri azi. Te contactƒÉm √Ăn cur√¢nd.' });

      const { lead, missing } = cleanLead({
        name: fullName, // numele vine din Telegram (verificat), nu din formular
        phone: body.phone,
        city: body.city,
        package: body.package,
        comment: [body.comment, user.username ? `Telegram: @${user.username}` : `Telegram ID: ${user.id}`].filter(Boolean).join('\n'),
        source: 'telegram',
        stage: 'nou',
      });
      if (!lead.package) missing.push('pachet');
      if (missing.length) return send(res, 400, { error: 'CompleteazƒÉ: ' + missing.join(', ') });

      const now = new Date().toISOString();
      const saved = await saveLead({ ...lead, docPath: '', docType: '', tgUserId: user.id, id: newId(), createdAt: now, updatedAt: now, history: withHistory(null, 'nou', now) });
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      await notifyNewLead(saved, host ? `https://${host}/admin` : '');
      return send(res, 201, { ok: true, name: fullName });
    }
    send(res, 405, { error: 'MetodƒÉ nepermisƒÉ' });
  } catch (err) {
    handleError(res, err);
  }
}
