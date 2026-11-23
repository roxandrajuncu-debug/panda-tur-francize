// Generarea imaginilor: FLUX.1 [schnell] prin Cloudflare Workers AI (plan gratuit, fără card atașat).
// Cererea pleacă de pe serverul Vercel; CLOUDFLARE_API_TOKEN nu ajunge niciodată în browser.
const MODEL = '@cf/black-forest-labs/flux-1-schnell';

export function imagegenReady() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

export async function generateImage(prompt) {
  if (!imagegenReady()) {
    const e = new Error('Lipsește CLOUDFLARE_ACCOUNT_ID sau CLOUDFLARE_API_TOKEN în Vercel → Environment Variables.');
    e.status = 500;
    throw e;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 8 }),
      signal: ctrl.signal,
    });
    const d = await r.json().catch(() => ({}));
    const b64 = d?.result?.image;
    if (!r.ok || !b64) {
      const msg = d?.errors?.[0]?.message || r.status;
      throw new Error('Modelul de imagini nu a răspuns: ' + msg);
    }
    return Buffer.from(b64, 'base64'); // JPEG 1024×1024
  } finally {
    clearTimeout(timer);
  }
}

// Începutul zilei curente la Chișinău (pentru limita „N imagini pe zi”).
export function startOfDayChisinau(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((x) => [x.type, x.value]),
  );
  const localAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offset = Math.round((localAsUtc - now.getTime()) / 60000) * 60000;
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day) - offset);
}
