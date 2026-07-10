// Elevate API — the backend-phase first step. Runs the tested rules engine SERVER-SIDE and
// returns a single DSE's computed view-model, so the client no longer needs the full roster
// or the engine. Zero external dependencies (node:http). This is where real auth (SSO),
// SMS-OTP (MSG91/Twilio), and a database would attach — see the stubs below.
//
//   node server/api.mjs        # then: curl http://localhost:8090/api/dse/AAA634

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { transformDse } from '../engine/transform.js';
import { buildDseView } from '../engine/view.js';
import { buildEarningsStatement } from '../engine/statement.js';
import { parseIncentiveDseRow } from '../engine/transform.js';
import { APR26 } from '../engine/designs/apr26.js';
import { SP_RULES } from '../engine/designs/spRules.js';

const root = new URL('../', import.meta.url);
const spData = JSON.parse(readFileSync(new URL('elevate_data.json', root)));
const incentive = JSON.parse(readFileSync(new URL('elevate_incentive.json', root)));
const PORT = process.env.PORT || 8090;

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // GET /api/dse/:code -> computed view-model (earnings + career + bridge) for one DSE.
  if (req.method === 'GET' && url.pathname.startsWith('/api/dse/')) {
    // AUTH would go here: verify the caller's session and that :code is theirs.
    const code = decodeURIComponent(url.pathname.slice('/api/dse/'.length)).toUpperCase();
    const row = incentive[code];
    if (!row) return json(res, 404, { error: `No incentive statement for ${code}` });
    try {
      const rec = transformDse(row, spData, null);
      if (rec.joined) {
        return json(res, 200, buildDseView({ designs: APR26, spRules: SP_RULES, ...rec }));
      }
      // In one file but not the other — return earnings only, honestly.
      const { incentiveInputs } = parseIncentiveDseRow(row);
      return json(res, 200, {
        dse: rec.dse, earnings: buildEarningsStatement(APR26, incentiveInputs, rec.dse),
        career: null, bridge: null, note: 'DSE not found in the promotion dataset',
      });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  // POST /api/otp -> stub. Real impl: generate + send via MSG91/Twilio/SNS, store hash+expiry.
  if (req.method === 'POST' && url.pathname === '/api/otp') {
    return json(res, 200, { sent: true, note: 'stub — wire a real SMS provider here' });
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`Elevate API on http://localhost:${PORT}`));
