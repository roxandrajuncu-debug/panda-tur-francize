// /api/generate — imagini AI pentru postări și oferte de franciză. Doar pentru echipă.
// GET: istoria generărilor + câte au rămas azi. POST {prompt, style}: generează pe server, salvează, întoarce rezultatul.
import { isAuthed } from '../lib/auth.js';
import { send, readBody, newId, handleError } from '../lib/http.js';
import { generateImage, startOfDayChisinau } from '../lib/imagegen.js';
import { toImagePrompt } from '../lib/claude.js';
import { countGenerationsSince, listGenerations, insertGeneration, updateGeneration, uploadFile, signedUrls } from '../lib/store.js';

const LIMIT = Math.max(1, Number(process.env.GEN_DAILY_LIMIT) || 5);
const USER = 'echipa'; // panoul are un singur cont comun al echipei
const STYLES = {
  post: 'bright, inviting social media photo for a travel agency franchise, vivid colors',
  office: 'modern travel agency office interior, warm light, professional photography',
  travel: 'cinematic travel destination photography, golden hour, high detail',
  kp: 'clean corporate illustration for a business proposal, soft gradients, minimal',
};

async function history() {
  const items = await listGenerations(USER, 30);
  const urls = await signedUrls('generated', items.map((g) => g.path));
  return items.map((g) => ({ id: g.id, createdAt: g.createdAt, prompt: g.prompt, style: g.style, url: urls[g.path] || '' }));
}

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Autentificare necesară' });
  try {
    const since = startOfDayChisinau().toISOString();

    if (req.method === 'GET') {
      const used = await countGenerationsSince(USER, since);
      return send(res, 200, { limit: LIMIT, used, items: await history() });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă' });

    const body = await readBody(req);
    const prompt = String(body.prompt || '').trim().slice(0, 800);
    const style = STYLES[body.style] ? body.style : 'post';
    if (prompt.length < 5) return send(res, 400, { error: 'Descrie imaginea în câteva cuvinte.' });

    const used = await countGenerationsSince(USER, since);
    if (used >= LIMIT) {
      return send(res, 429, { error: `Ați atins limita de ${LIMIT} imagini pe zi. Limita se reînnoiește la miezul nopții (ora Chișinăului).`, limit: LIMIT, used });
    }

    // Rezervăm locul în limită înainte de generare, ca două clickuri simultane să nu treacă de limită.
    const id = newId();
    await insertGeneration({ id, userKey: USER, prompt, style });
    try {
      let promptEn = '';
      try { promptEn = await toImagePrompt(prompt, STYLES[style]); } catch (e) { console.warn('Traducerea promptului a eșuat:', e.message); }
      const finalPrompt = `${promptEn || prompt}. Style: ${STYLES[style]}. No text, no watermark.`;
      const jpg = await generateImage(finalPrompt);
      const path = `${id}.jpg`;
      await uploadFile('generated', path, jpg, 'image/jpeg');
      await updateGeneration(id, { status: 'done', path, promptEn: finalPrompt });
    } catch (err) {
      await updateGeneration(id, { status: 'error' }).catch(() => {});
      throw err;
    }
    send(res, 201, { limit: LIMIT, used: used + 1, items: await history() });
  } catch (err) {
    handleError(res, err);
  }
}
