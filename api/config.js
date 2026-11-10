// /api/config — prioritățile orașelor folosite la scor. Doar pentru echipă.
import { isAuthed } from '../lib/auth.js';
import { send, readBody, handleError } from '../lib/http.js';
import { getConfig, setConfig } from '../lib/store.js';

export const DEFAULT_CITIES = {
  high: ['Chișinău', 'Bălți'],
  med: ['Orhei', 'Ungheni', 'Cahul', 'Comrat', 'Soroca', 'Edineț', 'Hîncești', 'Strășeni', 'Ialoveni', 'Florești', 'Drochia', 'Căușeni', 'Anenii Noi', 'Criuleni'],
};

const cleanList = (v) =>
  (Array.isArray(v) ? v : []).map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 200);

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  try {
    if (req.method === 'GET') {
      return send(res, 200, { cities: (await getConfig()) || DEFAULT_CITIES });
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const cities = await setConfig({ high: cleanList(body.high), med: cleanList(body.med) });
      return send(res, 200, { cities });
    }
    send(res, 405, { error: 'Metodă nepermisă' });
  } catch (err) {
    handleError(res, err);
  }
}
