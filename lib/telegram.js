// Notificare √Ăn Telegram la fiecare cerere nouƒÉ. Tokenul »ôi chat-ul stau √Ăn variabilele Vercel.
const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT = () => process.env.TELEGRAM_CHAT_ID || '';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const BUDGET = { lt10: 'Sub 10.000 ‚Ç¨', mid: '10.000 ‚Äì 25.000 ‚Ç¨', gt25: 'Peste 25.000 ‚Ç¨' };
const SPACE = { own: 'Are spa»õiu', searching: 'CautƒÉ spa»õiu', none: 'Nu are spa»õiu' };
const TIME = { m1: '√én maxim 1 lunƒÉ', m3: '√én 1‚Äì3 luni', m6: '√én 3‚Äì6 luni', later: 'Peste 6 luni' };
const SOURCE = { site: 'Site', manual: 'Manual', telegram: 'Telegram Mini App', vizitka: 'Carte de vizitƒÉ', facebook: 'Facebook', instagram: 'Instagram', telefon: 'Telefon', email: 'Email', altul: 'AltƒÉ sursƒÉ' };
const PACKAGE = { start: 'Start', standard: 'Standard', premium: 'Premium' };

export const fmtTime = (iso) =>
  new Date(iso).toLocaleString('ro-RO', { timeZone: 'Europe/Chisinau', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const telegramReady = () => Boolean(TOKEN() && CHAT());

export async function tg(method, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: ctrl.signal,
    });
    const d = await r.json().catch(() => ({}));
    if (!d.ok) throw new Error('Telegram: ' + (d.description || r.status));
    return d.result;
  } finally {
    clearTimeout(timer);
  }
}

export function leadMessage(lead, adminUrl) {
  const line = (k, v) => (v ? `<b>${k}:</b> ${esc(v)}\n` : '');
  return (
    'üÜï <b>Cerere nouƒÉ de francizƒÉ</b>\n\n' +
    line('Nume', lead.name) +
    line('Telefon', lead.phone) +
    line('Email', lead.email) +
    line('Ora»ô', lead.city) +
    line('Pachet', PACKAGE[lead.package]) +
    line('Buget', BUDGET[lead.budget]) +
    line('Spa»õiu', SPACE[lead.space]) +
    line('Termen', TIME[lead.timeline]) +
    line('Sursa', SOURCE[lead.source]) +
    line('Comentariu', lead.comment) +
    line('PrimitƒÉ', fmtTime(lead.createdAt)) +
    line('Status', lead.status) +
    (adminUrl ? `\n<a href="${esc(adminUrl)}">Deschide panoul de cereri</a>` : '')
  );
}

// Nu blocheazƒÉ cererea dacƒÉ Telegram nu rƒÉspunde: eroarea doar se scrie √Ăn log.
export async function notifyNewLead(lead, adminUrl) {
  if (!telegramReady()) {
    console.warn('Telegram nu e configurat (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).');
    return false;
  }
  try {
    await tg('sendMessage', { chat_id: CHAT(), text: leadMessage(lead, adminUrl), parse_mode: 'HTML', disable_web_page_preview: true });
    return true;
  } catch (err) {
    console.error('Notificarea Telegram a e»ôuat:', err.message);
    return false;
  }
}
