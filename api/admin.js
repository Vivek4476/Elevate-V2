// GET /api/admin -> data-health snapshot for the Admin console.
// Read-only aggregate counts (no per-DSE financials). Manager/admin auth attaches
// at the top later; for now it exposes only roster-health metadata, no secrets.

import { getData, dataSource } from './_lib/data.js';
import { trailingWindow } from '../engine/transform.js';

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  let data;
  try { data = await getData(); }
  catch (e) { return res.status(500).json({ error: 'data source (' + dataSource() + '): ' + e.message }); }

  const inc = data.inc, monthly = data.sp.monthly, master = data.sp.master, meta = data.sp.meta || {};
  const incCodes = Object.keys(inc);
  const joined = incCodes.filter((c) => monthly[c]);
  const incentiveOnly = incCodes.length - joined.length;

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
    coverage: incCodes.length ? Math.round((joined.length / incCodes.length) * 100) : 0,
    activeThisWindow,
    monthRange: { min: meta.minMonth || null, max: meta.maxMonth || null },
    updatedAt: meta.updatedAt || null,
    publishedBy: meta.publishedBy || null,
    byGrade, byZone,
    history: (meta.history || []).slice(0, 6),
  });
}
