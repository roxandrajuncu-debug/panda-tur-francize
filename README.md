# CRM francize · Panda Tur Moldova

Aplicație Node.js pentru Vercel: CRM cu pâlnie pentru cererile de franciză, OCR pentru cărți de vizită (Claude), Telegram Mini App și imagini AI.

**Live:** [formular](https://panda-tur-francize.vercel.app/aplica) · [CRM](https://panda-tur-francize.vercel.app/admin) · [Imagini AI](https://panda-tur-francize.vercel.app/imagini) · Mini App: `/tg` (se deschide din bot)

Codul se publică automat pe Vercel la fiecare commit în `main`.

## Ce face

- **CRM, pâlnia:** Nou → Apel → Întâlnire → Contract → Achitat / Respins. Cardurile se trag între coloane (sau se schimbă etapa în fișă).
  - Sursa: **Site** (formularul `/aplica`, automat), **Manual** (butonul „+ Client manual”: apel, întâlnire), **Telegram** (Mini App), **Carte de vizită** (scanare). Plus Facebook / Instagram prin `/aplica?src=…`.
  - Fișa clientului: nume, telefon, sursă, data creării, notițe și **istoria etapelor cu date** (coloana `history`).
  - Statusul se trage din etapă: Nou → nouă; Apel, Întâlnire, Contract → în lucru; Achitat, Respins → închisă.
- **Scanare cărți de vizită (Claude API):** „Scanează vizită” → fotografie de pe telefon sau PDF → Claude întoarce câmpurile → ecran de verificare → clientul apare în „Nou” cu sursa „Carte de vizită”. Originalul stă în Supabase Storage (bucket privat `documents`) și se deschide din fișă. Dacă imaginea nu e o carte de vizită, apare un mesaj și nu se salvează nimic.
- **Telegram Mini App (`/tg`):** butonul „Franciza” din meniul botului. Clientul vede pachetele (Start / Standard / Premium), lasă telefonul → cererea intră în CRM cu sursa „Telegram” și numele din Telegram. Utilizatorul se verifică pe server (semnătura `initData` cu tokenul botului). În browser obișnuit pagina cere să fie deschisă în Telegram. Clientul își vede și statusul cererilor.
- **Imagini AI (`/imagini`):** FLUX.1 [schnell] prin Cloudflare Workers AI, apelat de pe server. Istoria generărilor (bucket privat `generated` + tabelul `generations`), limită 5 imagini pe zi (ora Chișinăului).
- **Telegram:** la fiecare cerere nouă (site sau Mini App), botul trimite imediat datele în chat-ul echipei.

## Variabile în Vercel (nimic secret în cod)

| Variabilă | De unde |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | se adaugă singure la Storage → Supabase → Connect |
| `TELEGRAM_BOT_TOKEN` | de la @BotFather |
| `TELEGRAM_CHAT_ID` | apare în panou, la „Notificări Telegram”, după ce îi scrii botului |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | parola echipei și un șir aleatoriu lung |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (cu limită de cheltuieli în Settings → Limits) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → Workers AI → Use REST API (token cu permisiunea „Workers AI”) |
| `GEN_DAILY_LIMIT` | opțional, implicit 5 |

Tabelele se creează o singură dată în Supabase → SQL Editor: întâi [supabase/schema.sql](supabase/schema.sql), apoi [supabase/migrare-dz2.sql](supabase/migrare-dz2.sql) (etapa Achitat, istoria, Storage, generări).

## Cum se calculează scorul (0–100)

| Criteriu | Variantă | Puncte |
|---|---|---|
| Buget | Sub 10.000 € | 0 (marcat „Sub prag”) |
| | 10.000 – 25.000 € | 30 |
| | Peste 25.000 € | 40 |
| Oraș | Prioritate mare (implicit Chișinău, Bălți) | 25 |
| | Prioritate medie (centre raionale) | 15 |
| | Alte localități / diaspora | 5 |
| Spațiu | Are spațiu / caută / nu are | 20 / 10 / 0 |
| Termen | ≤1 lună / 1–3 luni / 3–6 luni / >6 luni | 15 / 10 / 5 / 0 |

**Fierbinte** 70+ · **Cald** 45–69 · **Rece** sub 45. Listele de orașe se schimbă din butonul „Priorități orașe”.

## Structură

```
api/      leads (CRM), apply (formular public), ocr (Claude), doc (original), tg-app (Mini App),
          generate (imagini), telegram (stare, test, buton meniu), login, config
lib/      store (Supabase + Storage), claude, tgauth (verificare initData), imagegen, telegram, auth, lead
public/   index (CRM), aplica, tg (Mini App), imagini, login + styles.css, app.js
```
