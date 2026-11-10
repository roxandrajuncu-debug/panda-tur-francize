// /api/leads — lista, adăugare, editare (?id=), ștergere (?id=). Doar pentru echipă.
import { isAuthed } from '../lib/auth.js';
import { send, readBody, queryParam, newId, handleError } from '../lib/http.js';
import { cleanLead } from '../lib/lead.js';
import { listLeads, getLead, saveLead, deleteLead } from '../lib/store.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  try {
    const id = queryParam(req, 'id');

    if (req.method === 'GET') {
      return send(res, 200, { leads: await listLeads() });
    }

    if (req.method === 'POST') {
      const { lead, missing } = cleanLead(await readBody(req));
      if (missing.length) return send(res, 400, { error: 'Completează: ' + missing.join(', ') });
      const now = new Date().toISOString();
      const saved = await saveLead({ ...lead, id: newId(), createdAt: now, updatedAt: now });
      return send(res, 201, { lead: saved });
    }

    if (req.method === 'PUT') {
      if (!id) return send(res, 400, { error: 'Lipsește id' });
      const old = await getLead(id);
      if (!old) return send(res, 404, { error: 'Cererea nu există' });
      const body = await readBody(req);
      const { lead, missing } = cleanLead({ ...old, ...body }, { requireAll: false });
      if (missing.length) return send(res, 400, { error: 'Completează: ' + missing.join(', ') });
      const saved = await saveLead({ ...lead, id, createdAt: old.createdAt, updatedAt: new Date().toISOString() });
      return send(res, 200, { lead: saved });
    }

    if (req.method === 'DELETE') {
      if (!id) return send(res, 400, { error: 'Lipsește id' });
      await deleteLead(id);
      return send(res, 200, { ok: true });
    }

    send(res, 405, { error: 'Metodă nepermisă' }, { Allow: 'GET, POST, PUT, DELETE' });
  } catch (err) {
    handleError(res, err);
  }
}
