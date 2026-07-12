"""Decision layer (Step 10): recommend two-separate-deltas, projection placeholder, real events."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from pipeline.engines.recommend import rank_moves               # noqa: E402
from pipeline.engines.incentive_calc import compute_incentive   # noqa: E402
from pipeline.engines import project, events                    # noqa: E402
from pipeline.plan.loader import resolve_plan                   # noqa: E402

CONFIG = resolve_plan("absli", "2026-04", ROOT)
INC = json.loads((Path(__file__).parent / "golden/aaa634.json").read_text())["inputs"]


def test_recommend_incentive_delta_is_a_real_engine_recompute():
    moves = rank_moves(INC, None, CONFIG)
    assert moves, "expected at least one move"
    base = compute_incentive(INC, CONFIG)["final"]
    # the NOP move's incentive_delta must equal compute_incentive(perturbed) - base, exactly
    nop = int(INC["nop_count"])
    exp = compute_incentive({**INC, "nop_count": nop + 1}, CONFIG)["final"] - base
    got = next(m for m in moves if m["lever"] == "nop")
    assert abs(got["deltaFinal"] - round(exp, 2)) < 0.01


def test_recommend_keeps_the_two_deltas_separate():
    moves = rank_moves(INC, None, CONFIG)
    for m in moves:
        assert "deltaFinal" in m and "spGateDelta" in m
        assert isinstance(m["spGateDelta"], dict) and "gate" in m["spGateDelta"]
        # sp_gate_delta is a rolling-gate descriptor, never a rupee number fused with the incentive delta
        assert "amount" not in m["spGateDelta"] and "rupees" not in m["spGateDelta"]


def test_recommend_ranked_by_expected_value():
    moves = rank_moves(INC, None, CONFIG)
    evs = [m["expectedValue"] for m in moves]
    assert evs == sorted(evs, reverse=True)


def test_projection_is_placeholder_until_history_exists():
    assert project.month_end_incentive([]) ["confidence"] == "placeholder"
    assert project.month_end_incentive([100, 200])["confidence"] == "placeholder"   # <3 months
    assert project.time_to_promotion([])["confidence"] == "placeholder"


def test_events_emit_gate_cleared_vs_prior_publish():
    prior = {"sp": {"gates": {"nop_50": False, "wfyp_75": False, "was_100": False, "persistency_87": True},
                    "eligible": False}, "incentive": {"recoverable": []}}
    current = {"sp": {"gates": {"nop_50": True, "wfyp_75": False, "was_100": False, "persistency_87": True},
                      "eligible": False}, "incentive": {"recoverable": []}}
    ev = events.emit(current, prior)
    assert any(e["kind"] == "gate_cleared" and e["text"] == "NOP gate cleared" and e["tag"] == "new" for e in ev)
