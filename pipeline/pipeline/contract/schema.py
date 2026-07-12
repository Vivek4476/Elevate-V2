"""
The canonical per-DSE contract — the single interface both layers build against.

`incentive` (monthly) and `sp` (rolling-12-month) are separate, cadence-stamped blocks that are
NEVER merged. A missing block is `null`, never fabricated. No field here combines a monthly
incentive figure with a rolling SP figure.
"""
from __future__ import annotations

from typing import Optional

SCHEMA_VERSION = "1.0"


def _r2(x):
    return round(float(x), 2) if x is not None else None


def _recoverable(inc: dict) -> list:
    """Money currently forfeited but recoverable — from the incentive breakdown only."""
    out = []
    nop_drag = inc["post_persistency"] - inc["nop"]["payout"]
    if nop_drag > 0.005:
        out.append({"lever": "nop_multiplier", "amount": _r2(nop_drag)})
    if inc["pifa"]["hold_amount"] > 0.005:
        out.append({"lever": "pifa_hold", "amount": _r2(inc["pifa"]["hold_amount"])})
    return out


def incentive_block(inc: dict, period: str, recommendations=None, published_at: Optional[str] = None) -> dict:
    """Wrap the incentive engine output (already passed through apply_addons) as the contract block."""
    b = dict(inc)
    b["period"] = period
    b["published_at"] = published_at
    b["recoverable"] = _recoverable(inc)
    b["recommendations"] = recommendations or []
    b.setdefault("addons_pending", {"bda_4x4x4": None, "lapsed_collection_2pct": None})
    b.setdefault("forecast", {"month_end": None, "confidence": "placeholder"})
    return b


def sp_block(sp: dict, period: str, updated_at: Optional[str] = None) -> dict:
    b = dict(sp)
    b["period"] = period
    b["updated_at"] = updated_at
    return b


def assemble(top: dict, inc_block: Optional[dict], sp_blk: Optional[dict]) -> dict:
    """Top-level identity + the two independent blocks (either may be null)."""
    return {
        "schema_version": SCHEMA_VERSION,
        **top,
        "incentive": inc_block,   # null when the DSE isn't in the incentive sheet
        "sp": sp_blk,             # null when the DSE isn't in the SP sheet
    }
