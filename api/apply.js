// /api/apply — formularul public completat de candidați. Cererea intră în coloana „Nou”.
import { send, readBody, newId, handleError } from '../lib/http.js';
import { cleanLead, SOURCES } from '../lib/lead.js';
import { saveLead } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă' }, { Allow: 'POST' });
  try {
    const body = await readBody(req);

    // Protecție anti-spam: câmp ascuns completat doar de roboți + timp minim de completare.
    if (body.website) return send(res, 200, { ok: true });
    const startedAt = Number(body.startedAt) || 0;
    if (startedAt && Date.now() - startedAt < 3000) return send(res, 200, { ok: true });

    if (!body.consent) return send(res, 400, { error: 'Este necesar acordul pentru prelucrarea datelor.' });

    const { lead, missing } = cleanLead({
      ...body,
      source: SOURCES.includes(body.source) ? body.source : 'site',
      stage: 'nou',
      notes: body.message ? 'Mesaj candidat: ' + String(body.message).slice(0, 2000) : '',
    });
    if (missing.length) return send(res, 400, { error: 'Completează: ' + missing.join(', ') });

    const now = new Date().toISOString();
    await saveLead({ ...lead, id: newId(), createdAt: now, updatedAt: now });
    send(res, 201, { ok: true });
  } catch (err) {
    handleError(res, err);
  }
}
