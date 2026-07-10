# Deploy — Vercel + Supabase (free tier)

The app deploys as a static site **plus** serverless functions (`/api`) that run the rules
engine server-side. Supabase holds the data. SSO/SMS are deferred.

## 1. Vercel (static site + API)

Zero CLI — import the GitHub repo:

1. vercel.com → **Add New → Project → Import** `Vercel4476/Elevate-V2`.
2. Framework preset: **Other** (no build step). Deploy.
3. Done — the static app is live, and `/api/dse/:code` + `/api/otp` are live functions.

At this point the API works immediately using the repo's JSON files (fallback). Verify:

```
curl https://<your-deploy>.vercel.app/api/dse/AAA634
```

## 2. Supabase (database)

1. supabase.com → **New project** (free tier).
2. **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. **Project Settings → API** → copy the **Project URL** and the **service_role** key.
4. Seed the data from your machine:
   ```
   npm install
   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... npm run seed
   ```
5. In **Vercel → Project → Settings → Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`  (server-only — never exposed to the browser)
   Redeploy.

Now `/api/dse/:code` reads from Supabase instead of the JSON files (`dataSource()` switches
automatically). Nothing else changes.

## How it fits

```
Browser ──GET /api/dse/:code──▶ Vercel Function ──▶ engine/ (buildDseView) ──▶ Supabase
                                     │
                                     └─ falls back to repo JSON if Supabase env is unset
```

- The **engine is unchanged** — pure and tested; the function just calls `buildDseView`.
- The client can migrate from loading the full JSON to calling this API (a later step); today
  both coexist.

## Deferred (auth phase)

- **SSO**: verify the session at the top of `api/dse/[code].js` and that `:code` is the caller's.
- **SMS-OTP**: replace the `api/otp.js` stub with MSG91/Twilio/SNS.
- **RLS**: enable Row Level Security + per-DSE policies in Supabase.
