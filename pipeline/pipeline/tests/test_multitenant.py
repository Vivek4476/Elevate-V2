"""Multi-tenant (Step 11 / Phase 7): a second insurer reprices from config alone — no code change.

The same engine + the same DSE inputs, run under two tenant plans, must produce different results;
and tenant-A (absli) must keep reconciling. Enterprise unlock = config, not a fork.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from pipeline.engines.incentive_calc import compute_incentive   # noqa: E402
from pipeline.engines.sp_calc import compute_sp                # noqa: E402
from pipeline.plan.loader import resolve_plan                   # noqa: E402
from pipeline.plan.validate import validate_plan               # noqa: E402

INC = json.loads((Path(__file__).parent / "golden/aaa634.json").read_text())["inputs"]
SP = json.loads((Path(__file__).parent / "golden/aaa634_sp.json").read_text())["inputs"]


def test_tenantB_plan_is_valid():
    assert validate_plan(resolve_plan("tenantB", "2026-04", ROOT))["ok"]


def test_second_tenant_reprices_with_no_code_change():
    a = resolve_plan("absli", "2026-04", ROOT)
    b = resolve_plan("tenantB", "2026-04", ROOT)
    # SAME function, SAME inputs, only the config differs
    inc_a = compute_incentive(INC, a)["final"]
    inc_b = compute_incentive(INC, b)["final"]
    assert abs(inc_a - inc_b) > 1.0, "tenantB's grids must reprice the incentive"

    sp_a = compute_sp(SP, a)["overall_was"]
    sp_b = compute_sp(SP, b)["overall_was"]
    assert abs(sp_a - sp_b) > 0.001, "tenantB's WAS weights must reprice the SP score"


def test_tenantA_golden_unchanged():
    a = resolve_plan("absli", "2026-04", ROOT)
    assert abs(compute_incentive(INC, a)["final"] - 5356.336356) < 0.01   # absli stays green
