"""
Validate a resolved plan.

A dynamically-authored monthly plan is a new place for mistakes (an unsorted grid, a percentage
entered as 40 instead of 0.40, a missing band). This catches the structural ones before the
reconcile gate catches the numeric ones.
"""
from __future__ import annotations


def _check_bands(name: str, bands, key: str, errors: list, warnings: list, *, needs_zero: bool = True):
    if not isinstance(bands, list) or not bands:
        errors.append(f"{name}: must be a non-empty list")
        return
    froms = [b.get("from") for b in bands]
    if any(f is None for f in froms):
        errors.append(f"{name}: every band needs a 'from'")
        return
    if needs_zero and froms[0] != 0:
        errors.append(f"{name}: first band 'from' should be 0 (got {froms[0]})")
    if froms != sorted(froms):
        errors.append(f"{name}: bands must be sorted ascending by 'from'")
    for b in bands:
        v = b.get(key)
        if v == "equal_cm":
            continue
        if not isinstance(v, (int, float)):
            errors.append(f"{name}: '{key}'={v!r} must be a number")
        elif v < 0:
            errors.append(f"{name}: '{key}'={v} must be ≥ 0")
        elif v > 5:
            warnings.append(f"{name}: '{key}'={v} looks large — percentages are stored as fractions (0.40 = 40%)")


def validate_plan(plan: dict) -> dict:
    errors: list[str] = []
    warnings: list[str] = []

    ic = plan.get("incentive")
    if not isinstance(ic, dict):
        errors.append("missing 'incentive' section")
        ic = {}

    _check_bands("incentive.wfyp_grid", ic.get("wfyp_grid"), "pct", errors, warnings)
    _check_bands("incentive.ulip_slabs", ic.get("ulip_slabs"), "pct", errors, warnings)
    _check_bands("incentive.nop_bands", ic.get("nop_bands"), "mult", errors, warnings)

    pers = ic.get("persistency", {})
    _check_bands("incentive.persistency.level_bands", pers.get("level_bands"), "mult", errors, warnings)
    imp = pers.get("improvement", {})
    for k in ("min_level", "min_growth", "mult"):
        if k not in imp:
            errors.append(f"incentive.persistency.improvement missing '{k}'")

    for k, lo, hi in [("pifa_hold_pct", 0.0, 1.0), ("ulip_gate_min_ach", 0.0, 1.0)]:
        v = ic.get(k)
        if not isinstance(v, (int, float)) or not (lo <= v <= hi):
            errors.append(f"incentive.{k}={v!r} must be within [{lo}, {hi}]")

    sp = plan.get("sp", {})
    ww = sp.get("was_weights", {})
    s = ww.get("wfyp", 0) + ww.get("nop", 0)
    if abs(s - 1.0) > 1e-6:
        warnings.append(f"sp.was_weights sum to {s} (expected 1.0)")
    for k in ("wfyp_ach_min", "nop_ach_min", "was_min", "persistency_min"):
        if k not in sp.get("gates", {}):
            errors.append(f"sp.gates missing '{k}'")

    return {"ok": not errors, "errors": errors, "warnings": warnings}
