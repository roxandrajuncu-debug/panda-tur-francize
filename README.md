# Filtru cereri de franciză · Panda Tur Moldova

Aplicație Node.js pentru Vercel care strânge și filtrează cererile celor care vor să cumpere franciza.

**Live:** [formular](https://panda-tur-francize.vercel.app/aplica) · [panou admin](https://panda-tur-francize.vercel.app/admin)

Codul se publică automat pe Vercel la fiecare commit în `main`.

- **`/aplica`**: formular public pentru candidați. Cererea intră automat în coloana „Nou”.
  - `/aplica?src=facebook` și `/aplica?src=instagram` marchează sursa automat (pune-le în postări și reclame).
- **`/admin`** (sau `/`): pipeline-ul echipei (protejat cu parolă): Nou → Apel → Întâlnire → Contract → Respins. În fiecare coloană, cele mai noi cereri sunt sus.
- **`/login`**: intrarea cu parola comună a echipei.
- **Supabase**: toate cererile stau în tabelul `leads`, cu data creării (`created_at`) și statusul `nouă` / `în lucru` / `închisă`.
  Statusul vine din etapă: Nou → nouă; Apel, Întâlnire → în lucru; Contract, Respins → închisă.
- **Telegram**: la fiecare cerere din formular, botul trimite imediat toate datele.
- În panou: filtru pe status și vizualizarea **Listă** (cele mai noi sus).

## Variabile în Vercel (nimic secret în cod)

| Variabilă | De unde |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | se adaugă singure la Storage → Supabase → Connect |
| `TELEGRAM_BOT_TOKEN` | de la @BotFather |
| `TELEGRAM_CHAT_ID` | apare în panou, la „Notificări Telegram”, după ce îi scrii botului |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | parola echipei și un șir aleatoriu lung |

Tabelele se creează o singură dată cu [supabase/schema.sql](supabase/schema.sql) în Supabase → SQL Editor.

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
api/      funcții serverless: leads (pipeline), apply (formular public + Telegram), login, config (orașe), telegram (stare/test)
lib/      stocare Supabase, Telegram, autentificare, validare
public/   pagini: index (pipeline), aplica (candidați), login + styles.css, app.js
```
