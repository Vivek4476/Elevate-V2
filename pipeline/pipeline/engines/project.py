"""
Projection interface (migration Step 10 / Phase 6) — a STABLE interface that returns an explicit
placeholder until enough history exists, then upgrades internally (run-rate → ML) with no caller change.

You only have one real month (April), so everything is `confidence: "placeholder"` today.
"""
from __future__ import annotations

MIN_MONTHS = 3


def _placeholder(reason):
    return {"value": None, "confidence": "placeholder", "reason": reason}


def month_end_incentive(history: list | None = None) -> dict:
    """Projected month-end incentive. Placeholder until ≥3 months of history."""
    history = history or []
    if len(history) < MIN_MONTHS:
        return _placeholder(f"needs ≥{MIN_MONTHS} months of history (have {len(history)})")
    # future: run-rate = sum(history[-3:]) / 3 * days_ratio, then ML
    return {"value": round(sum(history[-MIN_MONTHS:]) / MIN_MONTHS, 2), "confidence": "run_rate"}


def time_to_promotion(sp_history: list | None = None) -> dict:
    """Projected months to eligibility. Placeholder until ≥3 months of rolling snapshots."""
    sp_history = sp_history or []
    if len(sp_history) < MIN_MONTHS:
        return _placeholder(f"needs ≥{MIN_MONTHS} rolling snapshots (have {len(sp_history)})")
    return {"value": None, "confidence": "trend"}
