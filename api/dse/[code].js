// GET /api/dse/:code  ->  { dse, earnings, career, bridge } computed server-side.
// Vercel Serverless Function (Node.js). Auth (SSO) attaches at the top — deferred for now.

import { getData, dataSource } from '../_lib/data.js';
import { transformDse, parseIncentiveDseRow } from '../../engine/transform.js';
import { buildDseView } from '../../engine/view.js';
import { buildEarningsStatement } from '../../engine/statement.js';
import { APR26 } from '../../engine/designs/apr26.js';
import { SP_RULES } from '../../engine/designs/spRules.js';

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
    if (rec.joined) {
      return res.status(200).json(buildDseView({ designs: APR26, spRules: SP_RULES, ...rec }));
    }
    const { incentiveInputs } = parseIncentiveDseRow(row);
    return res.status(200).json({
      dse: rec.dse, earnings: buildEarningsStatement(APR26, incentiveInputs, rec.dse),
      career: null, bridge: null, note: 'DSE not in the promotion dataset',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
