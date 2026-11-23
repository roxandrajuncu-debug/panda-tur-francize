// /api/leads — lista, adăugare, editare (?id=), ștergere (?id=). Doar pentru echipă.
import { isAuthed } from '../lib/auth.js';
import { send, readBody, queryParam, newId, handleError } from '../lib/http.js';
import { cleanLead, withHistory } from '../lib/lead.js';
import { listLeads, getLead, saveLead, deleteLead, removeFile } from '../lib/store.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  try {
    const id = queryParam(req, 'id');

    if (req.method === 'GET') {
      return send(res, 200, { leads: await listLeads() });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      // Din panou: „Manual” (apel, întâlnire) sau „Vizitka” (scanare). Restul surselor vin doar din formulare.
      const source = ['manual', 'vizitka', 'facebook', 'instagram', 'telefon', 'email', 'altul'].includes(body.source) ? body.source : 'manual';
      const { lead, missing } = cleanLead({ ...body, source });
      if (missing.length) return send(res, 400, { error: 'Completează: ' + missing.join(', ') });
      if (lead.source !== 'vizitka') { lead.docPath = ''; lead.docType = ''; }
      const now = new Date().toISOString();
      const saved = await saveLead({ ...lead, id: newId(), createdAt: now, updatedAt: now, history: withHistory(null, lead.stage, now) });
      return send(res, 201, { lead: saved });
    }

    if (req.method === 'PUT') {
      if (!id) return send(res, 400, { error: 'Lipsește id' });
      const old = await getLead(id);
      if (!old) return send(res, 404, { error: 'Cererea nu există' });
      const body = await readBody(req);
      // Sursa, documentul și contul Telegram nu se schimbă la editare.
      const { lead, missing } = cleanLead({ ...old, ...body, source: old.source, docPath: old.docPath, docType: old.docType });
      if (missing.length) return send(res, 400, { error: 'Completează: ' + missing.join(', ') });
      const now = new Date().toISOString();
      const saved = await saveLead({
        ...lead, id, createdAt: old.createdAt, updatedAt: now, tgUserId: old.tgUserId,
        history: withHistory(old.history?.length ? old : { history: [{ stage: old.stage, at: old.createdAt }] }, lead.stage, now),
      });
      return send(res, 200, { lead: saved });
    }

    if (req.method === 'DELETE') {
      if (!id) return send(res, 400, { error: 'Lipsește id' });
      const old = await getLead(id);
      await deleteLead(id);
      if (old?.docPath) await removeFile('documents', old.docPath);
      return send(res, 200, { ok: true });
    }

    send(res, 405, { error: 'Metodă nepermisă' }, { Allow: 'GET, POST, PUT, DELETE' });
  } catch (err) {
    handleError(res, err);
  }
}
