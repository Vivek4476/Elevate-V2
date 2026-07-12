// /api/admin — Ops console backend.
//   POST { passcode }            -> verify the ops passphrase (server-side; never gate in client code)
//   GET  (x-elevate-ops header)  -> data-health snapshot (read-only roster metadata, no per-DSE financials)
//
// Auth model (migration: admin relocation): a single shared ops passphrase held in the ADMIN_PASSCODE
// env var. This is deliberately SSO-ready — the verify step is one function, so swapping to Google/SAML
// OIDC later means replacing the check and issuing a signed session instead of echoing `ok`. The old
// "type ADMIN into the DSE login" entry is gone; the gate now lives server-side on its own route.

import { getData, dataSource } from './_lib/data.js';
import { trailingWindow } from '../engine/transform.js';

const PASSCODE = process.env.ADMIN_PASSCODE || 'elevate-ops-2026';
const authed = (req) => (req.headers['x-elevate-ops'] || '') === PASSCODE;

const safeJson = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? safeJson(req.body) : req.body;
  return await new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => resolve(safeJson(s)));
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-elevate-ops');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── passphrase verification ──
  if (req.method === 'POST') {
    const body = await readBody(req);
    if (body && body.passcode === PASSCODE) return res.status(200).json({ ok: true });
    return res.status(401).json({ ok: false, error: 'Invalid passphrase' });
  }

  // ── everything below requires the verified ops header ──
  if (!authed(req)) return res.status(401).json({ error: 'unauthorized' });

  let data;
  try { data = await getData(); }
  catch (e) { return res.status(500).json({ error: 'data source (' + dataSource() + '): ' + e.message }); }

  const inc = data.inc, monthly = data.sp.monthly, master = data.sp.master, meta = data.sp.meta || {};
  const incCodes = Object.keys(inc);
  const joined = incCodes.filter((c) => monthly[c]);
  const incentiveOnly = incCodes.length - joined.length;
  const spOnly = Object.keys(monthly).filter((c) => !inc[c]).length;

  // by grade / by zone across the JOINED set (the canonical population)
  const boZone = {};
  for (const e of Object.values(master)) boZone[e.bo] = e.zone;
  const byGrade = {}, byZone = {};
  const win = trailingWindow(meta.maxMonth);
  let activeThisWindow = 0;
  for (const c of joined) {
    const g = (inc[c].desg || '—'); byGrade[g] = (byGrade[g] || 0) + 1;
    const z = boZone[c] || '—'; byZone[z] = (byZone[z] || 0) + 1;
    const m = monthly[c] || {};
    if (win.some((k) => (m[k] || {}).w)) activeThisWindow++;
  }

  return res.status(200).json({
    source: dataSource(),
    incentive: { rows: incCodes.length, label: 'Incentive statements (this month)' },
    sp: { rows: Object.keys(monthly).length, dseCount: meta.dseCount || null, label: 'Sales-Progression roster (rolling 12-mo)' },
    joined: joined.length,
    incentiveOnly,
    spOnly,
    coverage: incCodes.length ? Math.round((joined.length / incCodes.length) * 100) : 0,
    activeThisWindow,
    monthRange: { min: meta.minMonth || null, max: meta.maxMonth || null },
    updatedAt: meta.updatedAt || null,
    publishedBy: meta.publishedBy || null,
    byGrade, byZone,
    history: (meta.history || []).slice(0, 6),
  });
}
