// /api/doc?id=<cerere> ‚Äî deschide originalul documentului (cartea de vizitƒÉ) printr-un link temporar. Doar pentru echipƒÉ.
import { isAuthed } from '../lib/auth.js';
import { send, queryParam, handleError } from '../lib/http.js';
import { getLead, signedUrl } from '../lib/store.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesarƒÉ' });
  try {
    const lead = await getLead(queryParam(req, 'id') || '');
    if (!lead?.docPath) return send(res, 404, { error: 'Cererea nu are document ata»ôat' });
    const url = await signedUrl('documents', lead.docPath, 600);
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  } catch (err) {
    handleError(res, err);
  }
}
