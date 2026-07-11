"""
Add-on hook — Elevate.

The 4x4x4 BDA (₹4k for 40 meetings + 4 NOP, +₹400/additional NOP) and the 2% lapsed-policy
collection payout come from a SEPARATE sheet that isn't wired in yet. This is the pluggable
seam: when `addon_inputs` is None, the incentive result passes through unchanged, with the
`addons_pending` fields left null so the contract keeps a space for them.
"""
from __future__ import annotations

from typing import Optional


def apply_addons(result: dict, addon_inputs: Optional[dict] = None) -> dict:
    result.setdefault("addons_pending", {"bda_4x4x4": None, "lapsed_collection_2pct": None})
    if addon_inputs is None:
        return result
    # Future: compute BDA + lapsed and add to `final`. Intentionally not implemented yet.
    raise NotImplementedError(
        "addon_inputs supplied, but BDA/lapsed logic is not implemented — awaiting the source sheet."
    )
