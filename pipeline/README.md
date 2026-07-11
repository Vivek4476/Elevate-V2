# Elevate — Pipeline (Phases 0 & 1)

The correctness core of Elevate: ingest the monthly Incentive and rolling-12-month SP
workbooks, validate them, and recompute the **monthly** incentive from raw inputs — proven
correct by reconciling against the source sheet's own `Final Amount` for **every DSE**.

Built to the plan in `Elevate-Build-Plan-v2.md`. This covers Phase 0 (scaffold, ingestion,
schemas, templates) and Phase 1 (incentive engine + golden + reconcile). SP engine (Phase 2),
contract builder (Phase 3), admin console (Phase 4), and the frontend/motion (Phase 5+) are
scaffolded for but not yet built.

## Results (against the real April workbooks)

```
$ python cli.py check
── Golden · AAA634 (fixture) ──          ✓ all 12 line items to the paisa
── Golden · AAA634 (from workbook) ──    ✓ final ₹5,356.34
── Schema · IncentiveInput ──            ✓ 891 rows, 0 failing cells
── Reconcile · engine vs sheet ──        ✓ 891/891 DSEs reconcile (±₹1)
ALL CHECKS GREEN ✓
```

`AAA634 / Lakshya Hingorani / SPMG`: target ₹3,00,000 (monthly) · WFYP ₹5.56 L → 185.4% ach →
non-ULIP 4% (₹252) + ULIP 1.5% (₹8,250) → base ₹8,502 → ×1.20 persistency → ×0.70 NOP → −25%
PIFA hold → **₹5,356.34**.

## Layout

```
config/tenants/absli/
  plan.2026-04.json                      April plan (from your April deck) — the base plan
                                         future months add plan.<YYYY-MM>.json that inherit + override
pipeline/
  plan/loader.py                         resolve a month's plan (with inheritance) + diff two months
  plan/validate.py                       structural validation of a resolved plan
  ingest/{incentive,sp}.py               raw workbooks → canonical frames (openpyxl / pyxlsb)
  schemas/{incentive,sp}_schema.py       pandera DataFrameModels + a validate() helper
  engines/incentive_calc.py              the monthly incentive engine (pure, config-driven)
  engines/addons.py                      BDA/lapsed hook — no-op until the source sheet arrives
  templates/build_templates.py           mirror the REAL sheets → import-format reference templates
  tests/{test_incentive,test_reconcile}.py + golden/aaa634.json
cli.py                                   plan · ingest · validate · calc · templates · check
data/                                    your monthly workbooks + generated templates in out/
```

## Run

```bash
pip install -r requirements.txt
python cli.py plan validate --month 2026-04   # structural check of a month's resolved plan
python cli.py ingest              # shapes + coverage (both / incentive-only / sp-only)
python cli.py validate            # pandera validation report for both sheets
python cli.py calc --dse AAA634   # full monthly incentive breakdown for a DSE
python cli.py templates           # write data/out/{Incentive,SP}_Import_Template.xlsx
python cli.py check               # plan-validate + golden + schema + reconcile (non-zero on failure)
pytest pipeline/tests -q          # the test suite
# once a second real month exists:  python cli.py plan diff --from 2026-04 --to 2026-05
```

## Monthly plan configuration (the incentive design changes every month)

The only plan shipped here is the **real April plan** (`plan.2026-04.json`), transcribed from
your April deck. But the plan is treated as a per-month artifact, not a constant: each month is
its own file `config/tenants/<tenant>/plan.<YYYY-MM>.json` that can `inherit` a prior month and
override **only the components that changed**.

For example, a future month whose only change was the NOP bands would be *just*:

```json
{ "inherits": "2026-04", "month": "2026-06",
  "incentive": { "nop_bands": [ ...only the new bands... ] } }
```

Everything else (WFYP grid, ULIP slabs, persistency, PIFA, SP gates, ladder) carries over from
the inherited month automatically. `resolve_plan(tenant, month)` walks the chain and
deep-merges; `plan diff` prints exactly which components moved.

Two guardrails make a *dynamic* plan safe:

1. **Structural validation** (`plan/validate.py`) — bands sorted and starting at 0, percentages
   stored as fractions (0.40 not 40), required components present. Runs before every calc.
2. **The reconcile gate is the real safety net.** The engine recomputes from inputs using the
   month's plan and must match that month's sheet for every DSE. So a plan whose rules don't
   match its month's data can't be shipped — `check` fails and (in the admin console) publish is
   blocked. The incentive team's sheet stays the source of truth for the month's rules; the plan
   file just has to reproduce it, and reconciliation proves it does.

So the monthly workflow is: author (or edit) that month's plan → drop that month's sheets →
`python cli.py check --month <YYYY-MM>` → green means the plan correctly captures the month's
rules. Data workbooks are month-specific too (dropped per month via the admin console, Phase 4);
`data/` here holds the April pair, so `--month 2026-04` reconciles green.

## Design invariants (already enforced in code)

- **Monthly is monthly.** `target_monthly` is a monthly target; the engine never annualises.
  PIFA is the only YTD element and is passed in as a boolean.
- **Incentive and SP stay separate.** Two ingesters, two schemas, two frames — no code path
  mixes a monthly incentive figure with a rolling SP figure.
- **Recompute, then reconcile.** The engine ignores the sheet's computed columns and recomputes
  from inputs; the reconcile check proves it matches the sheet's own `Final Amount` for all 891
  DSEs. It faithfully mirrors the sheet's edge cases (e.g. `#N/A` persistency → 100% multiplier,
  the ULIP ≥60% gate, the persistency MAX rule).
- **Rules are config, not code.** Every grid/slab/band/threshold lives in the tenant plan file —
  a second insurer is a new `config/tenants/<x>/` folder, not a fork.
- **Space kept for add-ons.** `addons_pending` is present and null; wiring the BDA/lapsed sheet
  is a drop-in via `engines/addons.py`.

## Notes / next inputs

- **Import templates mirror the real upload format.** `Incentive_Import_Template.xlsx` reproduces
  your actual `DSE` sheet (all 39 headers, same order, sheet named `DSE`) and round-trips through
  ingestion; `SP_Import_Template.xlsx` reproduces the SP dashboard columns. Yellow columns are the
  pipeline INPUTS; "computed" columns are recomputed and used for reconciliation. Sample rows use
  anonymised identifiers. (The real SP upload is `.xlsb`; the template is `.xlsx` as a column-format
  reference — same headers.)
- Negative WFYP/FYP is valid (surrenders, clawbacks, adjustments); schemas allow it.
- The SP engine, contract assembly, and admin console are the next phases.
- Feed in when ready: the BDA/lapsed sheet (`addons_pending`) and ≥3 months of history (forecast).
