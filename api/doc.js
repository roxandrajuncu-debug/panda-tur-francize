// /api/doc?id=<cerere> — deschide originalul documentului (cartea de vizită) printr-un link temporar. Doar pentru echipă.
import { isAuthed } from '../lib/auth.js';
import { send, queryParam, handleError } from '../lib/http.js';
import { getLead, signedUrl } from '../lib/store.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  try {
    const lead = await getLead(queryParam(req, 'id') || '');
    if (!lead?.docPath) return send(res, 404, { error: 'Cererea nu are document atașat' });
    const url = await signedUrl('documents', lead.docPath, 600);
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  } catch (err) {
    handleError(res, err);
  }
}
