// GET /api/dse/:code  ->  { dse, earnings, career, bridge, perform, profile } computed server-side.
// Vercel Serverless Function (Node.js). Auth (SSO) attaches at the top — deferred for now.

import { getData, dataSource, contractEnabled, getContract } from '../_lib/data.js';
import { applyContract } from '../_lib/adapt.js';
import { transformDse, parseIncentiveDseRow, trailingWindow } from '../../engine/transform.js';
import { buildDseView } from '../../engine/view.js';
import { buildEarningsStatement } from '../../engine/statement.js';
import { APR26 } from '../../engine/designs/apr26.js';
import { SP_RULES } from '../../engine/designs/spRules.js';

// Cohort/profile enrichment computed from the raw sheets (cheap: ~735 rows x 12 months).
// Everything here is time-window tagged at render so SP (rolling-12mo) and incentive
// (this-month ₹) numbers are never mixed in one widget.
function buildProfile(code, data) {
  const inc = data.inc, monthly = data.sp.monthly, master = data.sp.master;
  const win = trailingWindow(data.sp.meta.maxMonth);
  const joined = !!monthly[code];

  // bo -> { zone, full } map (one pass over master)
  const boMeta = {};
  for (const e of Object.values(master)) boMeta[e.bo] = { zone: e.zone, full: e.full };

  const roll = (c) => {
    const m = monthly[c] || {}; let w = 0, n = 0;
    for (const k of win) { const x = m[k] || {}; w += (x.w || 0); n += (x.n || 0); }
    return { w, n };
  };

  const row = inc[code] || {};
  const ulip = +row.ulipFyp || 0, trad = +row.wfypOthers || 0;
  const persCM = row.persCM != null ? +row.persCM : null;
  const persLM = row.persLM != null ? +row.persLM : null;

  const profile = {
    joined,
    fullDesig: (boMeta[code] && boMeta[code].full) || null,
    zone: (boMeta[code] && boMeta[code].zone) || null,
    monthlyTarget: +row.target || 0,
    productMix: { ulip, trad, ulipPct: (ulip + trad) ? ulip / (ulip + trad) : 0 },
    persTrend: (persCM != null && persLM != null)
      ? { cm: persCM, lm: persLM, delta: persCM - persLM } : null,
    rolling: null,
    rank: null,
  };
  if (!joined) return profile;

  // rolling 12-mo momentum + trailing streak of positive months
  const m = monthly[code] || {};
  let pos = 0, streak = 0;
  for (const k of win) if (((m[k] || {}).w || 0) > 0) pos++;
  for (let i = win.length - 1; i >= 0; i--) { if (((m[win[i]] || {}).w || 0) > 0) streak++; else break; }
  const me = roll(code);
  profile.rolling = { wfyp: me.w, nop: me.n, posMonths: pos, streak, monthsTotal: win.length };

  // rank by rolling-12mo WFYP among all joined DSEs (overall + within zone)
  const joinedCodes = Object.keys(inc).filter((c) => monthly[c]);
  const ranked = joinedCodes.map((c) => ({ c, w: roll(c).w })).sort((a, b) => b.w - a.w);
  const rank = ranked.findIndex((x) => x.c === code) + 1;
  const zone = profile.zone;
  const zoneCodes = zone ? ranked.filter((x) => (boMeta[x.c] && boMeta[x.c].zone) === zone) : [];
  const zoneRank = zone ? zoneCodes.findIndex((x) => x.c === code) + 1 : null;
  profile.rank = {
    wfyp: rank, total: ranked.length, pct: Math.max(1, Math.round((rank / ranked.length) * 100)),
    zone, zoneRank, zoneTotal: zoneCodes.length,
    zonePct: zoneRank ? Math.max(1, Math.round((zoneRank / zoneCodes.length) * 100)) : null,
  };
  return profile;
}

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  // AUTH would go here: verify session and that `code` belongs to the caller.
  const code = String(req.query?.code || '').toUpperCase();

  let data;
  try { data = await getData(); }
  catch (e) { return res.status(500).json({ error: 'data source (' + dataSource() + '): ' + e.message }); }

  const row = data.inc[code];
  if (!row) return res.status(404).json({ error: `No incentive statement for ${code}` });

  try {
    const rec = transformDse(row, data.sp, null);
    const profile = buildProfile(code, data);
    // 12-month WFYP/NOP series for the Perform screen + Career momentum strip.
    const win = trailingWindow(data.sp.meta.maxMonth);
    const m = data.sp.monthly[code] || {};
    const perform = { months: win.map((k) => ({ m: k, w: (m[k] || {}).w || 0, n: (m[k] || {}).n || 0 })) };
    let view;
    if (rec.joined) {
      view = buildDseView({ designs: APR26, spRules: SP_RULES, ...rec });
      view.perform = perform;
      view.profile = profile;
    } else {
      const { incentiveInputs } = parseIncentiveDseRow(row);
      view = {
        dse: rec.dse, earnings: buildEarningsStatement(APR26, incentiveInputs, rec.dse),
        career: null, bridge: null, perform: null, profile,
        note: 'DSE not in the promotion dataset',
      };
    }
    // Step 3: behind the flag, override the computed numbers with the reconciled contract.
    // Missing/erroring contract → keep the computed view (graceful, still deployable).
    if (contractEnabled()) {
      try {
        const contract = await getContract(code);
        if (contract) applyContract(view, contract);
      } catch (_) { /* fall back to the computed view */ }
    }
    return res.status(200).json(view);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
