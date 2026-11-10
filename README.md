# Filtru cereri de franciză · Panda Tur Moldova

Aplicație Node.js pentru Vercel care strânge și filtrează cererile celor care vor să cumpere franciza.

- **`/aplica`**: formular public pentru candidați. Cererea intră automat în coloana „Nou”.
  - `/aplica?src=facebook` și `/aplica?src=instagram` marchează sursa automat (pune-le în postări și reclame).
- **`/`**: pipeline-ul echipei (protejat cu parolă): Nou → Apel → Întâlnire → Contract → Respins.
- **`/login`**: intrarea cu parola comună a echipei.

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

## Publicare pe Vercel (fără nimic instalat pe calculator)

1. **GitHub**: creează un cont pe github.com → **New repository** (de ex. `panda-tur-francize`, *Private*).
   Pe pagina repository-ului: **uploading an existing file** → trage în browser tot conținutul acestui folder
   (`api`, `lib`, `public`, `package.json`, `vercel.json`, `README.md`) → **Commit changes**.
2. **Vercel**: intră pe vercel.com cu contul GitHub → **Add New… → Project** → alege repository-ul → **Import**.
   La *Framework Preset* lasă **Other**. Nu schimba nimic altceva → **Deploy**.
3. **Baza de date**: în proiectul Vercel → **Storage** → **Upstash for Redis** (planul gratuit) → **Create** → **Connect** la proiect.
   Variabilele `KV_REST_API_URL` și `KV_REST_API_TOKEN` se adaugă singure.
4. **Parola**: **Settings → Environment Variables**, adaugă:
   - `ADMIN_PASSWORD`: parola echipei
   - `SESSION_SECRET`: un șir lung, aleatoriu (minim 32 de caractere)
5. **Deployments** → la ultimul deploy: **⋯ → Redeploy**, ca să preia variabilele.
6. Deschide `https://<proiect>.vercel.app/login`, intră cu parola și verifică formularul la `/aplica`.

Opțional: în **Settings → Domains** poți lega un subdomeniu, de ex. `franciza.pandatur.md`.

## Structură

```
api/      funcții serverless: leads (pipeline), apply (formular public), login, config (orașe)
lib/      stocare Redis, autentificare, validare
public/   pagini: index (pipeline), aplica (candidați), login + styles.css, app.js
```
