# Elevate API (backend-phase first step)

Runs the tested rules engine **server-side** and returns one DSE's computed view-model.
Zero external dependencies (`node:http`).

```
node server/api.mjs
curl http://localhost:8090/api/dse/AAA634 | python3 -m json.tool
```

## Endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/dse/:code` | `{ dse, earnings, career, bridge }` — computed for that DSE |
| POST | `/api/otp` | stub `{ sent: true }` |

## Why this matters

Today the static app ships **the whole roster + the engine** to every browser
(`elevate_data.json`, `elevate_incentive.json`). This API flips that: the client asks for
**one DSE** and gets back only that person's computed result. That directly addresses the
README's "known limitations":

- **No bulk PII on the client.** The full datasets stay on the server; a caller only ever
  receives their own numbers.
- **The engine stays server-side.** Business rules aren't shipped to the browser.

## Where the real backend attaches

This is deliberately minimal — the seams are marked in `api.mjs`:

- **Auth (SSO):** verify the caller's session at the top of `/api/dse/:code`, and that
  `:code` belongs to them (or their reporting hierarchy).
- **SMS-OTP:** replace the `/api/otp` stub with MSG91/Twilio/SNS; store a hashed code + expiry.
- **Data:** swap the JSON reads for a database / the monthly-published files; add caching.
- **Serving:** put this behind the existing static site (same origin) or an API gateway.

The rules engine (`../engine`) needs no changes — it's already pure and tested; this just
calls `buildDseView` on the server instead of in the browser.
