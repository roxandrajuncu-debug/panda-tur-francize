// Stocare în Upstash Redis (se conectează din Vercel → Storage → Upstash for Redis).
import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const LEADS = 'pt:leads';
const CONFIG = 'pt:config:cities';

function db() {
  if (!redis) {
    throw new Error('Baza de date nu e conectată. În Vercel: Storage → Upstash for Redis → Connect, apoi Redeploy.');
  }
  return redis;
}
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

export async function listLeads() {
  const all = (await db().hgetall(LEADS)) || {};
  return Object.values(all).map(parse);
}

export async function getLead(id) {
  const v = await db().hget(LEADS, id);
  return v ? parse(v) : null;
}

export async function saveLead(lead) {
  await db().hset(LEADS, { [lead.id]: JSON.stringify(lead) });
  return lead;
}

export async function deleteLead(id) {
  await db().hdel(LEADS, id);
}

export async function getConfig() {
  const v = await db().get(CONFIG);
  return v ? parse(v) : null;
}

export async function setConfig(cfg) {
  await db().set(CONFIG, JSON.stringify(cfg));
  return cfg;
}
