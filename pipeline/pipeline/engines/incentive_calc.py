"""
Monthly incentive engine — Elevate.

Pure, config-driven. Recomputes the full monthly incentive from raw per-DSE inputs.
Mirrors the ABSLI 'DSE' sheet formulas exactly (including its IFERROR edge-cases) so the
output reconciles to the sheet's own 'Final Amount' column.

CADENCE: everything here is MONTHLY. `target_monthly` is a monthly target. The only YTD
element is PIFA (passed in as the boolean `pifa_ytd_met`).
"""
from __future__ import annotations

import math
from typing import Any, Optional


def _missing(x: Any) -> bool:
    return x is None or (isinstance(x, float) and math.isnan(x))


def _num(x: Any, default: float = 0.0) -> float:
    """Coerce to float, treating missing/blank/non-numeric as `default`."""
    if _missing(x):
        return default
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def _num_or_none(x: Any) -> Optional[float]:
    """Coerce to float; missing/non-numeric (e.g. '#N/A') → None (mirrors the sheet's IFERROR)."""
    if _missing(x):
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _step(value: float, bands: list[dict]) -> Any:
    """
    Bands are sorted ascending by 'from'. Return the 'pct' (or 'mult') of the highest
    band whose 'from' <= value. Equivalent to the sheet's nested IF ladders.
    """
    key = "pct" if "pct" in bands[0] else "mult"
    result = bands[0][key]
    for b in bands:
        if value >= b["from"]:
            result = b[key]
        else:
            break
    return result


def wfyp_grid_pct(ach_pct: Optional[float], config: dict) -> float:
    """Non-ULIP WFYP grid % from Overall WFYP achievement %. (< 60% ⇒ 0.)"""
    if _missing(ach_pct):
        return 0.0
    return float(_step(ach_pct, config["incentive"]["wfyp_grid"]))


def ulip_slab_pct(ulip_fyp: Optional[float], config: dict) -> float:
    """ULIP grid % from the absolute ULIP FYP (₹) slab."""
    v = _num(ulip_fyp)
    if v <= 0:
        return 0.0
    return float(_step(v, config["incentive"]["ulip_slabs"]))


def persistency_multiplier(cm: Optional[float], lm: Optional[float], config: dict) -> float:
    """
    MAX(level band, +2%-improvement rule).
      - level band: <60%→0.50, 60-86%→CM itself ("=13M persistency"),
                    86-89%→1.00, 89-92%→1.10, ≥92%→1.20
      - improvement: CM≥80% AND (CM-LM)≥2%  →  1.00
      - CM missing → level defaults to `missing_default_mult` (sheet IFERROR default).
    """
    pcfg = config["incentive"]["persistency"]
    if _missing(cm):
        return float(pcfg.get("missing_default_mult", 1.00))

    level: Any = pcfg["level_bands"][0]["mult"]
    for b in pcfg["level_bands"]:
        if cm >= b["from"]:
            level = b["mult"]
        else:
            break
    if level == "equal_cm":
        level = cm  # multiplier equals the persistency value in the 60-86% band

    growth = 0.0 if _missing(lm) else (cm - lm)
    imp = pcfg["improvement"]
    improvement = imp["mult"] if (cm >= imp["min_level"] and growth >= imp["min_growth"]) else 0.0
    return float(max(level, improvement))


def nop_multiplier(nop_count: Optional[float], config: dict) -> float:
    """NOP multiplier band: 0-1→0.70, 2-3→0.90, 4-7→1.00, ≥8→1.20."""
    return float(_step(_num(nop_count), config["incentive"]["nop_bands"]))


def compute_incentive(inputs: dict, config: dict) -> dict:
    """
    inputs: {
        target_monthly, wfyp_others, wfyp_ulip_gap, ulip_fyp,
        persistency_cm, persistency_lm, nop_count, pifa_ytd_met (bool)
    }
    Returns the full breakdown, matching the contract's `incentive` block.
    """
    ic = config["incentive"]

    target = _num_or_none(inputs.get("target_monthly"))
    others = _num(inputs.get("wfyp_others"))
    ulip_wfyp = _num(inputs.get("wfyp_ulip_gap"))
    ulip_fyp = _num(inputs.get("ulip_fyp"))
    cm = _num_or_none(inputs.get("persistency_cm"))
    lm = _num_or_none(inputs.get("persistency_lm"))
    nop_count = _num(inputs.get("nop_count"))
    pifa_met = inputs.get("pifa_ytd_met")  # True/False/None

    # Overall WFYP achievement % — sheet uses IFERROR((H+I)/G, 0)
    if target is None or target == 0.0:
        ach = 0.0
    else:
        ach = (others + ulip_wfyp) / target

    grid = wfyp_grid_pct(ach, config)          # applies to NON-ULIP WFYP only
    non_ulip_pay = others * grid

    slab = ulip_slab_pct(ulip_fyp, config)
    gate_met = ach >= ic["ulip_gate_min_ach"]
    ulip_pay = ulip_fyp * slab if gate_met else 0.0   # hard 60% gate

    base = non_ulip_pay + ulip_pay

    pers_mult = persistency_multiplier(cm, lm, config)
    post_pers = base * pers_mult
    booster = post_pers - base

    nop_mult = nop_multiplier(nop_count, config)
    post_nop = post_pers * nop_mult

    hold = post_nop * ic["pifa_hold_pct"] if (pifa_met is False) else 0.0
    final = post_nop - hold

    growth = None if (_missing(cm) or _missing(lm)) else (float(cm) - float(lm))

    return {
        "cadence": "monthly",
        "target_monthly": None if _missing(target) else float(target),
        "wfyp": {
            "non_ulip": others,
            "ulip_gap": ulip_wfyp,
            "total": others + ulip_wfyp,
            "ach_pct": ach,
        },
        "non_ulip": {"grid_pct": grid, "payout": non_ulip_pay},
        "ulip": {"fyp": ulip_fyp, "slab_pct": slab, "gate_60pct_met": gate_met, "payout": ulip_pay},
        "base_payout": base,
        "persistency": {
            "cm": None if _missing(cm) else float(cm),
            "lm": None if _missing(lm) else float(lm),
            "growth": growth,
            "multiplier": pers_mult,
            "booster": booster,
        },
        "post_persistency": post_pers,
        "nop": {"count": int(nop_count), "multiplier": nop_mult, "payout": post_nop},
        "pifa": {
            "cadence": "ytd",
            "met": pifa_met,
            "hold_pct": ic["pifa_hold_pct"] if (pifa_met is False) else 0.0,
            "hold_amount": hold,
        },
        "final": final,
        "secured": final,
    }
