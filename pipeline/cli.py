#!/usr/bin/env python3
"""Elevate pipeline CLI — Phases 0-1.

Plan is resolved per month (with inheritance) and validated before use.

    python cli.py plan show      --month 2026-05      # resolved plan (+ lineage)
    python cli.py plan validate  --month 2026-05      # structural validation
    python cli.py plan diff --from 2026-04 --to 2026-05
    python cli.py ingest         [--month 2026-04]
    python cli.py validate       [--month 2026-04]
    python cli.py calc --dse AAA634 [--month 2026-04]
    python cli.py templates      [--month 2026-04]
    python cli.py check          [--month 2026-04]    # plan-validate + golden + schema + reconcile
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from pipeline.ingest.incentive import load_incentive           # noqa: E402
from pipeline.ingest.sp import load_sp                          # noqa: E402
from pipeline.engines.incentive_calc import compute_incentive  # noqa: E402
from pipeline.engines.addons import apply_addons               # noqa: E402
from pipeline.schemas.incentive_schema import IncentiveInput   # noqa: E402
from pipeline.schemas.sp_schema import SPInput, validate       # noqa: E402
from pipeline.templates.build_templates import build_all       # noqa: E402
from pipeline.plan.loader import resolve_plan, diff_plans      # noqa: E402
from pipeline.plan.validate import validate_plan               # noqa: E402

INC_WB = ROOT / "data/Incentive_Sheet_Apr.xlsx"   # month-specific in production (dropped via admin console)
SP_WB = ROOT / "data/Final_SP_Summary_Apr_26_Field.xlsb"
OUT = ROOT / "data/out"
GOLDEN = json.loads((ROOT / "pipeline/tests/golden/aaa634.json").read_text())


def _rupee(x) -> str:
    return f"₹{x:,.2f}"


def _plan(args) -> dict:
    """Resolve + validate the plan for the requested tenant/month; abort on an invalid plan."""
    plan = resolve_plan(args.tenant, args.month, ROOT)
    rep = validate_plan(plan)
    for w in rep["warnings"]:
        print(f"  ⚠ plan warning: {w}")
    if not rep["ok"]:
        print(f"✗ plan {args.tenant}/{args.month} is invalid:")
        for e in rep["errors"]:
            print(f"    - {e}")
        sys.exit(2)
    return plan


# ── plan commands ──────────────────────────────────────────────────────
def cmd_plan_show(args):
    plan = resolve_plan(args.tenant, args.month, ROOT)
    lineage = plan.get("_lineage", [])
    tag = f"  (inherits: {' → '.join(lineage)} → {args.month})" if lineage else "  (base plan)"
    print(f"# {args.tenant} / {args.month}{tag}")
    print(json.dumps({k: v for k, v in plan.items() if not k.startswith("_")}, indent=2, ensure_ascii=False))


def cmd_plan_validate(args):
    rep = validate_plan(resolve_plan(args.tenant, args.month, ROOT))
    print(f"{args.tenant}/{args.month}: {'VALID ✓' if rep['ok'] else 'INVALID ✗'}")
    for w in rep["warnings"]:
        print(f"  ⚠ {w}")
    for e in rep["errors"]:
        print(f"  - {e}")
    sys.exit(0 if rep["ok"] else 1)


def cmd_plan_diff(args):
    a = resolve_plan(args.tenant, getattr(args, "from"), ROOT)
    b = resolve_plan(args.tenant, args.to, ROOT)
    changes = diff_plans(a, b)
    print(f"Plan diff  {getattr(args, 'from')} → {args.to}  ({len(changes)} component(s) changed)")
    for path, old, new in changes:
        print(f"\n  {path}:")
        print(f"     was: {json.dumps(old, ensure_ascii=False)}")
        print(f"     now: {json.dumps(new, ensure_ascii=False)}")
    if b.get("_change_note"):
        print(f"\n  note: {b['_change_note']}")


# ── pipeline commands ──────────────────────────────────────────────────
def cmd_ingest(args):
    inc, sp = load_incentive(INC_WB), load_sp(SP_WB)
    inc_ids, sp_ids = set(inc["employee_code"].dropna()), set(sp["dse_id"].dropna())
    print(f"Incentive: {inc.shape[0]} DSEs × {inc.shape[1]} cols")
    print(f"SP:        {sp.shape[0]} DSEs × {sp.shape[1]} cols")
    print("Coverage:", json.dumps({"both": len(inc_ids & sp_ids),
                                    "incentive_only": len(inc_ids - sp_ids),
                                    "sp_only": len(sp_ids - inc_ids)}, indent=2))


def cmd_validate(args):
    inc, sp = load_incentive(INC_WB), load_sp(SP_WB)
    for label, df, model in [("Incentive", inc, IncentiveInput), ("SP", sp, SPInput)]:
        rep = validate(df, model)
        status = "PASS" if rep["ok"] else f"FAIL ({rep['n_errors']} cells)"
        print(f"{label:<10} {status:<22} rows={rep['n_rows']}")
        for e in rep["errors"]:
            print(f"    - {e}")


def cmd_calc(args):
    plan = _plan(args)
    df = load_incentive(INC_WB)
    m = df[df["agent_code"] == args.dse]
    if m.empty:
        print(f"DSE {args.dse} not found."); return
    row = m.iloc[0].to_dict()
    r = apply_addons(compute_incentive(row, plan))
    u, p, n = r["ulip"], r["persistency"], r["nop"]
    print(f"{args.dse} — {row.get('name')} ({row.get('grade')})  ·  {args.month} monthly incentive")
    print(f"  target (monthly)   {_rupee(r['target_monthly'])}")
    print(f"  WFYP total         {_rupee(r['wfyp']['total'])}   ach {r['wfyp']['ach_pct']*100:.2f}%")
    print(f"  non-ULIP {r['non_ulip']['grid_pct']*100:g}%    → {_rupee(r['non_ulip']['payout'])}")
    print(f"  ULIP {u['slab_pct']*100:g}% (gate {'met' if u['gate_60pct_met'] else 'no'}) → {_rupee(u['payout'])}")
    print(f"  base               {_rupee(r['base_payout'])}")
    print(f"  × persistency {p['multiplier']*100:g}% → {_rupee(r['post_persistency'])}")
    print(f"  × NOP {n['multiplier']*100:g}% ({n['count']} pol) → {_rupee(n['payout'])}")
    print(f"  − PIFA hold        {_rupee(r['pifa']['hold_amount'])}")
    print(f"  FINAL              {_rupee(r['final'])}")
    print(f"  add-ons pending    {r['addons_pending']}")


def cmd_templates(args):
    for p in build_all(_plan(args), OUT, INC_WB, SP_WB):
        print("wrote", p)


def cmd_check(args):
    plan = _plan(args)
    ok = True

    def _get(d, dotted):
        for k in dotted.split("."):
            d = d[k]
        return d

    tag = f"  (inherits {' → '.join(plan['_lineage'])})" if plan.get("_lineage") else "  (base)"
    print(f"── Plan · {args.tenant}/{args.month} ──\n  ✓ valid{tag}")

    res = compute_incentive(GOLDEN["inputs"], plan)
    print("\n── Golden · AAA634 (fixture) ──")
    for path, exp in GOLDEN["expected"].items():
        good = abs(_get(res, path) - exp) <= 0.01
        ok &= good
        print(f"  {'✓' if good else '✗'} {path:<24} {_get(res, path):,.4f}  exp {exp:,.4f}")

    inc = load_incentive(INC_WB)
    row = inc[inc["agent_code"] == "AAA634"].iloc[0].to_dict()
    live = compute_incentive(row, plan)["final"]
    good = abs(live - 5356.336356) <= 0.01
    ok &= good
    print(f"\n── Golden · AAA634 (from workbook) ──\n  {'✓' if good else '✗'} final {_rupee(live)} (exp ₹5,356.34)")

    rep = validate(inc, IncentiveInput)
    ok &= rep["ok"]
    print(f"\n── Schema · IncentiveInput ──\n  {'✓' if rep['ok'] else '✗'} {rep['n_rows']} rows, {rep['n_errors']} failing cells")

    mismatches, checked = [], 0
    for _, r in inc.iterrows():
        d = r.to_dict()
        s = d.get("sheet_final_amount")
        if s is None or (isinstance(s, float) and pd.isna(s)):
            continue
        checked += 1
        got = compute_incentive(d, plan)["final"]
        if abs(got - float(s)) > 1.0:
            mismatches.append((d.get("agent_code"), round(got, 2), round(float(s), 2)))
    good = not mismatches
    ok &= good
    print(f"\n── Reconcile · engine vs sheet Final Amount (±₹1) ──\n  {'✓' if good else '✗'} {checked - len(mismatches)}/{checked} DSEs reconcile")
    for mm in mismatches[:10]:
        print(f"      mismatch {mm[0]}: engine {mm[1]} vs sheet {mm[2]}")

    print("\n" + ("ALL CHECKS GREEN ✓" if ok else "CHECKS FAILED ✗ — a plan that doesn't match the data month will fail here (by design)"))
    sys.exit(0 if ok else 1)


def _add_ctx(p):
    p.add_argument("--tenant", default="absli")
    p.add_argument("--month", default="2026-04")
    return p


def main():
    ap = argparse.ArgumentParser(prog="elevate")
    sub = ap.add_subparsers(dest="cmd", required=True)

    pl = sub.add_parser("plan").add_subparsers(dest="plan_cmd", required=True)
    _add_ctx(pl.add_parser("show")).set_defaults(func=cmd_plan_show)
    _add_ctx(pl.add_parser("validate")).set_defaults(func=cmd_plan_validate)
    pdf = pl.add_parser("diff")
    pdf.add_argument("--tenant", default="absli")
    pdf.add_argument("--from", required=True)
    pdf.add_argument("--to", required=True)
    pdf.set_defaults(func=cmd_plan_diff)

    _add_ctx(sub.add_parser("ingest")).set_defaults(func=cmd_ingest)
    _add_ctx(sub.add_parser("validate")).set_defaults(func=cmd_validate)
    c = _add_ctx(sub.add_parser("calc")); c.add_argument("--dse", default="AAA634"); c.set_defaults(func=cmd_calc)
    _add_ctx(sub.add_parser("templates")).set_defaults(func=cmd_templates)
    _add_ctx(sub.add_parser("check")).set_defaults(func=cmd_check)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
