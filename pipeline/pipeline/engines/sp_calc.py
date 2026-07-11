"""
Rolling-12-month SP (Sales Progression) engine — Elevate.

Recomputes the promotion scorecard from the SP dashboard inputs and classifies each DSE into
promotion / on-track / PIP / termination-risk. Reconciles `overall_was` + gate flags to the
sheet's own columns.

CADENCE: everything here is ROLLING 12-MONTH. This module must NOT import, reference, or
reconcile against the incentive engine — a different window for a different purpose.
"""
from __future__ import annotations

import math
from typing import Any, Optional


def _missing(x: Any) -> bool:
    return x is None or (isinstance(x, float) and math.isnan(x))


def _num(x: Any, default: float = 0.0) -> float:
    if _missing(x):
        return default
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def _num_or_none(x: Any) -> Optional[float]:
    if _missing(x):
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _ratio(ach: Any, target: Any) -> float:
    t = _num(target)
    return (_num(ach) / t) if t else 0.0


def _str(x: Any) -> str:
    return "" if _missing(x) else str(x).strip()


def _ladder(grade: Optional[str], ladder: list) -> dict:
    try:
        i = ladder.index(grade)
    except (ValueError, TypeError):
        return {"prev": None, "current": grade, "next": None}
    return {
        "prev": ladder[i - 1] if i > 0 else None,
        "current": grade,
        "next": ladder[i + 1] if i < len(ladder) - 1 else None,
    }


def _tier(eligible: bool, inputs: dict) -> str:
    """termination_risk | pip | promotion | on_track — from gates + the sheet's PIP/termination signals."""
    remarks = _str(inputs.get("pip_remarks")).lower()
    reason = _str(inputs.get("reason_for_promotion")).lower()
    term_target = _num(inputs.get("termination_target"))
    pip_target = _num(inputs.get("pip_wfyp_target"))
    # The remarks column is the authoritative PIP signal; "Not Eligible for PIP" vetoes it
    # regardless of any residual value in the PIP-target column.
    not_on_pip = "not eligible" in remarks

    if term_target > 0 or "terminat" in remarks or "terminat" in reason:
        return "termination_risk"
    if not not_on_pip and (pip_target > 0 or "pip" in remarks):
        return "pip"
    if eligible:
        return "promotion"
    return "on_track"


def compute_sp(inputs: dict, config: dict) -> dict:
    """
    inputs (from the SP dashboard frame): {
        wfyp_ytd_target, wfyp_ytd_ach, nop_ytd_target, nop_ytd_ach, persistency_overall,
        grade, zone, vintage, reason_for_promotion, pip_wfyp_target, pip_ach, pip_remarks,
        termination_target
    }
    Returns the contract's `sp` block. Rolling-12-month; never touches the incentive engine.
    """
    sp = config["sp"]
    w = sp["was_weights"]
    g = sp["gates"]
    ladder = config.get("ladder", [])

    ach_cap = sp.get("ach_cap")               # sheet caps EACH component achievement in the WAS term
    was_cap = sp.get("was_cap")               # overall guard (redundant given the per-component cap)
    wfyp_ach = _ratio(inputs.get("wfyp_ytd_ach"), inputs.get("wfyp_ytd_target"))
    nop_ach = _ratio(inputs.get("nop_ytd_ach"), inputs.get("nop_ytd_target"))
    persistency = _num_or_none(inputs.get("persistency_overall"))

    def _cap(v):
        return min(v, ach_cap) if ach_cap is not None else v
    wfyp_was_term, nop_was_term = _cap(wfyp_ach), _cap(nop_ach)
    overall_was = w["wfyp"] * wfyp_was_term + w["nop"] * nop_was_term
    if was_cap is not None:
        overall_was = min(overall_was, was_cap)

    gates = {
        "wfyp_75": wfyp_ach >= g["wfyp_ach_min"],
        "nop_50": nop_ach >= g["nop_ach_min"],
        "was_100": overall_was > g["was_min"],
        "persistency_87": persistency is not None and persistency >= g["persistency_min"],
    }
    eligible = all(gates.values())
    tier = _tier(eligible, inputs)

    # thinnest unmet gate by margin-to-threshold (UI headline helper; separate from binding_constraint)
    margins = {
        "wfyp": wfyp_ach - g["wfyp_ach_min"],
        "nop": nop_ach - g["nop_ach_min"],
        "was": overall_was - g["was_min"],
        "persistency": (persistency if persistency is not None else 0.0) - g["persistency_min"],
    }
    unmet = {k: v for k, v in margins.items() if v < 0}
    # "thinnest" = the unmet gate CLOSEST to clearing (largest, i.e. least-negative, margin)
    thinnest_gate = max(unmet, key=unmet.get) if unmet else None

    return {
        "cadence": "rolling_12m",
        "vintage": inputs.get("vintage"),
        "wfyp": {
            "ytd_target": _num_or_none(inputs.get("wfyp_ytd_target")),
            "ytd_ach": _num_or_none(inputs.get("wfyp_ytd_ach")),
            "ach_pct": wfyp_ach,
            "gate_met": gates["wfyp_75"],
            "was": w["wfyp"] * wfyp_was_term,
        },
        "nop": {
            "ytd_target": _num_or_none(inputs.get("nop_ytd_target")),
            "ytd_ach": _num_or_none(inputs.get("nop_ytd_ach")),
            "ach_pct": nop_ach,
            "gate_met": gates["nop_50"],
            "was": w["nop"] * nop_was_term,
        },
        "overall_was": overall_was,
        "persistency_overall": persistency,
        "gates": gates,
        "eligible": eligible,
        "thinnest_gate": thinnest_gate,
        "binding_constraint": inputs.get("reason_for_promotion") or None,
        "tier": tier,
        "ladder": _ladder(inputs.get("grade"), ladder),
        "pip": {
            "target": _num_or_none(inputs.get("pip_wfyp_target")),
            "ach": _num_or_none(inputs.get("pip_ach")),
            "remarks": inputs.get("pip_remarks") or None,
        },
    }
