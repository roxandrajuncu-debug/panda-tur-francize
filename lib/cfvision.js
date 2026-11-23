// Varianta gratuită de OCR: Llama 4 Scout (model cu vedere) prin Cloudflare Workers AI.
// Se folosește doar dacă lipsește ANTHROPIC_API_KEY. Același răspuns ca la Claude (lib/claude.js).
const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

const PROMPT = `You are the OCR module of a franchise CRM (Panda Tur Moldova).
Look at the image. First decide if it is a business card (or a photo of one) with readable contact details.
Reply with ONE JSON object only, no other text:
{"is_business_card": true|false, "reason": "", "name": "", "company": "", "position": "", "phones": [], "email": "", "website": "", "address": "", "city": "", "other": ""}
If it is NOT a business card (selfie, landscape, receipt, empty screen, other document, unreadable): is_business_card=false, "reason" = what the image shows, in Romanian, short; other fields empty.
If it IS: copy the data exactly as written (keep diacritics, do not invent anything). Phones in international format if possible. Missing fields stay "" or [].`;

function parseJson(out) {
  if (out && typeof out === 'object') return out;
  const m = String(out || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Modelul nu a întors date. Încearcă din nou.');
  return JSON.parse(m[0]);
}

export async function readBusinessCardFree({ base64, mediaType }) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    const e = new Error('Lipsește ANTHROPIC_API_KEY (sau CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN) în Vercel.');
    e.status = 500;
    throw e;
  }
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        ],
      }],
      max_tokens: 800,
      temperature: 0,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.success) throw new Error('Modelul de recunoaștere nu a răspuns: ' + (d?.errors?.[0]?.message || r.status));
  const c = parseJson(d.result?.response);
  return {
    is_business_card: c.is_business_card === true,
    reason: String(c.reason || ''),
    name: String(c.name || ''),
    company: String(c.company || ''),
    position: String(c.position || ''),
    phones: Array.isArray(c.phones) ? c.phones.map(String) : c.phones ? [String(c.phones)] : [],
    email: String(c.email || ''),
    website: String(c.website || ''),
    address: String(c.address || ''),
    city: String(c.city || ''),
    other: String(c.other || ''),
  };
}
