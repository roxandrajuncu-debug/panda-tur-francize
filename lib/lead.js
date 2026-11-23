// Validarea câmpurilor unei cereri. Scorul se calculează în interfață (public/app.js).
export const STAGES = ['nou', 'apel', 'intalnire', 'contract', 'achitat', 'respins'];
// site = formularul public, manual = adăugat de echipă (apel, întâlnire), vizitka = scanare de carte de vizită, telegram = Mini App
export const SOURCES = ['site', 'manual', 'telegram', 'vizitka', 'facebook', 'instagram', 'telefon', 'email', 'altul'];
export const PACKAGES = ['', 'start', 'standard', 'premium'];
export const BUDGETS = ['lt10', 'mid', 'gt25'];
export const SPACES = ['own', 'searching', 'none'];
export const TIMES = ['m1', 'm3', 'm6', 'later'];
export const EXPS = ['', 'turism', 'vanzari', 'business', 'none'];

// Statusul salvat în baza de date se trage din etapa pipeline-ului.
export const STATUS_OF_STAGE = {
  nou: 'nouă',
  apel: 'în lucru',
  intalnire: 'în lucru',
  contract: 'în lucru',
  achitat: 'închisă',
  respins: 'închisă',
};

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const pick = (v, list, def) => (list.includes(v) ? v : def);

export const phoneOk = (p) => /^\+?[\d\s()\-.]+$/.test(p) && (p.match(/\d/g) || []).length >= 8 && (p.match(/\d/g) || []).length <= 15;
export const emailOk = (e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export function cleanLead(input, { requireAll = false, requireComment = false } = {}) {
  const stage = pick(input.stage, STAGES, 'nou');
  const lead = {
    name: str(input.name, 120),
    phone: str(input.phone, 40),
    email: str(input.email, 120),
    city: str(input.city, 80),
    source: pick(input.source, SOURCES, 'manual'),
    company: str(input.company, 160),
    package: pick(input.package ?? '', PACKAGES, ''),
    docPath: /^cards\/[\w-]+\.(jpg|png|webp|pdf)$/.test(input.docPath || '') ? input.docPath : '',
    docType: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(input.docType) ? input.docType : '',
    budget: pick(input.budget, BUDGETS, ''),
    space: pick(input.space, SPACES, ''),
    timeline: pick(input.timeline, TIMES, ''),
    experience: pick(input.experience ?? '', EXPS, ''),
    stage,
    status: STATUS_OF_STAGE[stage],
    comment: str(input.comment, 2000),
    notes: str(input.notes, 4000),
  };
  const missing = [];
  if (lead.name.length < 2) missing.push('nume');
  if (!phoneOk(lead.phone)) missing.push('telefon valid');
  if (!emailOk(lead.email)) missing.push('email valid');
  if (requireComment && lead.comment.length < 3) missing.push('comentariu');
  if (requireAll) {
    if (!lead.city) missing.push('oraș');
    if (!lead.budget) missing.push('buget');
    if (!lead.space) missing.push('spațiu');
    if (!lead.timeline) missing.push('termen');
  }
  return { lead, missing };
}

// Istoria etapelor: [{stage, at}]. Se adaugă un rând doar când etapa chiar se schimbă.
export function withHistory(oldLead, newStage, at) {
  const hist = Array.isArray(oldLead?.history) ? oldLead.history.slice(-100) : [];
  if (!hist.length || hist[hist.length - 1].stage !== newStage) hist.push({ stage: newStage, at });
  return hist;
}
