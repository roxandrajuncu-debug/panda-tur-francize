// /api/ocr — doar pentru echipă. POST {data (base64), mediaType}: Claude citește cartea de vizită.
// Originalul se salvează în Supabase Storage doar dacă e chiar o carte de vizită; altfel nu se salvează nimic.
// DELETE ?path= — șterge originalul dacă utilizatorul a anulat ecranul de verificare.
import { isAuthed } from '../lib/auth.js';
import { send, readBody, queryParam, newId, handleError } from '../lib/http.js';
import { readBusinessCard } from '../lib/claude.js';
import { uploadFile, removeFile } from '../lib/store.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  try {
    if (req.method === 'DELETE') {
      const path = queryParam(req, 'path') || '';
      if (/^cards\/[\w-]+\.(jpg|png|webp|pdf)$/.test(path)) await removeFile('documents', path);
      return send(res, 200, { ok: true });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă' });

    const body = await readBody(req, 4_400_000);
    const mediaType = String(body.mediaType || '');
    const base64 = String(body.data || '').replace(/^data:[^,]+,/, '');
    if (!TYPES[mediaType]) return send(res, 415, { error: 'Încarcă o fotografie (JPG, PNG, WEBP) sau un PDF.' });
    const buf = Buffer.from(base64, 'base64');
    if (buf.length < 1000) return send(res, 400, { error: 'Fișierul e gol sau deteriorat.' });
    if (mediaType === 'application/pdf' && buf.subarray(0, 5).toString() !== '%PDF-') {
      return send(res, 400, { error: 'Fișierul nu este un PDF valid.' });
    }

    const card = await readBusinessCard({ base64, mediaType });
    if (!card.is_business_card) {
      return send(res, 422, {
        error: 'Aceasta nu pare a fi o carte de vizită, așa că nu s-a salvat nimic.' + (card.reason ? ' Pe imagine: ' + card.reason : '') + ' Fotografiază cartea de vizită de aproape, pe o suprafață plană.',
        notCard: true,
      });
    }

    const docPath = `cards/${newId()}.${TYPES[mediaType]}`;
    await uploadFile('documents', docPath, buf, mediaType);
    send(res, 200, { card, docPath, docType: mediaType });
  } catch (err) {
    handleError(res, err);
  }
}
