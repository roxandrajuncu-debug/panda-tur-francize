// Validarea câmpurilor unei cereri. Scorul se calculează în interfață (public/app.js).
export const STAGES = ['nou', 'apel', 'intalnire', 'contract', 'respins'];
export const SOURCES = ['site', 'facebook', 'instagram', 'telefon', 'email', 'altul'];
export const BUDGETS = ['lt10', 'mid', 'gt25'];
export const SPACES = ['own', 'searching', 'none'];
export const TIMES = ['m1', 'm3', 'm6', 'later'];
export const EXPS = ['', 'turism', 'vanzari', 'business', 'none'];

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const pick = (v, list, def) => (list.includes(v) ? v : def);

export function cleanLead(input, { requireAll = true } = {}) {
  const lead = {
    name: str(input.name, 120),
    phone: str(input.phone, 40),
    email: str(input.email, 120),
    city: str(input.city, 80),
    source: pick(input.source, SOURCES, 'site'),
    budget: pick(input.budget, BUDGETS, ''),
    space: pick(input.space, SPACES, ''),
    timeline: pick(input.timeline, TIMES, ''),
    experience: pick(input.experience ?? '', EXPS, ''),
    stage: pick(input.stage, STAGES, 'nou'),
    notes: str(input.notes, 4000),
  };
  const missing = [];
  if (!lead.name) missing.push('nume');
  if (!lead.phone) missing.push('telefon');
  if (requireAll) {
    if (!lead.city) missing.push('oraș');
    if (!lead.budget) missing.push('buget');
    if (!lead.space) missing.push('spațiu');
    if (!lead.timeline) missing.push('termen');
  }
  return { lead, missing };
}
