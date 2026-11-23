# CRM francize ¬∑ Panda Tur Moldova

Aplica»õie Node.js pentru Vercel: CRM cu p√¢lnie pentru cererile de francizƒÉ, OCR pentru cƒÉr»õi de vizitƒÉ (Claude), Telegram Mini App »ôi imagini AI.

**Live:** [formular](https://panda-tur-francize.vercel.app/aplica) ¬∑ [CRM](https://panda-tur-francize.vercel.app/admin) ¬∑ [Imagini AI](https://panda-tur-francize.vercel.app/imagini) ¬∑ Mini App: `/tg` (se deschide din bot)

Codul se publicƒÉ automat pe Vercel la fiecare commit √Ăn `main`.

## Ce face

- **CRM, p√¢lnia:** Nou ‚Üí Apel ‚Üí √ént√¢lnire ‚Üí Contract ‚Üí Achitat / Respins. Cardurile se trag √Ăntre coloane (sau se schimbƒÉ etapa √Ăn fi»ôƒÉ).
  - Sursa: **Site** (formularul `/aplica`, automat), **Manual** (butonul ‚Äû+ Client manual‚Äù: apel, √Ănt√¢lnire), **Telegram** (Mini App), **Carte de vizitƒÉ** (scanare). Plus Facebook / Instagram prin `/aplica?src=‚Ä¶`.
  - Fi»ôa clientului: nume, telefon, sursƒÉ, data creƒÉrii, noti»õe »ôi **istoria etapelor cu date** (coloana `history`).
  - Statusul se trage din etapƒÉ: Nou ‚Üí nouƒÉ; Apel, √ént√¢lnire, Contract ‚Üí √Ăn lucru; Achitat, Respins ‚Üí √ĂnchisƒÉ.
- **Scanare cƒÉr»õi de vizitƒÉ (Claude API):** ‚ÄûScaneazƒÉ vizitƒÉ‚Äù ‚Üí fotografie de pe telefon sau PDF ‚Üí Claude √Ăntoarce c√¢mpurile ‚Üí ecran de verificare ‚Üí clientul apare √Ăn ‚ÄûNou‚Äù cu sursa ‚ÄûCarte de vizitƒÉ‚Äù. Originalul stƒÉ √Ăn Supabase Storage (bucket privat `documents`) »ôi se deschide din fi»ôƒÉ. DacƒÉ imaginea nu e o carte de vizitƒÉ, apare un mesaj »ôi nu se salveazƒÉ nimic.
- **Telegram Mini App (`/tg`):** butonul ‚ÄûFranciza‚Äù din meniul botului. Clientul vede pachetele (Start / Standard / Premium), lasƒÉ telefonul ‚Üí cererea intrƒÉ √Ăn CRM cu sursa ‚ÄûTelegram‚Äù »ôi numele din Telegram. Utilizatorul se verificƒÉ pe server (semnƒÉtura `initData` cu tokenul botului). √én browser obi»ônuit pagina cere sƒÉ fie deschisƒÉ √Ăn Telegram. Clientul √Ă»ôi vede »ôi statusul cererilor.
- **Imagini AI (`/imagini`):** FLUX.1 [schnell] prin Cloudflare Workers AI, apelat de pe server. Istoria generƒÉrilor (bucket privat `generated` + tabelul `generations`), limitƒÉ 5 imagini pe zi (ora Chi»ôinƒÉului).
- **Telegram:** la fiecare cerere nouƒÉ (site sau Mini App), botul trimite imediat datele √Ăn chat-ul echipei.

## Variabile √Ăn Vercel (nimic secret √Ăn cod)

| VariabilƒÉ | De unde |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | se adaugƒÉ singure la Storage ‚Üí Supabase ‚Üí Connect |
| `TELEGRAM_BOT_TOKEN` | de la @BotFather |
| `TELEGRAM_CHAT_ID` | apare √Ăn panou, la ‚ÄûNotificƒÉri Telegram‚Äù, dupƒÉ ce √Ăi scrii botului |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | parola echipei »ôi un »ôir aleatoriu lung |
| `ANTHROPIC_API_KEY` | console.anthropic.com ‚Üí API Keys (cu limitƒÉ de cheltuieli √Ăn Settings ‚Üí Limits) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com ‚Üí Workers AI ‚Üí Use REST API (token cu permisiunea ‚ÄûWorkers AI‚Äù) |
| `GEN_DAILY_LIMIT` | op»õional, implicit 5 |

Tabelele se creeazƒÉ o singurƒÉ datƒÉ √Ăn Supabase ‚Üí SQL Editor: √Ănt√¢i [supabase/schema.sql](supabase/schema.sql), apoi [supabase/migrare-dz2.sql](supabase/migrare-dz2.sql) (etapa Achitat, istoria, Storage, generƒÉri).

## Cum se calculeazƒÉ scorul (0‚Äì100)

| Criteriu | VariantƒÉ | Puncte |
|---|---|---|
| Buget | Sub 10.000 ‚Ç¨ | 0 (marcat ‚ÄûSub prag‚Äù) |
| | 10.000 ‚Äì 25.000 ‚Ç¨ | 30 |
| | Peste 25.000 ‚Ç¨ | 40 |
| Ora»ô | Prioritate mare (implicit Chi»ôinƒÉu, BƒÉl»õi) | 25 |
| | Prioritate medie (centre raionale) | 15 |
| | Alte localitƒÉ»õi / diaspora | 5 |
| Spa»õiu | Are spa»õiu / cautƒÉ / nu are | 20 / 10 / 0 |
| Termen | ‚â§1 lunƒÉ / 1‚Äì3 luni / 3‚Äì6 luni / >6 luni | 15 / 10 / 5 / 0 |

**Fierbinte** 70+ ¬∑ **Cald** 45‚Äì69 ¬∑ **Rece** sub 45. Listele de ora»ôe se schimbƒÉ din butonul ‚ÄûPrioritƒÉ»õi ora»ôe‚Äù.

## StructurƒÉ

```
api/      leads (CRM), apply (formular public), ocr (Claude), doc (original), tg-app (Mini App),
          generate (imagini), telegram (stare, test, buton meniu), login, config
lib/      store (Supabase + Storage), claude, tgauth (verificare initData), imagegen, telegram, auth, lead
public/   index (CRM), aplica, tg (Mini App), imagini, login + styles.css, app.js
```
