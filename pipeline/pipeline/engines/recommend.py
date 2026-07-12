"""
Decision layer — ranked moves (migration Step 10 / Build-Plan-v2 Phase 6).

Each move carries TWO SEPARATE impacts that are NEVER summed:
  - incentive_delta : ₹ this-month, from re-running the incentive engine with a perturbed input.
  - sp_gate_delta   : which ROLLING promotion gate the move touches (a different window, different unit).

Ranked by expected_value = incentive_delta × a heuristic completion probability.
"""
from __future__ import annotations

import math
from typing import Optional

from pipeline.engines.incentive_calc import compute_incentive

_PROB = {"easy": 0.80, "medium": 0.40, "hard": 0.15}


def _num(x, d=0.0):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return d
    try:
        return float(x)
    except (TypeError, ValueError):
        return d


def _next_from(value, bands):
    for b in bands:
        if b["from"] > value:
            return b["from"]
    return None


def rank_moves(inc: dict, sp: Optional[dict], config: dict, top: int = 3) -> list:
    ic = config["incentive"]
    base = compute_incentive(inc, config)["final"]
    moves = []

    # 1 · sell one more policy → lifts the (monthly) NOP multiplier; rolling gate = NOP
    nop = int(_num(inc.get("nop_count")))
    d = compute_incentive({**inc, "nop_count": nop + 1}, config)["final"] - base
    moves.append({"lever": "nop", "effort": "easy", "extraPolicies": 1, "to": nop + 1,
                  "deltaFinal": round(d, 2), "spGateDelta": {"gate": "nop", "note": "lifts rolling NOP achievement"}})

    # 2 · grow ULIP premium to the next slab → rolling gate = WFYP
    ulip = _num(inc.get("ulip_fyp"))
    nt = _next_from(ulip, ic["ulip_slabs"])
    if nt:
        d = compute_incentive({**inc, "ulip_fyp": nt, "wfyp_ulip_gap": _num(inc.get("wfyp_ulip_gap")) + (nt - ulip)}, config)["final"] - base
        moves.append({"lever": "ulipGrid", "effort": "hard", "rupeesNeeded": round(nt - ulip, 2), "to": nt,
                      "deltaFinal": round(d, 2), "spGateDelta": {"gate": "wfyp", "note": "lifts rolling WFYP"}})

    # 3 · reach the next WFYP achievement band → rolling gate = WFYP
    others, ug, tgt = _num(inc.get("wfyp_others")), _num(inc.get("wfyp_ulip_gap")), _num(inc.get("target_monthly"))
    ach = (others + ug) / tgt if tgt else 0.0
    nb = _next_from(ach, ic["wfyp_grid"])
    if nb and tgt:
        need = nb * tgt - (others + ug)
        if need > 0:
            d = compute_incentive({**inc, "wfyp_others": others + need}, config)["final"] - base
            moves.append({"lever": "achievement", "effort": "medium", "rupeesNeeded": round(need, 2), "to": round(nb, 2),
                          "deltaFinal": round(d, 2), "spGateDelta": {"gate": "wfyp", "note": "lifts rolling WFYP"}})

    for m in moves:
        m["expectedValue"] = round(m["deltaFinal"] * _PROB.get(m["effort"], 0.3), 2)
    moves = [m for m in moves if m["deltaFinal"] > 0.005]
    moves.sort(key=lambda m: m["expectedValue"], reverse=True)
    return moves[:top]
