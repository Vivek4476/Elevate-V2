"""Reconciliation: every DSE's engine `final` must match the sheet's 'Final Amount' (±₹1)."""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from pipeline.engines.incentive_calc import compute_incentive          # noqa: E402
from pipeline.ingest.incentive import load_incentive                   # noqa: E402
from pipeline.plan.loader import resolve_plan                          # noqa: E402

CONFIG = resolve_plan("absli", "2026-04", ROOT)
WORKBOOK = ROOT / "data/Incentive_Sheet_Apr.xlsx"
TOLERANCE = 1.0


def reconcile(df) -> list[tuple]:
    mismatches = []
    for _, r in df.iterrows():
        row = r.to_dict()
        sheet = row.get("sheet_final_amount")
        if sheet is None or (isinstance(sheet, float) and pd.isna(sheet)):
            continue
        got = compute_incentive(row, CONFIG)["final"]
        if abs(got - float(sheet)) > TOLERANCE:
            mismatches.append((row.get("agent_code"), round(got, 2), round(float(sheet), 2)))
    return mismatches


def test_reconcile_all():
    df = load_incentive(WORKBOOK)
    mismatches = reconcile(df)
    assert not mismatches, f"{len(mismatches)} mismatches (first 10): {mismatches[:10]}"
