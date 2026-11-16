// Stocare în Supabase (Postgres) prin API-ul REST. Cheia secretă stă doar în variabilele Vercel.
const BASE = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!BASE || !KEY) {
    throw new Error('Baza de date nu e conectată. În Vercel: Storage → Supabase → Connect, apoi Redeploy.');
  }
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (!KEY.startsWith('sb_')) headers.Authorization = 'Bearer ' + KEY; // cheile vechi (JWT) merg și ca Bearer
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${BASE}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch {}
    throw new Error('Supabase: ' + msg);
  }
  return text ? JSON.parse(text) : null;
}

// coloană în Supabase ↔ câmp în aplicație
const MAP = {
  id: 'id', created_at: 'createdAt', updated_at: 'updatedAt', status: 'status', stage: 'stage',
  name: 'name', phone: 'phone', email: 'email', city: 'city', source: 'source', budget: 'budget',
  space: 'space', timeline: 'timeline', experience: 'experience', comment: 'comment', notes: 'notes',
};
const fromRow = (r) => Object.fromEntries(Object.entries(MAP).map(([col, key]) => [key, r[col] ?? '']));
const toRow = (l) => Object.fromEntries(Object.entries(MAP).map(([col, key]) => [col, l[key] ?? '']));

export async function listLeads() {
  const rows = await rest('leads?select=*&order=created_at.desc');
  return rows.map(fromRow);
}

export async function getLead(id) {
  const rows = await rest('leads?select=*&id=eq.' + encodeURIComponent(id));
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function saveLead(lead) {
  const rows = await rest('leads?on_conflict=id', {
    method: 'POST',
    body: toRow(lead),
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  return fromRow(rows[0]);
}

export async function deleteLead(id) {
  await rest('leads?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
}

export async function getConfig() {
  const rows = await rest('settings?select=value&key=eq.cities');
  return rows[0]?.value || null;
}

export async function setConfig(cfg) {
  await rest('settings?on_conflict=key', {
    method: 'POST',
    body: { key: 'cities', value: cfg },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
  return cfg;
}
