// Notificare în Telegram la fiecare cerere nouă. Tokenul și chat-ul stau în variabilele Vercel.
const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT = () => process.env.TELEGRAM_CHAT_ID || '';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const BUDGET = { lt10: 'Sub 10.000 €', mid: '10.000 – 25.000 €', gt25: 'Peste 25.000 €' };
const SPACE = { own: 'Are spațiu', searching: 'Caută spațiu', none: 'Nu are spațiu' };
const TIME = { m1: 'În maxim 1 lună', m3: 'În 1–3 luni', m6: 'În 3–6 luni', later: 'Peste 6 luni' };
const SOURCE = { site: 'Formular site', facebook: 'Facebook', instagram: 'Instagram', telefon: 'Telefon', email: 'Email', altul: 'Altă sursă' };

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
    '🆕 <b>Cerere nouă de franciză</b>\n\n' +
    line('Nume', lead.name) +
    line('Telefon', lead.phone) +
    line('Email', lead.email) +
    line('Oraș', lead.city) +
    line('Buget', BUDGET[lead.budget]) +
    line('Spațiu', SPACE[lead.space]) +
    line('Termen', TIME[lead.timeline]) +
    line('Sursa', SOURCE[lead.source]) +
    line('Comentariu', lead.comment) +
    line('Primită', fmtTime(lead.createdAt)) +
    line('Status', lead.status) +
    (adminUrl ? `\n<a href="${esc(adminUrl)}">Deschide panoul de cereri</a>` : '')
  );
}

// Nu blochează cererea dacă Telegram nu răspunde: eroarea doar se scrie în log.
export async function notifyNewLead(lead, adminUrl) {
  if (!telegramReady()) {
    console.warn('Telegram nu e configurat (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).');
    return false;
  }
  try {
    await tg('sendMessage', { chat_id: CHAT(), text: leadMessage(lead, adminUrl), parse_mode: 'HTML', disable_web_page_preview: true });
    return true;
  } catch (err) {
    console.error('Notificarea Telegram a eșuat:', err.message);
    return false;
  }
}
