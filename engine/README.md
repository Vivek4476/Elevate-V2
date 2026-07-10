# Elevate rules engine

Pure, DOM-free logic for the ABSLI DM incentive payout and the promotion (Sales-Progression)
gates. Decoded from and validated against the real April workbook and `elevate_data.json`.
Standalone — it does not import or modify the existing app.

```
node --test 'engine/*.test.js'      # 46 tests
```

## One call

```js
import { buildDseView } from './engine/view.js';
import { APR26 } from './engine/designs/apr26.js';
import { SP_RULES } from './engine/designs/spRules.js';

const view = buildDseView({
  designs: APR26,          // incentive design (this month)
  spRules: SP_RULES,       // promotion gates
  incentiveInputs,         // this-month DSE inputs (₹)
  spInputs,                // rolling-12-month DSE inputs (%)
  policies,                // optional: this DSE's policy rows (Stage-1 attribution)
  dse,                     // optional: passthrough meta (name, grade…)
});
// -> { dse, earnings, career, bridge, attribution }
```

The UI renders `view` and never sees a slab or a formula.

## Modules

| File | Responsibility |
|------|----------------|
| `transform.js` | Turns the two raw monthly files into per-DSE engine inputs (joins them) |
| `view.js` | Facade — composes everything for one DSE |
| `stage1.js` | Per-policy credit (WFYP / S2S / FT tiers / NOP) + "where the money came from" |
| `incentiveEngine.js` | DSE payout chain → **Final** |
| `optimizer.js` | Marginal what-ifs; 4 levers (NOP, persistency, achievement, ULIP grid), ranked by ROI |
| `statement.js` | `EarningsStatement` domain object; credits + deductions reconstruct Final |
| `spEngine.js` | The four promotion gates on rolling 12-month totals |
| `bridge.js` | Honest per-DSE dual impact (+₹ this month / +% promotion) |
| `designs/apr26.js` | The incentive design **as config** |
| `designs/spRules.js` | Promotion rules as config |

## Design principle

**The monthly incentive design is data, not code** — a new month is a new `designs/<month>.js`,
not a code change. Incentive numbers (this-month, ₹) and Sales-Progression numbers
(rolling 12-month, %) are produced by **separate engines** and never mixed.

The workbook is delivered fully computed and is the source of truth; this engine **reads and
explains** those numbers (validated to reproduce them) and computes the **marginal what-ifs**
the Optimizer and bridge need — it does not replace the payout sheet.

## Two files, joined

Incentive (this-month, ₹) and Sales-Progression (rolling 12-month, %) arrive as **two separate
files** and are joined on the DSE code (incentive "Agent Code" == SP "BO Code"):

```js
import { transformMonth } from './engine/transform.js';
const records = transformMonth({ dseRows, spData, policyRows });   // per-DSE { incentiveInputs, spInputs, policies }
records.forEach(r => render(buildDseView({ designs: APR26, spRules: SP_RULES, ...r })));
```

Not every DSE appears in both files, so `transformMonth` reports join coverage (and can keep
unjoined rows with `{ withUnjoined: true }`) rather than silently dropping them — a real
operational check for the monthly refresh.

## Adding a month

1. Copy `designs/apr26.js` → `designs/<month>.js`; update the slabs/grids/multipliers.
2. Run the suite with that month's fixtures to confirm the config reproduces the sheet.
