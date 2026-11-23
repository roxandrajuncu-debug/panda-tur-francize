// Apeluri la Claude API. Cheia ANTHROPIC_API_KEY stƒÉ doar √Ăn Vercel ‚Üí Environment Variables.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
let client;
function claude() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('Lipse»ôte ANTHROPIC_API_KEY √Ăn Vercel ‚Üí Settings ‚Üí Environment Variables.');
    e.status = 500;
    throw e;
  }
  client ||= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return client;
}

// Cerere cu rƒÉspuns JSON strict dupƒÉ schemƒÉ. DacƒÉ modelul refuzƒÉ, serverul Anthropic √ĂncearcƒÉ alt model (fallbacks).
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
  if (response.stop_reason === 'max_tokens') throw new Error('RƒÉspunsul lui Claude a fost tƒÉiat. √éncearcƒÉ din nou.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

const CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_business_card', 'reason', 'name', 'company', 'position', 'phones', 'email', 'website', 'address', 'city', 'other'],
  properties: {
    is_business_card: { type: 'boolean', description: 'true doar dacƒÉ imaginea/PDF-ul este o carte de vizitƒÉ (sau o fotografie a ei) cu date de contact lizibile' },
    reason: { type: 'string', description: 'dacƒÉ nu e carte de vizitƒÉ: ce se vede de fapt, scurt, √Ăn rom√¢nƒÉ' },
    name: { type: 'string', description: 'numele »ôi prenumele persoanei, exact ca pe carte' },
    company: { type: 'string' },
    position: { type: 'string' },
    phones: { type: 'array', items: { type: 'string' }, description: 'toate numerele, √Ăn format interna»õional dacƒÉ se poate (ex. +373 69 123 456)' },
    email: { type: 'string' },
    website: { type: 'string' },
    address: { type: 'string' },
    city: { type: 'string', description: 'ora»ôul / localitatea, dacƒÉ se vede √Ăn adresƒÉ' },
    other: { type: 'string', description: 'alte date utile de pe carte (re»õele sociale, note scrise de m√¢nƒÉ)' },
  },
};

const SYSTEM_CARD = `E»ôti modulul OCR al CRM-ului de francize Panda Tur Moldova.
Prime»ôti o fotografie sau un PDF. VerificƒÉ √Ănt√¢i dacƒÉ este o carte de vizitƒÉ cu date de contact.
DacƒÉ nu este (selfie, peisaj, chitan»õƒÉ, ecran gol, document de alt tip, imagine ilizibilƒÉ), pune is_business_card=false, explicƒÉ pe scurt √Ăn "reason" »ôi lasƒÉ celelalte c√¢mpuri goale.
DacƒÉ este, copiazƒÉ datele exact cum sunt scrise (cu diacritice, fƒÉrƒÉ sƒÉ inventezi nimic). C√¢mpurile care lipsesc rƒÉm√¢n "" sau [].`;

export async function readBusinessCard({ base64, mediaType }) {
  const block =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
  return askJson({
    system: SYSTEM_CARD,
    schema: CARD_SCHEMA,
    content: [block, { type: 'text', text: 'Extrage datele de pe aceastƒÉ carte de vizitƒÉ.' }],
  });
}

// Traduce descrierea (rom√¢nƒÉ/rusƒÉ) √Ăntr-un prompt englezesc pentru modelul de imagini. Imaginea o face FLUX, nu Claude.
export async function toImagePrompt(text, style) {
  const r = await askJson({
    system: 'Rewrite the user request as one concise English prompt for a text-to-image model (FLUX). Describe subject, setting, light and composition. No text, letters or logos in the image. Max 70 words.',
    schema: { type: 'object', additionalProperties: false, required: ['prompt'], properties: { prompt: { type: 'string' } } },
    content: [{ type: 'text', text: `Style: ${style}\nRequest: ${text}` }],
    maxTokens: 600,
  });
  return String(r.prompt || '').slice(0, 1500);
}
