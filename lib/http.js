// Ajutoare comune pentru funcțiile API (merg identic pe Vercel și în server.js local).
import crypto from 'node:crypto';

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 100_000) break;
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export function queryParam(req, name) {
  if (req.query && req.query[name] != null) return String(req.query[name]);
  try { return new URL(req.url, 'http://x').searchParams.get(name); } catch { return null; }
}

export const newId = () => crypto.randomBytes(9).toString('base64url');

export function handleError(res, err) {
  console.error(err);
  send(res, 500, { error: err?.message || 'Eroare internă' });
}
