// /api/apply ‚Äî formularul public completat de candida»õi. Cererea intrƒÉ ca ‚ÄûnouƒÉ‚Äù »ôi pleacƒÉ √Ăn Telegram.
import { send, readBody, newId, handleError } from '../lib/http.js';
import { cleanLead, withHistory } from '../lib/lead.js';
import { saveLead } from '../lib/store.js';
import { notifyNewLead } from '../lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'MetodƒÉ nepermisƒÉ' }, { Allow: 'POST' });
  try {
    const body = await readBody(req);

    // Protec»õie anti-spam: c√¢mp ascuns completat doar de robo»õi + timp minim de completare.
    if (body.website) return send(res, 200, { ok: true });
    const startedAt = Number(body.startedAt) || 0;
    if (startedAt && Date.now() - startedAt < 3000) return send(res, 200, { ok: true });

    if (!body.consent) return send(res, 400, { error: 'Este necesar acordul pentru prelucrarea datelor.' });

    const { lead, missing } = cleanLead(
      {
        ...body,
        comment: body.comment ?? body.message,
        source: ['facebook', 'instagram'].includes(body.source) ? body.source : 'site',
        stage: 'nou',
        notes: '',
      },
      { requireAll: true, requireComment: true },
    );
    if (missing.length) return send(res, 400, { error: 'CompleteazƒÉ: ' + missing.join(', ') });

    const now = new Date().toISOString();
    const saved = await saveLead({ ...lead, docPath: '', docType: '', id: newId(), createdAt: now, updatedAt: now, history: withHistory(null, 'nou', now) });

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    await notifyNewLead(saved, host ? `https://${host}/` : '');

    send(res, 201, { ok: true });
  } catch (err) {
    handleError(res, err);
  }
}
