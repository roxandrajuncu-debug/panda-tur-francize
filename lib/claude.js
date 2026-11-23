// Apeluri la Claude API. Cheia ANTHROPIC_API_KEY stă doar în Vercel → Environment Variables.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
let client;
function claude() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('Lipsește ANTHROPIC_API_KEY în Vercel → Settings → Environment Variables.');
    e.status = 500;
    throw e;
  }
  client ||= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return client;
}

// Cerere cu răspuns JSON strict după schemă. Dacă modelul refuză, serverul Anthropic încearcă alt model (fallbacks).
async function askJson({ system, content, schema, maxTokens = 2000 }) {
  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') throw new Error('Claude a refuzat cererea.');
  if (response.stop_reason === 'max_tokens') throw new Error('Răspunsul lui Claude a fost tăiat. Încearcă din nou.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

const CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_business_card', 'reason', 'name', 'company', 'position', 'phones', 'email', 'website', 'address', 'city', 'other'],
  properties: {
    is_business_card: { type: 'boolean', description: 'true doar dacă imaginea/PDF-ul este o carte de vizită (sau o fotografie a ei) cu date de contact lizibile' },
    reason: { type: 'string', description: 'dacă nu e carte de vizită: ce se vede de fapt, scurt, în română' },
    name: { type: 'string', description: 'numele și prenumele persoanei, exact ca pe carte' },
    company: { type: 'string' },
    position: { type: 'string' },
    phones: { type: 'array', items: { type: 'string' }, description: 'toate numerele, în format internațional dacă se poate (ex. +373 69 123 456)' },
    email: { type: 'string' },
    website: { type: 'string' },
    address: { type: 'string' },
    city: { type: 'string', description: 'orașul / localitatea, dacă se vede în adresă' },
    other: { type: 'string', description: 'alte date utile de pe carte (rețele sociale, note scrise de mână)' },
  },
};

const SYSTEM_CARD = `Ești modulul OCR al CRM-ului de francize Panda Tur Moldova.
Primești o fotografie sau un PDF. Verifică întâi dacă este o carte de vizită cu date de contact.
Dacă nu este (selfie, peisaj, chitanță, ecran gol, document de alt tip, imagine ilizibilă), pune is_business_card=false, explică pe scurt în "reason" și lasă celelalte câmpuri goale.
Dacă este, copiază datele exact cum sunt scrise (cu diacritice, fără să inventezi nimic). Câmpurile care lipsesc rămân "" sau [].`;

export async function readBusinessCard({ base64, mediaType }) {
  const block =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
  return askJson({
    system: SYSTEM_CARD,
    schema: CARD_SCHEMA,
    content: [block, { type: 'text', text: 'Extrage datele de pe această carte de vizită.' }],
  });
}

// Traduce descrierea (română/rusă) într-un prompt englezesc pentru modelul de imagini. Imaginea o face FLUX, nu Claude.
export async function toImagePrompt(text, style) {
  const r = await askJson({
    system: 'Rewrite the user request as one concise English prompt for a text-to-image model (FLUX). Describe subject, setting, light and composition. No text, letters or logos in the image. Max 70 words.',
    schema: { type: 'object', additionalProperties: false, required: ['prompt'], properties: { prompt: { type: 'string' } } },
    content: [{ type: 'text', text: `Style: ${style}\nRequest: ${text}` }],
    maxTokens: 600,
  });
  return String(r.prompt || '').slice(0, 1500);
}
