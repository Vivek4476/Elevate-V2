"""SP engine: golden + full-sheet WAS/gate reconcile + incentive↔SP field disjointness."""
import json
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[2]        # elevate/
sys.path.insert(0, str(ROOT))

from pipeline.engines.sp_calc import compute_sp                    # noqa: E402
from pipeline.engines.incentive_calc import compute_incentive      # noqa: E402
from pipeline.ingest.sp import load_sp                             # noqa: E402
from pipeline.plan.loader import resolve_plan                      # noqa: E402

CONFIG = resolve_plan("absli", "2026-04", ROOT)
GOLDEN = json.loads((Path(__file__).parent / "golden/aaa634_sp.json").read_text())
INC_GOLDEN = json.loads((Path(__file__).parent / "golden/aaa634.json").read_text())
SP_WB = ROOT / "data/Final_SP_Summary_Apr_26_Field.xlsb"


def _get(d, dotted):
    for k in dotted.split("."):
        d = d[k]
    return d


def _yn(v):
    s = "" if v is None else str(v).strip().lower()
    return True if s in {"yes", "y", "true", "1"} else False if s in {"no", "n", "false", "0"} else None


def test_sp_golden_aaa634():
    r = compute_sp(GOLDEN["inputs"], CONFIG)
    for path, exp in GOLDEN["expected"].items():
        val = _get(r, path)
        if isinstance(exp, (bool, str)):
            assert val == exp, f"{path}: {val!r} != {exp!r}"
        else:
            assert abs(float(val) - float(exp)) <= 0.001, f"{path}: {val} != {exp}"


def test_sp_tier_not_eligible_on_track():
    r = compute_sp(GOLDEN["inputs"], CONFIG)
    assert r["eligible"] is False and r["tier"] == "on_track"


def test_incentive_sp_fields_disjoint():
    inc = compute_incentive(INC_GOLDEN["inputs"], CONFIG)
    sp = compute_sp(GOLDEN["inputs"], CONFIG)
    sp_only = {"overall_was", "gates", "eligible", "tier", "binding_constraint", "ladder", "thinnest_gate"}
    assert set(inc).isdisjoint(sp_only), "incentive and SP blocks must not share fields"


@pytest.mark.skipif(not SP_WB.exists(), reason="SP workbook not present (data is git-ignored)")
def test_sp_reconcile_all():
    sp = load_sp(SP_WB)
    mm = []
    for _, r in sp.iterrows():
        d = r.to_dict()
        sw = d.get("sheet_overall_was")
        if sw is None or (isinstance(sw, float) and pd.isna(sw)):
            continue
        res = compute_sp(d, CONFIG)
        was_ok = abs(res["overall_was"] - float(sw)) <= 0.001
        wg, ng = _yn(d.get("sheet_wfyp_gate")), _yn(d.get("sheet_nop_gate"))
        gate_ok = (wg is None or wg == res["gates"]["wfyp_75"]) and (ng is None or ng == res["gates"]["nop_50"])
        if not (was_ok and gate_ok):
            mm.append((d.get("dse_bo_code"), round(res["overall_was"], 4), round(float(sw), 4)))
    assert not mm, f"{len(mm)} SP mismatches (first 10): {mm[:10]}"
