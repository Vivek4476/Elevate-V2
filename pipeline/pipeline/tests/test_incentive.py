"""Golden + schema tests for the monthly incentive engine."""
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]        # elevate/
sys.path.insert(0, str(ROOT))

from pipeline.engines.incentive_calc import compute_incentive          # noqa: E402
from pipeline.ingest.incentive import load_incentive                   # noqa: E402
from pipeline.schemas.incentive_schema import IncentiveInput           # noqa: E402
from pipeline.plan.loader import resolve_plan                          # noqa: E402
from pipeline.plan.validate import validate_plan                       # noqa: E402

CONFIG = resolve_plan("absli", "2026-04", ROOT)
WORKBOOK = ROOT / "data/Incentive_Sheet_Apr.xlsx"
GOLDEN = json.loads((Path(__file__).parent / "golden/aaa634.json").read_text())


def test_plans_valid():
    months = [p.name[len("plan."):-len(".json")]
              for p in (ROOT / "config/tenants/absli").glob("plan.*.json")]
    assert months, "no plan files found"
    for m in months:
        assert validate_plan(resolve_plan("absli", m, ROOT))["ok"], f"{m} plan invalid"


def _get(d, dotted):
    for k in dotted.split("."):
        d = d[k]
    return d


def test_golden_from_fixture():
    res = compute_incentive(GOLDEN["inputs"], CONFIG)
    for path, exp in GOLDEN["expected"].items():
        got = _get(res, path)
        assert abs(got - exp) <= 0.01, f"{path}: got {got}, expected {exp}"


@pytest.mark.skipif(not WORKBOOK.exists(), reason="incentive workbook not present (data is git-ignored)")
def test_golden_from_workbook():
    df = load_incentive(WORKBOOK)
    row = df[df["agent_code"] == "AAA634"].iloc[0].to_dict()
    res = compute_incentive(row, CONFIG)
    assert abs(res["final"] - 5356.336356) <= 0.01


@pytest.mark.skipif(not WORKBOOK.exists(), reason="incentive workbook not present (data is git-ignored)")
def test_schema_valid():
    df = load_incentive(WORKBOOK)
    IncentiveInput.validate(df, lazy=True)   # raises SchemaErrors if invalid
