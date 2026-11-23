// Stocare în Supabase (Postgres) prin API-ul REST. Cheia secretă stă doar în variabilele Vercel.
const BASE = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function needDb() {
  if (!BASE || !KEY) {
    throw new Error('Baza de date nu e conectată. În Vercel: Storage → Supabase → Connect, apoi Redeploy.');
  }
}

async function rest(path, { method = 'GET', body, prefer } = {}) {
  needDb();
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
  company: 'company', doc_path: 'docPath', doc_type: 'docType', package: 'package',
};
const fromRow = (r) => ({
  ...Object.fromEntries(Object.entries(MAP).map(([col, key]) => [key, r[col] ?? ''])),
  history: Array.isArray(r.history) ? r.history : [],
  tgUserId: r.tg_user_id ?? null,
});
const toRow = (l) => ({
  ...Object.fromEntries(Object.entries(MAP).map(([col, key]) => [col, l[key] ?? ''])),
  history: Array.isArray(l.history) ? l.history : [],
  tg_user_id: l.tgUserId ?? null,
});

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

export async function listLeadsByTelegram(tgUserId) {
  const rows = await rest('leads?select=*&order=created_at.desc&limit=20&tg_user_id=eq.' + encodeURIComponent(tgUserId));
  return rows.map(fromRow);
}

// ---------- Supabase Storage (bucket-uri private: documents, generated) ----------
function storageHeaders(extra = {}) {
  needDb();
  const h = { apikey: KEY, ...extra };
  if (!KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + KEY;
  return h;
}
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

export async function uploadFile(bucket, path, buffer, contentType) {
  const r = await fetch(`${BASE}/storage/v1/object/${bucket}/${encPath(path)}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': contentType, 'x-upsert': 'true' }),
    body: buffer,
  });
  if (!r.ok) throw new Error('Supabase Storage: ' + (await r.text()).slice(0, 300));
}

export async function removeFile(bucket, path) {
  await fetch(`${BASE}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => {});
}

// Link temporar (implicit 10 minute) către un fișier privat.
export async function signedUrl(bucket, path, expiresIn = 600) {
  const r = await fetch(`${BASE}/storage/v1/object/sign/${bucket}/${encPath(path)}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.signedURL) throw new Error('Supabase Storage: ' + (d.message || r.status));
  return BASE + '/storage/v1' + d.signedURL;
}

export async function signedUrls(bucket, paths, expiresIn = 3600) {
  if (!paths.length) return {};
  const r = await fetch(`${BASE}/storage/v1/object/sign/${bucket}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn, paths }),
  });
  const d = await r.json().catch(() => []);
  if (!r.ok || !Array.isArray(d)) return {};
  return Object.fromEntries(d.filter((x) => x.signedURL).map((x) => [x.path, BASE + '/storage/v1' + x.signedURL]));
}

// ---------- istoria generărilor de imagini ----------
const genFrom = (r) => ({ id: r.id, createdAt: r.created_at, prompt: r.prompt, promptEn: r.prompt_en, style: r.style, path: r.path, status: r.status });

export async function countGenerationsSince(userKey, sinceIso) {
  const rows = await rest(`generations?select=id&user_key=eq.${encodeURIComponent(userKey)}&status=neq.error&created_at=gte.${encodeURIComponent(sinceIso)}`);
  return rows.length;
}

export async function listGenerations(userKey, limit = 30) {
  const rows = await rest(`generations?select=*&user_key=eq.${encodeURIComponent(userKey)}&status=eq.done&order=created_at.desc&limit=${limit}`);
  return rows.map(genFrom);
}

export async function insertGeneration(g) {
  const rows = await rest('generations', {
    method: 'POST',
    body: { id: g.id, user_key: g.userKey, prompt: g.prompt, style: g.style || '', status: 'pending' },
    prefer: 'return=representation',
  });
  return genFrom(rows[0]);
}

export async function updateGeneration(id, fields) {
  const body = {};
  if (fields.status) body.status = fields.status;
  if (fields.path != null) body.path = fields.path;
  if (fields.promptEn != null) body.prompt_en = fields.promptEn;
  await rest('generations?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body, prefer: 'return=minimal' });
}
